# Internationalization

`InternationalizationModule` (`core/internationalization/`) wraps
`nestjs-i18n`.

## Locale resolution

Tried in order (`resolvers` in `internationalization.module.ts`):

1. `?lang=` query parameter
2. `Accept-Language` header
3. `x-lang` header

Falling back to `APP_FALLBACK_LANGUAGE` (`.env`, default `en`) if none
resolve to a known locale.

## Translation files

Live under `src/core/internationalization/i18n/<locale>/<namespace>.json`,
e.g. `i18n/en/app.json`:

```json
{ "ok": "Ok!" }
```

Referenced as `app.ok` — namespace (filename) + key.

## Using translations

```ts
constructor(private readonly i18n: I18nService) {}
this.i18n.t("app.ok");
```

See `AppService.getOk()` for this exact pattern, combined with the request
context to return `{ requestId, message }`.

## Adding a new locale

1. Create `i18n/<locale>/` mirroring the existing namespace files (same
   keys, translated values).
2. No registration step needed — the loader (`loaderOptions.path`)
   auto-discovers locale directories.
3. Locale resolution (above) picks it up automatically once a request
   asks for it by code.

## Adding a new translation key

1. Add the key to the relevant namespace file in **every** locale
   directory you support (keep them in sync — nothing enforces this for
   you).
2. Regenerate the typed accessor: the module's `typesOutputPath` writes
   `src/generated/i18n.generated.ts` automatically (`watch: true` in dev)
   — this file is **generated, not hand-edited** (`DO NOT EDIT` at the
   top of the file). It gives you compile-time checking on translation
   keys (`I18nPath`) instead of typo-prone raw strings.
3. If it's not regenerating in your editor, restart `start:dev` — the
   watcher runs inside the Nest process.

## Namespacing convention

One file per logical domain (`app.json` for app-wide strings) rather than
one giant `common.json` — as the app grows, add
`i18n/<locale>/<your-domain>.json` following the same pattern, keeping
keys scoped to where they're used.
