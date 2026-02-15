import { main } from '../handler';
import { Context } from 'aws-lambda';

const mockContext: Context = {
  callbackWaitsForEmptyEventLoop: true,
  functionName: 'test',
  functionVersion: '1',
  invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test',
  memoryLimitInMB: '128',
  awsRequestId: 'id',
  logGroupName: 'log-group',
  logStreamName: 'log-stream',
  getRemainingTimeInMillis: () => 1000,
  done: () => {},
  fail: () => {},
  succeed: () => {},
} as any;

const runTest = async () => {
  console.log("--- Test 1: Regular Order ---");
  const event1 = {
    orderId: "ord-1",
    amount: 500,
    customerId: "cust-1"
  };
    await (main as any)(event1, mockContext, () => { });

  console.log("\n--- Test 2: High Value Order (Needs Approval) ---");
  const event2 = {
    orderId: "ord-2",
    amount: 1500,
    customerId: "cust-2"
  };
    await (main as any)(event2, mockContext, () => { });
  
  console.log("\n--- Test 3: Legacy/HTTP Event (String Body) ---");
  const event3 = {
    body: JSON.stringify({
        orderId: "ord-3",
        amount: 200,
        customerId: "cust-3"
    })
  };
    await (main as any)(event3, mockContext, () => { });
};

runTest().catch(console.error);
