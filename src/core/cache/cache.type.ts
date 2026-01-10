import type { CacheKey } from "./constants";

export type CacheParam = { key: keyof typeof CacheKey; args?: string[] };
