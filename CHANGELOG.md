# Changelog

All notable changes to `@dloizides/api-client-base` are documented here.

## [1.1.0] - 2026-09-06

### Fixed
- **A write verb now declares AND carries JSON even with no body.** `buildHeaders` set
  `Content-Type` only when a body was present, so a body-less `POST`/`PUT`/`PATCH`/`DELETE`
  went out with no content type — the 415 trap. `buildBody` now returns `{}` for a body-less
  write, because declaring JSON while carrying nothing is the same failure one step along
  ("a non-empty request body is required").

  Runtime-typed bodies (FormData / Blob / ArrayBuffer / URLSearchParams) are unchanged and
  are never stamped — the runtime must set `multipart/form-data` plus the boundary itself.

  This mirrors the guard in `@dloizides/bff-web-client` v1.3.0, which hit the same class for
  a different reason (axios strips `Content-Type` when `data` is undefined). Two tests that
  asserted `body === undefined` for a body-less POST were asserting the defect and have been
  corrected.

  See `BaseClient/docs/code-standards/evidence-and-gates.md`.

