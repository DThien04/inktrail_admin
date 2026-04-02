import { clearAuthSession, getAccessToken, updateAccessToken } from "@/features/auth/storage";
import { env } from "@/lib/config/env";

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: HeadersInit;
  body?: BodyInit | object;
  cache?: RequestCache;
  useCredentials?: boolean;
  skipUnauthorizedRedirect?: boolean;
  skipAuthRefresh?: boolean;
};

type RequestInterceptorContext = {
  path: string;
  init: RequestInit & {
    useCredentials?: boolean;
    skipUnauthorizedRedirect?: boolean;
    skipAuthRefresh?: boolean;
  };
};

type ResponseInterceptorContext = {
  response: Response;
  path: string;
  init: RequestInterceptorContext["init"];
};

type RequestInterceptor = (
  context: RequestInterceptorContext,
) => Promise<RequestInterceptorContext> | RequestInterceptorContext;

type ResponseInterceptor = (
  context: ResponseInterceptorContext,
) => Promise<ResponseInterceptorContext> | ResponseInterceptorContext;

const requestInterceptors: RequestInterceptor[] = [];
const responseInterceptors: ResponseInterceptor[] = [];

function addRequestInterceptor(interceptor: RequestInterceptor) {
  requestInterceptors.push(interceptor);
}

function addResponseInterceptor(interceptor: ResponseInterceptor) {
  responseInterceptors.push(interceptor);
}

async function runRequestInterceptors(context: RequestInterceptorContext) {
  let current = context;
  for (const interceptor of requestInterceptors) {
    current = await interceptor(current);
  }
  return current;
}

async function runResponseInterceptors(context: ResponseInterceptorContext) {
  let current = context;
  for (const interceptor of responseInterceptors) {
    current = await interceptor(current);
  }
  return current;
}

async function parseErrorResponse(response: Response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const payload = (await response.json()) as { message?: string };
    return payload.message || `Request failed with status ${response.status}`;
  }

  const rawText = await response.text();

  if (contentType.includes("text/html") || rawText.includes("<!DOCTYPE html>")) {
    return "Admin đang gọi sai địa chỉ API hoặc server backend chưa sẵn sàng.";
  }

  return rawText || `Request failed with status ${response.status}`;
}

let refreshPromise = null;

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const response = await fetch(`${env.apiBaseUrl}/auth/refresh`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-client-platform": "web",
          },
          credentials: "include",
        });

        if (!response.ok) {
          clearAuthSession();
          return null;
        }

        const payload = (await response.json()) as { access_token: string };
        updateAccessToken(payload.access_token);
        return payload.access_token;
      } catch {
        clearAuthSession();
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }

  return refreshPromise;
}

addRequestInterceptor(({ path, init }) => {
  const headers = new Headers(init.headers);
  const token = getAccessToken();
  const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData;

  if (!isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return {
    path,
    init: {
      ...init,
      headers,
      credentials: init.useCredentials ? "include" : init.credentials,
    },
  };
});

addResponseInterceptor(async ({ response, path, init }) => {
  if (response.status === 401 && !init.skipAuthRefresh) {
    const nextAccessToken = await refreshAccessToken();
    if (nextAccessToken) {
      const retryHeaders = new Headers(init.headers);
      retryHeaders.set("Authorization", `Bearer ${nextAccessToken}`);

      const retryResponse = await fetch(`${env.apiBaseUrl}${path}`, {
        ...init,
        headers: retryHeaders,
        credentials: "include",
      });

      return {
        response: retryResponse,
        path,
        init: {
          ...init,
          headers: retryHeaders,
          skipAuthRefresh: true,
        },
      };
    }
  }

  if (
    response.status === 401 &&
    !init.skipUnauthorizedRedirect &&
    typeof window !== "undefined"
  ) {
    clearAuthSession();
    const next = encodeURIComponent(window.location.pathname);
    window.location.href = `/login?next=${next}`;
  }

  return { response, path, init };
});

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!env.apiBaseUrl) {
    throw new Error(
      "Chưa cấu hình NEXT_PUBLIC_API_BASE_URL. Hãy tạo file .env.local cho admin.",
    );
  }

  const preparedBody =
    options.body === undefined
      ? undefined
      : typeof FormData !== "undefined" && options.body instanceof FormData
        ? options.body
        : JSON.stringify(options.body);

  const initialContext = await runRequestInterceptors({
    path,
    init: {
      method: options.method ?? "GET",
      headers: options.headers,
      cache: options.cache ?? "no-store",
      body: preparedBody,
      useCredentials: options.useCredentials,
      skipUnauthorizedRedirect: options.skipUnauthorizedRedirect,
      skipAuthRefresh: options.skipAuthRefresh,
    },
  });

  let response;

  try {
    response = await fetch(`${env.apiBaseUrl}${initialContext.path}`, initialContext.init);
  } catch {
    throw new Error("Không thể kết nối tới server backend.");
  }

  const intercepted = await runResponseInterceptors({
    response,
    path,
    init: initialContext.init,
  });

  if (!intercepted.response.ok) {
    const message = await parseErrorResponse(intercepted.response);
    throw new Error(message);
  }

  if (intercepted.response.status === 204) {
    return undefined;
  }

  const contentType = intercepted.response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error("Server trả về dữ liệu không hợp lệ cho admin.");
  }

  return intercepted.response.json();
}

export const apiClient = {
  get: <T>(path: string, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, options?: Omit<RequestOptions, "method">) =>
    request<T>(path, { ...options, method: "POST" }),
  put: <T>(path: string, options?: Omit<RequestOptions, "method">) =>
    request<T>(path, { ...options, method: "PUT" }),
  patch: <T>(path: string, options?: Omit<RequestOptions, "method">) =>
    request<T>(path, { ...options, method: "PATCH" }),
  delete: <T>(path: string, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...options, method: "DELETE" }),
};
