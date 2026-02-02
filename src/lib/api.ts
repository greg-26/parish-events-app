import { fetchAuthSession } from "aws-amplify/auth";
import { API_BASE_URL } from "@/lib/outputs";

/**
 * @param path API path, e.g. "/me"
 */
export async function apiFetch(path: string, init: RequestInit = {}) {
  const { tokens } = await fetchAuthSession(); // auto-refreshes if needed
  // Use idToken for Cognito User Pool authorizer; switch to accessToken if your API expects it
  const jwt = tokens?.idToken?.toString() ?? tokens?.accessToken?.toString();

  path = path.startsWith("/") ? path.slice(1) : path; // remove leading slash if present
  let baseUrl = API_BASE_URL; //"https://9grib5j6ab.execute-api.us-east-1.amazonaws.com"; //TODO: read from amplify_outputs.json

  baseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl; //ensure no trailing slash
  const url = baseUrl + "/" + path;

  return fetch(url, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${jwt}`, // API Gateway/Cognito expects Bearer
    },
  });
}
