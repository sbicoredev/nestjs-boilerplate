import { registerAs } from "@nestjs/config";
import { Expose } from "class-transformer";
import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
} from "class-validator";

import { EMAIL_CONFIG_TOKEN } from "~/common/constants/config";
import { EMAIL_PROVIDER_MAP } from "~/common/constants/mappings";
import { validatedConfig } from "~/common/utils/validate-config";

export class EmailConfig {
  @Expose({ name: "EMAIL_PROVIDER" })
  @IsString()
  @IsIn(Object.values(EMAIL_PROVIDER_MAP))
  @IsNotEmpty()
  provider: keyof typeof EMAIL_PROVIDER_MAP = "smtp";

  @Expose({ name: "EMAIL_FROM_ADDRESS" })
  @IsString()
  @IsNotEmpty()
  fromAddress: string;

  @Expose({ name: "EMAIL_FROM_NAME" })
  @IsString()
  @IsNotEmpty()
  fromName: string;

  @Expose({ name: "SMTP_URL" })
  @IsString()
  @IsOptional()
  smtpUrl = "smtp://localhost:1025";

  /** In seconds */
  @Expose({ name: "SMTP_CONNECT_TIMEOUT" })
  @Max(100)
  @Min(1)
  @IsNumber()
  @IsOptional()
  connectTimeout: number = 10;

  @Expose({ name: "SENDGRID_API_KEY" })
  @ValidateIf((cfg: EmailConfig) => cfg.provider === "sendgrid")
  @IsString()
  @IsNotEmpty()
  sendgridApiKey?: string;
}

export const emailConfig = registerAs<EmailConfig>(EMAIL_CONFIG_TOKEN, () =>
  validatedConfig(process.env, EmailConfig)
);
