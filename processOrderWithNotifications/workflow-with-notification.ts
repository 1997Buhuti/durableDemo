import { DurableContext } from '@aws/durable-execution-sdk-js';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

export interface Order {
  orderId: string;
  amount: number;
  customerId: string;
  status?: string;
}

/**
 * Enhanced order processing workflow with actual notification
 * Shows how to send the callback ID to an external system
 */
export const orderProcessingWithNotification = async (event: Order, context: DurableContext) => {
  context.logger.info("Starting order processing", { orderId: event.orderId });

  // 1. Validate Inventory (Checkpointable Step)
  await context.step("ValidateInventory", async () => {
    context.logger.info("Validating inventory...");
    if (Math.random() < 0.1) throw new Error("Out of stock");
    return { status: "InventoryValidated" };
  });

  // 2. Process Payment (Checkpointable Step)
  await context.step("ProcessPayment", async () => {
    context.logger.info("Processing payment...");
    return { status: "PaymentProcessed" };
  });

  // 3. Wait for Warehouse Confirmation (Suspends execution)
  context.logger.info("Waiting for warehouse...");
  await context.wait({ seconds: 10 }); 
  context.logger.info("Warehouse confirmed.");

  // 4. Check for High Value & Request Approval
  if (event.amount > 1000) {
    context.logger.info("High value order. Requesting human approval.");
    
    // Create a callback - this returns [promise, callbackId]
    const [approvalPromise, approvalId] = await context.createCallback<{ approved: boolean }>(
      "NotifyApprover",
      { timeout: { hours: 24 } }  // Timeout after 24 hours
    );
    
    context.logger.info("Callback created", { approvalId });
    
    // IMPORTANT: Send the callbackId to an external system
    // This step happens BEFORE awaiting the promise
    await context.step("SendApprovalNotification", async () => {
      // Option 1: Send to SNS (for email/SMS/Slack)
      if (process.env.APPROVAL_SNS_TOPIC_ARN) {
        const sns = new SNSClient({});
        await sns.send(new PublishCommand({
          TopicArn: process.env.APPROVAL_SNS_TOPIC_ARN,
          Subject: `Approval Required: Order ${event.orderId}`,
          Message: JSON.stringify({
            orderId: event.orderId,
            amount: event.amount,
            customerId: event.customerId,
            callbackId: approvalId,
            approvalUrl: `${process.env.APPROVAL_BASE_URL}/approve/${approvalId}`,
            instructions: `To approve: npx ts-node approve.ts ${approvalId}`,
          }, null, 2),
        }));
        context.logger.info("Approval notification sent via SNS");
      }
      
      // Option 2: Store in DynamoDB for a web UI to pick up
      // const dynamo = new DynamoDBClient({});
      // await dynamo.send(new PutItemCommand({
      //   TableName: process.env.APPROVALS_TABLE,
      //   Item: {
      //     callbackId: { S: approvalId },
      //     orderId: { S: event.orderId },
      //     amount: { N: event.amount.toString() },
      //     status: { S: 'PENDING' },
      //     createdAt: { S: new Date().toISOString() },
      //   },
      // }));
      
      // Option 3: Send to SQS for async processing
      // const sqs = new SQSClient({});
      // await sqs.send(new SendMessageCommand({
      //   QueueUrl: process.env.APPROVAL_QUEUE_URL,
      //   MessageBody: JSON.stringify({ callbackId: approvalId, orderId: event.orderId }),
      // }));
      
      return { notificationSent: true, callbackId: approvalId };
    });

    // NOW suspend execution and wait for approval
    // Function will terminate here and resume when callback is completed
    context.logger.info("Waiting for approval...", { callbackId: approvalId });
    const approvalResult = await approvalPromise;
    
    if (!approvalResult.approved) {
      context.logger.info("Order rejected.");
      throw new Error("Order rejected by approver");
    }
    context.logger.info("Order approved.");
  }

  // 5. Trigger Shipment
  await context.step("TriggerShipment", async () => {
    context.logger.info("Triggering shipment...");
    // shipOrder(event);
  });

  // 6. Notify Customer
  await context.step("NotifyCustomer", async () => {
    context.logger.info("Notifying customer...");
    // notifyUser(event);
  });

  return { status: "OrderCompleted", orderId: event.orderId };
};
