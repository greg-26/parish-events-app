import { describe, it, expect } from "vitest";

// Import the handler directly — it's a pure function
import { handler } from "../../amplify/functions/api/handler";

// Helper to build a minimal API Gateway v2 event
function makeEvent(method: string, path: string, claims: Record<string, unknown> = { sub: "user-123" }) {
  return {
    requestContext: {
      http: { method, path },
      authorizer: { jwt: { claims, scopes: [] } },
    },
    rawPath: path,
    body: null,
    isBase64Encoded: false,
    headers: {},
    queryStringParameters: null,
    pathParameters: null,
    stageVariables: null,
    routeKey: "",
    version: "2.0",
    rawQueryString: "",
  } as any;
}

describe("API Handler", () => {
  it("returns 401 when no sub in claims", async () => {
    const event = makeEvent("GET", "/whoami", {});
    const res = await handler(event);
    expect(res.statusCode).toBe(401);
  });

  it("returns user info on GET /whoami", async () => {
    const event = makeEvent("GET", "/whoami", {
      sub: "abc-123",
      email: "test@example.com",
      "cognito:username": "testuser",
    });
    const res = await handler(event);
    expect(res.statusCode).toBe(200);

    const body = JSON.parse(res.body as string);
    expect(body.ok).toBe(true);
    expect(body.user.id).toBe("abc-123");
    expect(body.user.email).toBe("test@example.com");
  });

  it("returns 404 for unknown routes", async () => {
    const event = makeEvent("GET", "/nonexistent");
    const res = await handler(event);
    expect(res.statusCode).toBe(404);
  });

  it("handles OPTIONS preflight", async () => {
    const event = makeEvent("OPTIONS", "/whoami");
    const res = await handler(event);
    expect(res.statusCode).toBe(204);
  });
});
