//this file parses the amplify_outputs.json and exposes the fields

// Make sure your tsconfig has: "resolveJsonModule": true
import outputs from "@/../amplify_outputs.json"; // adjust path if needed

type Outputs = {
  custom?: {
    httpApi?: {
      url?: string;
    };
  };
};

function invariant<T>(val: T | undefined, msg: string): T {
  if (val == null || (typeof val === "string" && !val.trim())) {
    throw new Error(msg);
  }
  return val;
}

export const API_BASE_URL = (() => {
  const o = outputs as unknown as Outputs;
  return invariant(o.custom?.httpApi?.url, "API URL missing in amplify_outputs.json at custom.httpApi.url").replace(
    /\/+$/,
    "",
  );
})();
