import type { CacheKey } from "./constants.js";

export type CacheParam = { key: keyof typeof CacheKey; args?: string[] };
