export class HomeboxError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public detail?: unknown,
  ) {
    super(message);
    this.name = "HomeboxError";
  }
}

export class HomeboxAuthError extends HomeboxError {
  constructor(message: string) {
    super(message, 401);
    this.name = "HomeboxAuthError";
  }
}

export class HomeboxNotFoundError extends HomeboxError {
  constructor(message: string) {
    super(message, 404);
    this.name = "HomeboxNotFoundError";
  }
}

export class HomeboxConnectionError extends HomeboxError {
  constructor(message: string) {
    super(message);
    this.name = "HomeboxConnectionError";
  }
}
