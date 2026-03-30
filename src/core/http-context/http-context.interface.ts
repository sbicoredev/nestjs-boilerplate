/**
 * Represents the context for a single HTTP request
 */
export interface HttpContext {
  getRequest(): NestRequest;
  getRequestId(): string;
  getResponse(): NestResponse | undefined;
}
