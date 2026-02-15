

import { DurableExecutionClient } from '@aws/durable-execution-sdk-js';


// Usage: npx ts-node approve.ts <callbackId>
const run = async () => {
  const callbackId = process.argv[2];
  if (!callbackId) {
    console.error("Please provide a callbackId.");
    console.error("Usage: npx ts-node approve.ts <callbackId>");
    process.exit(1);
  }

  console.log(`Approving callback: ${callbackId}...`);

  // Initialize the client (uses default AWS credentials)
  const client = new DurableExecutionClient({
    region: process.env.AWS_REGION || 'us-east-1' // Adjust region if needed
  });

  try {
    // Send the "Approved" signal
    await client.sendCallbackSuccess({
      callbackId,
      output: { approved: true } // Matches the expected type in workflow.ts
    });
    console.log("Successfully approved!");
  } catch (error) {
    console.error("Failed to approve:", error);
  }
};

run();
