# @dloizides/api-client-base

Realm-agnostic, product-agnostic HTTP plumbing for the dloizides.com portfolio.

Built for the Questioner / OnlineMenu product split (and any future products): a
single fetch wrapper, a uniform error envelope shape, a typed event bus for
bridging interceptor-layer signals to UI components, and a declarative error
registry that maps HTTP statuses + body codes to UI actions.

This package never references a specific product, realm, or hardcoded URL.
Consumers supply their own `baseUrl` and pair the client with `@dloizides/auth-client`
through the `getAccessToken` callback — the two packages compose without
importing each other.

## Install

```sh
npm install @dloizides/api-client-base
```

## Quick start

```ts
import { ApiClient, ApiError } from '@dloizides/api-client-base';
import { AuthClient } from '@dloizides/auth-client';

const auth = new AuthClient(
  { baseUrl: 'https://identity.example.com', realm: 'questioner', clientId: 'web' },
  storage,
);

const api = new ApiClient({
  baseUrl: 'https://api.questioner.com',
  defaultHeaders: { 'X-Tenant-Id': tenantId },
  getAccessToken: () => auth.getAccessToken(),
});

try {
  const user = await api.get<{ id: string }>('/users/me');
} catch (err) {
  if (err instanceof ApiError && err.status === 401) {
    // token expired — your interceptor or refresh layer handles it
  }
}
```

## What's in the box

| Surface | Purpose |
|---|---|
| `ApiClient` | fetch-based client. JSON-by-default, throws `ApiError` on non-2xx. |
| `ApiError` / `ApiErrorEnvelope` | uniform error shape (`status`, `code`, `message`, `details`). |
| `apiEventBus` / `ApiEventBus` | typed pub/sub bridging interceptor layer to UI. |
| `ErrorActionType` / `ErrorSeverity` | enums for the registry's UI actions. |
| `getErrorRules` / `registerErrorRule` / `resetErrorRules` | mutable, priority-sorted rule registry. |
| `setLoginRedirectPath` / `resetLoginRedirectPath` | override the `session-expired` redirect target. |
| `matchError` / `matchesRule` / `matchesStatus` / `matchesPath` / `matchesMethod` | matcher engine. |
| `classifyAxiosError` | pure classifier on a duck-typed `AxiosErrorLike`. No `axios` dependency. |
| `extractErrorCode` / `extractErrorMessage` / `extractRequestId` | pure helpers for FastEndpoints / ProblemDetails envelopes. |

## Composition with `@dloizides/auth-client`

The `getAccessToken` callback is the only contract — this package never imports
`auth-client`, and `auth-client` never imports this package. Wire them up at the
application bootstrap:

```ts
const auth = new AuthClient({ baseUrl, realm, clientId }, new BrowserStorageTokenStorage());
const api = new ApiClient({
  baseUrl: API_BASE_URL,
  getAccessToken: () => auth.getAccessToken(),
});
```

## Custom error rules

The default registry covers the common HTTP errors (401 session-expired,
402 payment-required modal, 403 forbidden toast, 422 validation, 5xx server
errors, etc.). Add app-specific rules at any time:

```ts
import {
  registerErrorRule,
  ErrorActionType,
  ErrorSeverity,
  PRIORITY_ROUTE_SPECIFIC,
} from '@dloizides/api-client-base';

registerErrorRule({
  name: 'team-deleted',
  match: { status: 410, path: '/teams' },
  action: {
    type: ErrorActionType.Modal,
    severity: ErrorSeverity.Warning,
    modalComponent: 'TeamDeletedModal',
  },
  messageKey: 'errors.teamDeleted',
  priority: PRIORITY_ROUTE_SPECIFIC,
});
```

## License

MIT © dloizides.com
