#!/usr/bin/env node
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

/**
 * Helper script to invoke durable functions correctly from the command line
 * Usage: npx ts-node invoke-durable.ts <function-name> <payload-json>
 * 
 * Examples:
 *   npx ts-node invoke-durable.ts durableDemo-dev-simpleDemo '{"taskName":"demo","userId":"user-123"}'
 *   npx ts-node invoke-durable.ts durableDemo-dev-orderProcessing '{"orderId":"order-999","amount":1500,"customerId":"vip"}'
 */

const run = async () => {
  const functionName = process.argv[2];
  const payloadJson = process.argv[3];

  if (!functionName || !payloadJson) {
    console.error('Usage: npx ts-node invoke-durable.ts <function-name> <payload-json>');
    console.error('');
    console.error('Examples:');
    console.error('  npx ts-node invoke-durable.ts durableDemo-dev-simpleDemo \'{"taskName":"demo","userId":"user-123"}\'');
    console.error('  npx ts-node invoke-durable.ts durableDemo-dev-orderProcessing \'{"orderId":"order-999","amount":1500,"customerId":"vip"}\'');
    process.exit(1);
  }

  try {
    const payload = JSON.parse(payloadJson);
    
    console.log(`Invoking durable function: ${functionName}:$LATEST`);
    console.log('Payload:', JSON.stringify(payload, null, 2));

    const lambda = new LambdaClient({
      region: process.env.AWS_REGION || 'us-east-1',
    });

    // CRITICAL: Must use qualified ARN (with :$LATEST or version number)
    const command = new InvokeCommand({
      FunctionName: `${functionName}:$LATEST`,
      InvocationType: 'Event',  // Async invocation
      Payload: JSON.stringify(payload),
    });

    const response = await lambda.send(command);

    console.log('\n✅ Invocation successful!');
    console.log('Status Code:', response.StatusCode);
    console.log('Request ID:', response.$metadata.requestId);
    console.log('\nTo view logs:');
    console.log(`  serverless logs -f ${functionName.split('-').pop()} --tail`);
    console.log('Or:');
    console.log(`  aws logs tail /aws/lambda/${functionName} --follow`);

  } catch (error) {
    console.error('\n❌ Invocation failed:');
    if (error instanceof SyntaxError) {
      console.error('Invalid JSON payload. Make sure to use proper JSON format and escape quotes.');
    } else {
      console.error(error);
    }
    process.exit(1);
  }
};

run();
