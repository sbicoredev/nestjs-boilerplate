import { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { apiReference } from "@scalar/nestjs-api-reference";

interface OpenApiOptions {
  path: string;
  title: string;
  description?: string;
  version?: string;
  username?: string;
  password?: string;
}

export function setupOpenApi(app: INestApplication, options: OpenApiOptions) {
  const config = new DocumentBuilder()
    .setTitle(options.title || "API")
    .setDescription(options.description || "API documentation")
    .setVersion(options.version || "0.0.1")
    .addBearerAuth(
      { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      "accessToken"
    )
    .addBearerAuth(
      { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      "refreshToken"
    )
    .addApiKey({ type: "apiKey", in: "header", name: "x-api-key" }, "apiKey")
    .build();

  const document = SwaggerModule.createDocument(app, config);

  app.use(
    options.path,
    apiReference({
      sources: [
        { content: document, title: "Api" },
        // Better Auth schema generation endpoint
        { url: "/api/auth/open-api/generate-schema", title: "Auth" },
      ],
    })
  );
}
