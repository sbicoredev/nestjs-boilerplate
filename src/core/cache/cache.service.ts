import util from "node:util";

import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Cache } from "cache-manager";

import type { CacheParam } from "./cache.type";
import { CacheKey } from "./constants";

@Injectable()
export class CacheService {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly configService: ConfigService<Configurations>
  ) {}

  get<T>(keyParams: CacheParam) {
    return this.cacheManager.get<T>(this._constructCacheKey(keyParams));
  }

  async set(
    keyParams: CacheParam,
    value: unknown,
    options?: {
      /** In milliseconds */
      ttl?: number;
    }
  ): Promise<{ key: string }> {
    const key = this._constructCacheKey(keyParams);
    await this.cacheManager.set(key, value, options?.ttl);
    return { key };
  }

  async del(keyParams: CacheParam): Promise<{ key: string }> {
    const key = this._constructCacheKey(keyParams);
    await this.cacheManager.del(key);
    return { key };
  }

  async wrap<T>(
    keyParams: CacheParam,
    cb: () => Promise<T> | T,
    options?: {
      /** In milliseconds */
      ttl?: number;
    }
  ) {
    const key = this._constructCacheKey(keyParams);
    return await this.cacheManager.wrap(key, cb, options?.ttl);
  }

  /**
   * Return remaining TTL of a key.
   * By default, returns null for non-existent or non-expiring keys.
   *
   * Raw TTL values (if disableResponseFilter is true):
   * -1: Key exists but has no expiry.
   * -2: Key does not exist.
   */
  async getTtl(
    keyParams: CacheParam,
    options?: { disableResponseFilter?: false }
  ): Promise<number | null> {
    const ttl = await this.cacheManager.ttl(this._constructCacheKey(keyParams));
    if (!options?.disableResponseFilter && [-1, -2].includes(ttl || -2)) {
      return null;
    }
    return ttl ?? null;
  }

  /**
   * Helper to construct cache key with prefix and arguments.
   */
  private _constructCacheKey(keyParams: CacheParam): string {
    const prefix = this.configService.get("app.prefix", { infer: true });
    const cacheKey = util.format(
      `${prefix}:${CacheKey[keyParams.key]}`,
      ...(keyParams.args ?? [])
    );
    return cacheKey;
  }
}
