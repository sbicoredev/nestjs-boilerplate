import { AppConfig } from "~/configs/app.config";

import { APP_CONFIG_TOKEN } from "./constants/config";

export interface Configurations {
  [APP_CONFIG_TOKEN]: AppConfig;
}
