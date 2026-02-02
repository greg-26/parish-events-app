import { defineFunction } from "@aws-amplify/backend";

export const apiFn = defineFunction({
  name: "api",
  entry: "./handler.ts",
});
