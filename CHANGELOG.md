# Changelog

## 1.0.0 — 2026-05-01

Initial production release. Phase 1 of the Questioner / OnlineMenu product split.

### Added

- **`ApiClient`** — realm-agnostic, product-agnostic fetch wrapper. Takes
  `baseUrl`, `defaultHeaders`, `timeoutMs`, and an optional `getAccessToken`
  callback. JSON-by-default request bodies (auto-stringified), pass-through for
  `FormData` / `Blob` / `ArrayBuffer` / `URLSearchParams`. Throws `ApiError`
  on non-2xx with envelope-extracted `status`, `code`, `message`, and `details`.
- **`ApiError`** — `instanceof`-safe `Error` subclass carrying the normalised
  envelope.
- **Event bus** — `ApiEventBus` class + singleton `apiEventBus`. Typed event
  union: `ToastEvent`, `ModalEvent`, `RedirectEvent`, `SessionExpiredEvent`,
  `MaintenanceModeEvent`. Listener errors are silently swallowed so one broken
  listener cannot affect others.
- **Error registry** — declarative, priority-sorted rule store with the dozen
  default rules used across the portfolio (feature-gated 403, maintenance 503,
  session-expired 401, validation 400/422, conflict 409, rate-limited 429,
  bad-gateway 502/504, server 5xx with monitoring, network-offline,
  request-timeout). `setLoginRedirectPath` overrides the session-expired
  redirect target.
- **Matcher** — `matchError`, `matchesRule`, `matchesStatus` (number | array |
  range), `matchesPath` (string substring | RegExp), `matchesMethod`.
- **Pure classifier** — `classifyAxiosError(AxiosErrorLike)` produces a
  `ClassifiedError` from a duck-typed error. No `axios` dependency.
- **Pure helpers** — `extractErrorCode`, `extractErrorMessage`,
  `extractRequestId`, `isRecord`.
- **Const enums** — `HttpMethod`, `ErrorActionType`, `ErrorSeverity` each in
  their own file (per the portfolio module-structure convention).

### Tests

- 116 unit tests, **100% statements / branches / functions / lines**.
- ESLint zero-warnings under `@typescript-eslint/recommended-requiring-type-checking`
  and `sonarjs/recommended-legacy`.

### Composition

The package never imports `@dloizides/auth-client`. The two pair through the
`getAccessToken` callback, keeping them composable rather than coupled.
