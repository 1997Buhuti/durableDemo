# AWS Lambda Durable Functions Demo

This project demonstrates AWS Lambda Durable Functions using the `@aws/durable-execution-sdk-js`.

## Prerequisites

- **Node.js >= 22** (required by the durable execution SDK)
- AWS account with appropriate permissions
- Serverless Framework

## Project Structure

- `simple-handler.ts` / `simple-workflow.ts` - **Start here!** Basic example demonstrating steps and wait operations
- `handler.ts` / `workflow.ts` - Advanced example with callbacks and high-value order approval
- `approve.ts` - Utility to complete callback operations

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Deploy to AWS

```bash
serverless deploy
```

### 3. Test the Simple Workflow

```bash
# Using AWS CLI
aws lambda invoke \
  --function-name durableDemo-dev-simpleDemo:$LATEST \
  --invocation-type Event \
  --cli-binary-format raw-in-base64-out \
  --payload '{"taskName": "demo-task", "userId": "user-123"}' \
  response.json

# Or test via HTTP endpoint (get URL from deploy output)
curl -X POST https://YOUR_API_URL/simple \
  -H "Content-Type: application/json" \
  -d '{"taskName": "demo-task", "userId": "user-123"}'
```

### 4. Test the Order Processing Workflow

```bash
# Low value order (no approval needed)
aws lambda invoke \
  --function-name durableDemo-dev-orderProcessing:$LATEST \
  --invocation-type Event \
  --cli-binary-format raw-in-base64-out \
  --payload '{"orderId": "order-123", "amount": 500, "customerId": "customer-456"}' \
  response.json

# High value order (requires approval)
aws lambda invoke \
  --function-name durableDemo-dev-orderProcessing:$LATEST \
  --invocation-type Event \
  --cli-binary-format raw-in-base64-out \
  --payload '{"orderId": "order-999", "amount": 1500, "customerId": "vip-user"}' \
  response.json

# To approve the high-value order, use the callback ID from logs:
npx ts-node approve.ts <callback-id-from-logs>
```

## Key Concepts

### 1. Steps (`context.step()`)
- Automatically checkpointed
- Will not re-execute on replay if already completed
- Perfect for API calls, database operations, etc.

### 2. Wait (`context.wait()`)
- Suspends execution without consuming compute resources
- No charges during the wait period
- Useful for delays, polling intervals, etc.

### 3. Callbacks (`context.createCallback()`)
- Enables human-in-the-loop workflows
- Function suspends until external system completes the callback
- Great for approvals, webhooks, etc.

## Important Notes

### Runtime Requirements
- **Must use Node.js 22+** (`nodejs22.x` in Lambda)
- The SDK will not work with older Node.js versions

### Invocation
- Must use **qualified ARN** (with version or alias like `:$LATEST`)
- Use **Event invocation type** for long-running executions
- For production, use numbered versions instead of `$LATEST`

### Determinism
- Code must be deterministic (same inputs = same durable operation order)
- Don't use `Date.now()`, `Math.random()`, etc. outside of steps
- All non-deterministic operations should be inside `context.step()`

## Monitoring

Check CloudWatch Logs for execution details:

```bash
# View logs for simple demo
serverless logs -f simpleDemo --tail

# View logs for order processing
serverless logs -f orderProcessing --tail
```

## Troubleshooting

### "Cannot read properties of undefined (reading 'SUCCEEDED')"
- **Cause**: Wrong Node.js runtime version
- **Fix**: Update `serverless.yml` to use `nodejs22.x`

### Function times out
- Increase timeout in `serverless.yml`
- Check CloudWatch Logs for errors
- Verify the function has proper IAM permissions

## Learn More

- [AWS Lambda Durable Functions Documentation](https://docs.aws.amazon.com/lambda/latest/dg/durable-functions.html)
- [SDK GitHub Repository](https://github.com/aws/aws-durable-execution-sdk-js)
- [SDK API Reference](https://github.com/aws/aws-durable-execution-sdk-js/tree/main/docs/api-reference)
