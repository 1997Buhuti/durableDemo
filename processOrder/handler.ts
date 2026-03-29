import { withDurableExecution } from "@aws/durable-execution-sdk-js";
import { orderProcessing } from "./workflow";

// The SDK automatically wraps the handler and provides the DurableContext
export const main = withDurableExecution(orderProcessing);
