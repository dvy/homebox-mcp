import { AuthManager } from "./auth.js";
import {
  HomeboxAuthError,
  HomeboxConnectionError,
  HomeboxError,
  HomeboxNotFoundError,
} from "./errors.js";

export class HomeboxClient {
  constructor(
    private baseUrl: string,
    private auth: AuthManager,
  ) {}

  async request<T = unknown>(
    method: string,
    path: string,
    options?: {
      body?: unknown;
      params?: Record<string, string | string[] | undefined>;
      formData?: FormData;
      rawResponse?: boolean;
    },
  ): Promise<T> {
    const token = await this.auth.getToken();
    return this.doRequest<T>(method, path, token, options);
  }

  private async doRequest<T>(
    method: string,
    path: string,
    token: string,
    options?: {
      body?: unknown;
      params?: Record<string, string | string[] | undefined>;
      formData?: FormData;
      rawResponse?: boolean;
    },
    retried = false,
  ): Promise<T> {
    const url = new URL(`/api/v1${path}`, this.baseUrl);
    if (options?.params) {
      for (const [key, value] of Object.entries(options.params)) {
        if (value === undefined) continue;
        if (Array.isArray(value)) {
          for (const v of value) url.searchParams.append(key, v);
        } else {
          url.searchParams.set(key, value);
        }
      }
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
    };

    let requestBody: BodyInit | undefined;
    if (options?.formData) {
      requestBody = options.formData;
    } else if (options?.body !== undefined) {
      headers["Content-Type"] = "application/json";
      requestBody = JSON.stringify(options.body);
    }

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        method,
        headers,
        body: requestBody,
      });
    } catch (e) {
      throw new HomeboxConnectionError(
        `Request failed: ${method} ${path} - ${e}`,
      );
    }

    if (response.status === 401 && !retried) {
      const newToken = await this.auth.clearAndRetry();
      return this.doRequest<T>(method, path, newToken, options, true);
    }

    if (response.status === 404) {
      throw new HomeboxNotFoundError(`Not found: ${path}`);
    }

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new HomeboxError(
        `${method} ${path} failed: ${response.status} ${response.statusText}`,
        response.status,
        text,
      );
    }

    if (
      options?.rawResponse ||
      response.status === 204 ||
      response.headers.get("content-length") === "0"
    ) {
      return undefined as T;
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return (await response.json()) as T;
    }

    // Return text for non-JSON (CSV exports etc)
    return (await response.text()) as T;
  }
}
