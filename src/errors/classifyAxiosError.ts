/**
 * Pure classifier that converts an AxiosError-shaped object into a
 * stable {@link ClassifiedError}.
 *
 * The package has zero `axios` dependency. We accept a structural type
 * (`AxiosErrorLike`) so consumers using axios pass real AxiosErrors, and a
 * future fetch-only consumer can adapt fetch errors to the same shape.
 */
import { extractErrorCode } from '../utils/extractErrorCode';
import { extractErrorMessage } from '../utils/extractErrorMessage';
import { extractRequestId } from '../utils/extractRequestId';
import { HttpMethod } from '../types/HttpMethod';

import type { ClassifiedError } from '../types/ClassifiedError';

/** Error code Axios uses for request timeouts. */
const TIMEOUT_ERROR_CODE = 'ECONNABORTED';
/** Status code representing a network error (no response received). */
const NETWORK_ERROR_STATUS = 0;

/** Structural shape we need from an AxiosError. */
export interface AxiosErrorLike {
  message?: string;
  code?: string;
  config?: { url?: string; method?: string };
  response?: {
    status: number;
    data?: unknown;
    headers?: unknown;
  };
}

const VALID_HTTP_METHODS: Record<string, HttpMethod | undefined> = {
  GET: HttpMethod.Get,
  POST: HttpMethod.Post,
  PUT: HttpMethod.Put,
  PATCH: HttpMethod.Patch,
  DELETE: HttpMethod.Delete,
};

function resolveStatus(error: AxiosErrorLike): number {
  if (error.response !== undefined) {return error.response.status;}
  return NETWORK_ERROR_STATUS;
}

function resolveHttpMethod(error: AxiosErrorLike): HttpMethod {
  const method = (error.config?.method ?? '').toUpperCase();
  return VALID_HTTP_METHODS[method] ?? HttpMethod.Get;
}

function resolveMessage(error: AxiosErrorLike): string {
  const fallback = error.message ?? '';
  return extractErrorMessage(error.response?.data, fallback);
}

/**
 * Convert an AxiosError-shaped object into a {@link ClassifiedError}.
 */
export function classifyAxiosError(error: AxiosErrorLike): ClassifiedError {
  const errorCode = extractErrorCode(error.response?.data);
  const timeoutCode = error.code === TIMEOUT_ERROR_CODE ? TIMEOUT_ERROR_CODE : undefined;

  return {
    status: resolveStatus(error),
    url: error.config?.url ?? '',
    method: resolveHttpMethod(error),
    errorCode: errorCode ?? timeoutCode,
    message: resolveMessage(error),
    body: error.response?.data,
    originalError: error,
    timestamp: Date.now(),
    requestId: extractRequestId(error.response?.headers),
  };
}
