/**
 * HTTP methods supported across the dloizides.com portfolio APIs.
 *
 * Each exported enum lives in its own file (per the module-structure
 * convention enforced by the consumer ESLint rules). Values are uppercase
 * to match what fetch / axios / FastEndpoints all emit on the wire.
 */
export const enum HttpMethod {
  Get = 'GET',
  Post = 'POST',
  Put = 'PUT',
  Patch = 'PATCH',
  Delete = 'DELETE',
}
