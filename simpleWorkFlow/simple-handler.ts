import { withDurableExecution } from "@aws/durable-execution-sdk-js";
import { simpleWorkflow } from "./simple-workflow";

// Wrap the workflow with durable execution
export const handler = withDurableExecution(simpleWorkflow);
