import { AppConfig } from "~/configs/app.config";
import { DatabaseConfig } from "~/configs/database.config";

import { APP_CONFIG_TOKEN, DB_CONFIG_TOKEN } from "./constants/config";

export interface Configurations {
  [APP_CONFIG_TOKEN]: AppConfig;
  [DB_CONFIG_TOKEN]: DatabaseConfig;
}
