export interface ProblemDetails {
  /**
   * URI reference identifying the problem type.
   * @format simple "/errors/catalog/product-not-found"
   * @format for microservices "urn:<organization>:<module>:<error-code>"
   * @format complex "urn:<nid>:<organization>:<service>:<sub-service>:<module>:<error-code>"
   * @Example "urn:acme:catalog:product-not-found"
   * @Default "about:blank"
   */
  type: string;

  /**
   * Stable, human-readable title. Must not change between occurrences.
   * @Example "Product Not Found"
   */
  title: string;

  /**
   * HTTP status code. Must match response status.
   * @Example 404
   */
  status: number;

  /**
   * Human-readable explanation specific to this occurrence.
   * @Example "Product with id '0123-4567-...' was not found"
   */
  detail: string;

  /**
   * URI reference identifying this specific occurrence. Usually request path.
   * @Example "/api/product/0123-4567-..."
   */
  instance: string;

  /**
   * Stable machine-readable error code.
   * @Example "catalog.product_not_found"
   */
  code: string;

  /** Future Extension members. */
  extensions?: Record<string, unknown>;
}
