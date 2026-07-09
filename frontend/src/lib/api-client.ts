import { authStore } from "@/store/auth-store";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type AuthorizedFetchOptions = RequestInit & {
  /** When true, throws if no access token is available. */
  requireAuth?: boolean;
};

export async function authorizedFetch(
  input: RequestInfo | URL,
  init: AuthorizedFetchOptions = {},
): Promise<Response> {
  const { requireAuth = false, ...requestInit } = init;
  const token = await authStore.getAccessToken();
  const headers = new Headers(requestInit.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  } else if (requireAuth) {
    throw new ApiError("Authentication required", 401);
  }

  const res = await fetch(input, { ...requestInit, headers });

  if (res.status === 401) {
    throw new ApiError("Session expired or invalid. Please sign in again.", 401);
  }
  if (res.status === 403) {
    throw new ApiError("You do not have permission to perform this action.", 403);
  }

  return res;
}
