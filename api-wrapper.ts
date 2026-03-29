import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

/**
 * HTTP API Gateway wrapper that invokes a durable function correctly.
 * This is a regular Lambda function that can be triggered by API Gateway,
 * which then invokes the durable function with the proper configuration.
 * 
 * Configured to work with the simple workflow that expects:
 * - taskName: string
 * - userId: string
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Parse the request from the HTTP request body
    const payload = JSON.parse(event.body || "{}");

    // Validate required fields for simple workflow
    if (!payload.taskName || !payload.userId) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "Missing required fields: taskName, userId",
        }),
      };
    }

    // Get the durable function name from environment
    const durableFunctionName = process.env.DURABLE_FUNCTION_NAME;
    if (!durableFunctionName) {
      throw new Error("DURABLE_FUNCTION_NAME environment variable not set");
    }

    // Create Lambda client
    const lambda = new LambdaClient({});

    // Invoke the durable function with qualified ARN
    // Durable functions require qualified ARNs (version or alias)
    const command = new InvokeCommand({
      FunctionName: `${durableFunctionName}:$LATEST`, // Qualified ARN required for durable functions
      InvocationType: "Event", // Async invocation for long-running workflows
      Payload: JSON.stringify(payload),
    });

    await lambda.send(command);

    // Return immediate response (the durable function runs async)
    return {
      statusCode: 202, // 202 Accepted (processing asynchronously)
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Task processing started",
        taskName: payload.taskName,
        userId: payload.userId,
        status: "processing",
        note: "Check CloudWatch Logs for execution details",
      }),
    };
  } catch (error) {
    console.error("Error invoking durable function:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Failed to start task processing",
        details: error instanceof Error ? error.message : String(error),
      }),
    };
  }
};
