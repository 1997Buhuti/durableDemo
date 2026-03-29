# Approval API Integration Examples

This document shows different ways to complete a callback approval in production.

## Understanding the Flow

```
1. Lambda creates callback → Gets callbackId
2. Lambda sends callbackId to external system (SNS/Email/Database/API)
3. Lambda SUSPENDS (terminates, no compute cost)
4. External system/user makes decision
5. External system calls AWS API to complete callback
6. Lambda RESUMES automatically
```

## Method 1: Using the AWS SDK (Your approve.ts)

```typescript
import {
  LambdaClient,
  SendDurableExecutionCallbackSuccessCommand,
} from "@aws-sdk/client-lambda";

const client = new LambdaClient({ region: "us-east-1" });

// Approve
await client.send(
  new SendDurableExecutionCallbackSuccessCommand({
    CallbackId: callbackId,
    Result: JSON.stringify({ approved: true }),
  })
);

// Reject
await client.send(
  new SendDurableExecutionCallbackFailureCommand({
    CallbackId: callbackId,
    Error: "Rejected",
    Cause: "User declined the order",
  })
);
```

## Method 2: Using AWS CLI

```bash
# Approve
aws lambda send-durable-execution-callback-success \
  --callback-id "abc123-def456-ghi789" \
  --result '{"approved": true}'

# Reject
aws lambda send-durable-execution-callback-failure \
  --callback-id "abc123-def456-ghi789" \
  --error "Rejected" \
  --cause "User declined the order"
```

## Method 3: HTTP API Gateway + Lambda

Create an approval API that anyone can call:

```typescript
// approval-handler.ts
import { APIGatewayProxyEvent } from "aws-lambda";
import {
  LambdaClient,
  SendDurableExecutionCallbackSuccessCommand,
} from "@aws-sdk/client-lambda";

export const handler = async (event: APIGatewayProxyEvent) => {
  const { callbackId, approved, reason } = JSON.parse(event.body || "{}");

  const client = new LambdaClient({});

  if (approved) {
    await client.send(
      new SendDurableExecutionCallbackSuccessCommand({
        CallbackId: callbackId,
        Result: JSON.stringify({ approved: true, reason }),
      })
    );
  } else {
    await client.send(
      new SendDurableExecutionCallbackFailureCommand({
        CallbackId: callbackId,
        Error: "Rejected",
        Cause: reason || "User declined",
      })
    );
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Approval processed" }),
  };
};
```

Then you can send approval links via email:

```
Click to approve: https://api.example.com/approve?id=abc123&action=approve
Click to reject: https://api.example.com/approve?id=abc123&action=reject
```

## Method 4: Web UI with React

```typescript
// Frontend
const handleApproval = async (callbackId: string, approved: boolean) => {
  await fetch("/api/approve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callbackId, approved }),
  });
};

// Backend (Next.js API route example)
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { callbackId, approved } = req.body;

  const lambda = new LambdaClient({});
  await lambda.send(
    new SendDurableExecutionCallbackSuccessCommand({
      CallbackId: callbackId,
      Result: JSON.stringify({ approved }),
    })
  );

  res.json({ success: true });
}
```

## Method 5: Slack Integration

```typescript
// Send to Slack with approval buttons
await context.step("SendSlackNotification", async () => {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;

  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: `Order ${event.orderId} needs approval ($${event.amount})`,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Order:* ${event.orderId}\n*Amount:* $${event.amount}`,
          },
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: { type: "plain_text", text: "Approve" },
              style: "primary",
              url: `https://api.example.com/approve/${approvalId}/true`,
            },
            {
              type: "button",
              text: { type: "plain_text", text: "Reject" },
              style: "danger",
              url: `https://api.example.com/approve/${approvalId}/false`,
            },
          ],
        },
      ],
    }),
  });
});
```

## Method 6: Email with SendGrid/SES

```typescript
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

await context.step("SendApprovalEmail", async () => {
  const ses = new SESClient({});

  await ses.send(
    new SendEmailCommand({
      Source: "approvals@example.com",
      Destination: { ToAddresses: ["manager@example.com"] },
      Message: {
        Subject: { Data: `Approval Required: Order ${event.orderId}` },
        Body: {
          Html: {
            Data: `
            <h2>Order Approval Required</h2>
            <p>Order ID: ${event.orderId}</p>
            <p>Amount: $${event.amount}</p>
            <p>Customer: ${event.customerId}</p>
            <p>
              <a href="https://api.example.com/approve/${approvalId}?action=approve">
                ✅ Approve
              </a> | 
              <a href="https://api.example.com/approve/${approvalId}?action=reject">
                ❌ Reject
              </a>
            </p>
            <p>Or use CLI: <code>npx ts-node approve.ts ${approvalId}</code></p>
          `,
          },
        },
      },
    })
  );
});
```

## Real-World Production Example

```typescript
// Complete production-ready flow
export const productionWorkflow = async (
  event: Order,
  context: DurableContext
) => {
  // ... validation and payment steps ...

  if (event.amount > 1000) {
    const [approvalPromise, approvalId] = await context.createCallback<{
      approved: boolean;
      approvedBy?: string;
      timestamp?: string;
    }>("NotifyApprover", {
      timeout: { hours: 24 },
      heartbeatTimeout: { minutes: 30 }, // Detect if system goes silent
    });

    // Store in database for UI to query
    await context.step("StoreApprovalRequest", async () => {
      const dynamo = new DynamoDBClient({});
      await dynamo.send(
        new PutItemCommand({
          TableName: process.env.APPROVALS_TABLE!,
          Item: {
            callbackId: { S: approvalId },
            orderId: { S: event.orderId },
            amount: { N: event.amount.toString() },
            status: { S: "PENDING" },
            requestedAt: { S: new Date().toISOString() },
            expiresAt: { N: (Date.now() + 24 * 60 * 60 * 1000).toString() },
          },
        })
      );
    });

    // Send multiple notifications
    await context.step("SendNotifications", async () => {
      await Promise.all([
        sendEmail(approvalId, event),
        sendSlack(approvalId, event),
        sendSMS(approvalId, event), // For urgent approvals
      ]);
    });

    // Wait for approval (function suspends here)
    try {
      const result = await approvalPromise;
      context.logger.info("Order approved", result);
    } catch (error) {
      context.logger.error("Approval failed or timed out", { error });
      throw error;
    }
  }

  // Continue processing...
};
```

## Key Takeaways

1. **The callback mechanism DOES work** - it's a core feature of durable functions
2. **You MUST send the callbackId somewhere** before awaiting the promise
3. **Common patterns**: Email links, Slack buttons, Web UI, API endpoints
4. **The function truly suspends** - no compute cost while waiting
5. **Can wait up to 1 year** for a callback response
6. **Set appropriate timeouts** to handle abandoned approvals
