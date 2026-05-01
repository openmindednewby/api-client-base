import type { ErrorSeverity } from '../errors/ErrorSeverity';

/** Toast notification event. */
export interface ToastEvent {
  type: 'toast';
  severity: ErrorSeverity;
  message: string;
  duration?: number;
}

/** Modal dialog event. */
export interface ModalEvent {
  type: 'modal';
  modalComponent: string;
  message: string;
  severity: ErrorSeverity;
  data?: Record<string, unknown>;
}

/** Navigation redirect event. */
export interface RedirectEvent {
  type: 'redirect';
  target: string;
  message?: string;
}

/** Session expired event (triggers logout flow). */
export interface SessionExpiredEvent {
  type: 'session-expired';
}

/** Maintenance mode event (shows maintenance UI). */
export interface MaintenanceModeEvent {
  type: 'maintenance-mode';
  estimatedEnd?: string;
}

/** Union of all API events that can be emitted. */
export type ApiEvent =
  | ToastEvent
  | ModalEvent
  | RedirectEvent
  | SessionExpiredEvent
  | MaintenanceModeEvent;

/** All possible API event type discriminators. */
export type ApiEventType = ApiEvent['type'];
