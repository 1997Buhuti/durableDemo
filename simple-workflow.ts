import { DurableContext } from '@aws/durable-execution-sdk-js';

export interface ProcessRequest {
  taskName: string;
  userId: string;
}

/**
 * Simple durable function that demonstrates:
 * 1. Checkpointed steps
 * 2. Waiting/pausing execution
 * 3. Basic workflow orchestration
 */
export const simpleWorkflow = async (event: ProcessRequest, context: DurableContext) => {
  context.logger.info('Starting simple workflow', { taskName: event.taskName });

  // Step 1: Initialize task
  const initResult = await context.step('initialize', async () => {
    context.logger.info('Initializing task...');
    return {
      taskId: `task-${Date.now()}`,
      startedAt: new Date().toISOString(),
    };
  });

  context.logger.info('Task initialized', initResult);

  // Step 2: Process the task
  const processResult = await context.step('process', async () => {
    context.logger.info('Processing task...', { taskId: initResult.taskId });
    
    // Simulate some work
    const result = {
      taskId: initResult.taskId,
      status: 'processed',
      data: `Processed ${event.taskName} for user ${event.userId}`,
    };
    
    return result;
  });

  // Step 3: Wait for 5 seconds (simulating async operation)
  // The function will suspend here without consuming compute resources
  context.logger.info('Waiting 5 seconds before completion...');
  await context.wait({ seconds: 5 });
  context.logger.info('Wait completed, finalizing...');

  // Step 4: Finalize
  const finalResult = await context.step('finalize', async () => {
    context.logger.info('Finalizing task...');
    return {
      ...processResult,
      completedAt: new Date().toISOString(),
      status: 'completed',
    };
  });

  context.logger.info('Workflow completed successfully', finalResult);
  return finalResult;
};
