import { HomeboxAuthError, HomeboxConnectionError } from "./errors.js";

function normalizeToken(token: string): string {
  return token.startsWith("Bearer ") ? token.slice(7) : token;
}

export class AuthManager {
  private token: string | null = null;
  private expiresAt: Date | null = null;

  constructor(
    private baseUrl: string,
    private username: string,
    private password: string,
    presetToken?: string,
  ) {
    if (presetToken) {
      this.token = normalizeToken(presetToken);
    }
  }

  async getToken(): Promise<string> {
    if (
      this.token &&
      this.expiresAt &&
      this.expiresAt > new Date(Date.now() + 60_000)
    ) {
      return this.token;
    }

    if (this.token) {
      try {
        return await this.refresh();
      } catch {
        // refresh failed, fall through to login
      }
    }

    return await this.login();
  }

  async clearAndRetry(): Promise<string> {
    this.token = null;
    this.expiresAt = null;
    return await this.login();
  }

  private async login(): Promise<string> {
    const url = `${this.baseUrl}/api/v1/users/login`;
    const body = new URLSearchParams({
      username: this.username,
      password: this.password,
      stayLoggedIn: "true",
    });

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
    } catch (e) {
      throw new HomeboxConnectionError(classifyConnectionError(e));
    }

    if (!response.ok) {
      throw new HomeboxAuthError(
        `Login failed: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    const token =
      data.token || data.jwt || data.accessToken;
    if (!token) {
      throw new HomeboxAuthError("Login response did not include a token");
    }

    this.token = normalizeToken(token);
    if (data.expiresAt) {
      this.expiresAt = new Date(data.expiresAt);
    }
    return this.token;
  }

  private async refresh(): Promise<string> {
    const url = `${this.baseUrl}/api/v1/users/refresh`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${this.token}` },
    });

    if (!response.ok) {
      throw new HomeboxAuthError("Token refresh failed");
    }

    const data = await response.json();
    const token = data.token || "";
    this.token = normalizeToken(token);
    if (data.expiresAt) {
      this.expiresAt = new Date(data.expiresAt);
    }
    return this.token;
  }
}

function classifyConnectionError(e: unknown): string {
  const msg = String(e).toLowerCase();
  if (msg.includes("getaddrinfo") || msg.includes("enotfound")) {
    return "Cannot resolve Homebox server address. Check HOMEBOX_URL.";
  }
  if (msg.includes("econnrefused") || msg.includes("connection refused")) {
    return "Connection refused. Check if Homebox is running.";
  }
  if (msg.includes("ssl") || msg.includes("certificate")) {
    return "SSL/TLS error. Check the URL protocol (http vs https).";
  }
  return "Cannot connect to Homebox. Check HOMEBOX_URL and network.";
}
