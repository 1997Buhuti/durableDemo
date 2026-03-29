import {
  LambdaClient,
  SendDurableExecutionCallbackFailureCommand,
} from "@aws-sdk/client-lambda";

// Usage: npx ts-node reject.ts <callbackId> [reason]
const run = async () => {
  const callbackId = process.argv[2];
  const reason = process.argv[3] || "Order rejected by approver";

  if (!callbackId) {
    console.error("Please provide a callbackId.");
    console.error("Usage: npx ts-node reject.ts <callbackId> [reason]");
    process.exit(1);
  }

  console.log(`Rejecting callback: ${callbackId}...`);
  console.log(`Reason: ${reason}`);

  // Initialize the Lambda client (uses default AWS credentials)
  const client = new LambdaClient({
    region: process.env.AWS_REGION || "us-east-1",
  });

  try {
    // Send the "Rejected" signal
    const command = new SendDurableExecutionCallbackFailureCommand({
      CallbackId: callbackId,
      Error: "Rejected",
      Cause: reason,
    });

    await client.send(command);
    console.log("Successfully rejected!");
  } catch (error) {
    console.error("Failed to reject:", error);
    process.exit(1);
  }
};

run();
