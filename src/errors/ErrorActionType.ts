/** Action types the error system can take in response to errors. */
export const enum ErrorActionType {
  Toast = 'toast',
  Modal = 'modal',
  Redirect = 'redirect',
  Silent = 'silent',
  Retry = 'retry',
  Custom = 'custom',
}
