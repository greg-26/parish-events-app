import { defineFunction } from "@aws-amplify/backend";

export const streamWorkerFn = defineFunction({
  name: "stream-worker",
  entry: "./handler.ts",
});
