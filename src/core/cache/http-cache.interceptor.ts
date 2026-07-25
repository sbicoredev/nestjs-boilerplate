import { CacheInterceptor } from "@nestjs/cache-manager";
import { ExecutionContext, Injectable } from "@nestjs/common";

import { SKIP_CACHE_METADATA } from "~/common/decorators/skip-cache.decorator";

/**
 * Extends the stock CacheInterceptor with one behavior change: routes (or
 * whole controllers) marked with @SkipCache() are never cached, regardless
 * of method/URL. Everything else falls back to the default behavior
 * (GET-only, keyed by the full request URL).
 *
 * This is registered in place of the plain CacheInterceptor as the global
 * APP_INTERCEPTOR in core/cache/cache.module.ts.
 */
@Injectable()
export class HttpCacheInterceptor extends CacheInterceptor {
  protected override trackBy(
    context: ExecutionContext
  ): Promise<string | undefined | null> | string | undefined | null {
    const skipCache =
      this.reflector.get<boolean>(SKIP_CACHE_METADATA, context.getHandler()) ??
      this.reflector.get<boolean>(SKIP_CACHE_METADATA, context.getClass());

    if (skipCache) {
      return;
    }

    return super.trackBy(context);
  }
}
