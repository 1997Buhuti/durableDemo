import { DurableContext } from '@aws/durable-execution-sdk-js';

export interface Order {
  orderId: string;
  amount: number;
  customerId: string;
  status?: string;
}

export const orderProcessing = async (event: Order, context: DurableContext) => {
  console.log("Starting order processing for:", event.orderId);

  // 1. Validate Inventory (Checkpointable Step)
  await context.step("ValidateInventory", async () => {
    console.log("Validating inventory...");
    if (Math.random() < 0.1) throw new Error("Out of stock");
    // In a real app, you'd check a DB
    return { status: "InventoryValidated" };
  });

  // 2. Process Payment (Checkpointable Step)
  await context.step("ProcessPayment", async () => {
    console.log("Processing payment...");
    // Simulate payment call
    return { status: "PaymentProcessed" };
  });

  // 3. Wait for Warehouse Confirmation (Suspends execution)
  console.log("Waiting for warehouse...");
  // This will suspend the function state and resume after 10 seconds without paying for compute
  await context.wait("WarehouseWait", { seconds: 10 }); 
  console.log("Warehouse confirmed.");

  // 4. Check for High Value & Request Approval
  if (event.amount > 1000) {
    console.log("High value order. Requesting human approval.");
    
    // Create a task token/ID for callback
    // With SDK, createCallback returns a tuple [promise, id]
    const [approvalPromise, approvalId] = await context.createCallback<{ approved: boolean }>("NotifyApprover");
    
    console.log(`Sending approval request for ${approvalId}`);
    // sendEmail(approver, approvalId);
    
    // In a real scenario, you'd send the approvalId to an external system.
    // That system would then call the CompleteDurableExecutionCallback API with this ID.

    // Suspend execution until the callback is completed
    const approvalResult = await approvalPromise;
    
    if (!approvalResult.approved) {
      console.log("Order rejected.");
      throw new Error("Order rejected by approver");
    }
    console.log("Order approved.");
  }

  // 5. Trigger Shipment
  await context.step("TriggerShipment", async () => {
    console.log("Triggering shipment...");
    // shipOrder(event);
  });

  // 6. Notify Customer
  await context.step("NotifyCustomer", async () => {
    console.log("Notifying customer...");
    // notifyUser(event);
  });

  return { status: "OrderCompleted", orderId: event.orderId };
};
