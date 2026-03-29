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

**Method 1: Using our helper script (easiest):**
```bash
npx ts-node invoke-durable.ts durableDemo-dev-simpleDemo '{"taskName":"demo-task","userId":"user-123"}'
```

**Method 2: Using AWS CLI:**
```bash
aws lambda invoke \
  --function-name durableDemo-dev-simpleDemo:$LATEST \
  --invocation-type Event \
  --cli-binary-format raw-in-base64-out \
  --payload '{"taskName": "demo-task", "userId": "user-123"}' \
  response.json
```

**Method 3: Using HTTP endpoint (via API Gateway wrapper):**
```bash
curl -X POST https://YOUR_API_ID.execute-api.YOUR_REGION.amazonaws.com/order \
  -H "Content-Type: application/json" \
  -d '{"orderId": "order-123", "amount": 500, "customerId": "customer-456"}'
```

### 4. Test the Order Processing Workflow

**Low value order (no approval needed):**
```bash
npx ts-node invoke-durable.ts durableDemo-dev-orderProcessing '{"orderId":"order-123","amount":500,"customerId":"customer-456"}'
```

**High value order (requires approval):**
```bash
# Invoke the workflow
npx ts-node invoke-durable.ts durableDemo-dev-orderProcessing '{"orderId":"order-999","amount":1500,"customerId":"vip-user"}'

# Watch the logs to get the callback ID
serverless logs -f orderProcessing --tail

# When you see the callback ID, approve it:
npx ts-node approve.ts <callback-id-from-logs>

# Or reject it:
npx ts-node reject.ts <callback-id-from-logs> "Order cancelled"
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

### Invocation Requirements (CRITICAL!)
Durable functions have special invocation requirements:

1. **Must use qualified ARN** (with version or alias like `:$LATEST`)
   ```bash
   # ✅ Correct
   aws lambda invoke --function-name myFunction:$LATEST ...
   
   # ❌ Wrong - will fail with "Unexpected payload" error
   aws lambda invoke --function-name myFunction ...
   ```

2. **Cannot be triggered directly by API Gateway**
   - Use the `api-wrapper.ts` pattern (included in this project)
   - The wrapper is a regular Lambda that invokes the durable function correctly

3. **Must use Event invocation type** for long-running executions
   ```bash
   --invocation-type Event  # Async, returns immediately
   ```

4. **For production, use numbered versions** instead of `$LATEST`
   ```bash
   --function-name myFunction:1  # Version 1
   --function-name myFunction:prod  # Alias 'prod'
   ```

### Required IAM Permissions
The Lambda execution role needs these permissions:
```yaml
- lambda:CheckpointDurableExecution
- lambda:GetDurableExecutionState
- lambda:SendDurableExecutionCallbackSuccess
- lambda:SendDurableExecutionCallbackFailure
```
(Already configured in `serverless.yml`)

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

### "Unexpected payload provided to start the durable execution"
- **Cause**: Function invoked without qualified ARN or via API Gateway directly
- **Fix**: 
  - Use qualified ARN: `myFunction:$LATEST` instead of `myFunction`
  - Use the `invoke-durable.ts` helper script
  - Use the API Gateway wrapper (`api-wrapper.ts`) instead of direct triggers

### Function times out
- Increase timeout in `serverless.yml` (up to 900 seconds / 15 minutes)
- Check CloudWatch Logs for errors
- Verify the function has proper IAM permissions

### Callback approval not working
- Ensure you're using the correct callback ID from the logs
- Check AWS credentials are configured correctly
- Verify the region matches where the function is deployed

## Learn More

- [AWS Lambda Durable Functions Documentation](https://docs.aws.amazon.com/lambda/latest/dg/durable-functions.html)
- [SDK GitHub Repository](https://github.com/aws/aws-durable-execution-sdk-js)
- [SDK API Reference](https://github.com/aws/aws-durable-execution-sdk-js/tree/main/docs/api-reference)
