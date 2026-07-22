import type { HelmetOptions } from "helmet";

export const CORS_HEADERS = [
  "Accept",
  "Content-Type",
  "Authorization",
  "X-Requested-With",
  "X-Request-Id",
];
export const CORS_METHODS = [
  "GET",
  "POST",
  "PATCH",
  "PUT",
  "DELETE",
  "OPTIONS",
  "HEAD",
];

// CSP directives are configured to allow resources needed for API documentation
// (Swagger UI, Scalar) while maintaining security against XSS attacks.
export const HELMET_OPTIONS: Readonly<HelmetOptions> = {
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: [`'self'`],
      imgSrc: [`'self'`, "data:", "cdn.jsdelivr.net"],
      fontSrc: [`'self'`, "fonts.scalar.com", "data:"],
      scriptSrc: [
        `'self'`,
        `https: 'unsafe-inline'`,
        "cdn.jsdelivr.net",
        `'unsafe-eval'`,
      ],
      styleSrc: [
        `'self'`,
        `'unsafe-inline'`,
        "cdn.jsdelivr.net",
        "fonts.googleapis.com",
        "unpkg.com",
      ],
      connectSrc: [`'self'`, "cdn.jsdelivr.net", "unpkg.com"],
    },
  },
};
