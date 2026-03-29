import { withDurableExecution } from '@aws/durable-execution-sdk-js';
import { orderProcessingWithNotification } from './workflow-with-notification';

// Wrap the workflow with durable execution
export const main = withDurableExecution(orderProcessingWithNotification);
