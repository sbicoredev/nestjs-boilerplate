/**
 * Represents the context for a single HTTP request
 */
export interface HttpContext {
  getRequest(): NestRequest;
  getResponse(): NestResponse | undefined;
  getRequestId(): string;
}
