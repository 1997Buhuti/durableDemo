import {
  LambdaClient,
  SendDurableExecutionCallbackSuccessCommand,
} from "@aws-sdk/client-lambda";

// Usage: npx ts-node approve.ts <callbackId>
const run = async () => {
  const callbackId = process.argv[2];
  if (!callbackId) {
    console.error("Please provide a callbackId.");
    console.error("Usage: npx ts-node approve.ts <callbackId>");
    process.exit(1);
  }

  console.log(`Approving callback: ${callbackId}...`);

  // Initialize the Lambda client (uses default AWS credentials)
  const client = new LambdaClient({
    region: process.env.AWS_REGION || "us-east-1", // Adjust region if needed
  });

  try {
    // Send the "Approved" signal
    const command = new SendDurableExecutionCallbackSuccessCommand({
      CallbackId: callbackId,
      Result: JSON.stringify({ approved: true }), // Matches the expected type in workflow.ts
    });

    await client.send(command);
    console.log("Successfully approved!");
  } catch (error) {
    console.error("Failed to approve:", error);
    process.exit(1);
  }
};

run();
