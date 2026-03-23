export class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
  }
}

export class ValidationError extends AppError {
  constructor(message, details = []) {
    super(message, 400, "VALIDATION_ERROR");
    this.details = details;
  }
}

export class GatewayError extends AppError {
  constructor(message, providerCode) {
    super(message, 502, "GATEWAY_ERROR");
    this.providerCode = providerCode;
  }
}

export class NotFoundError extends AppError {
  constructor(resource = "resource") {
    super(`${resource} not found`, 404, "NOT_FOUND");
  }
}
