// Error type with a flag the UI uses to show "backend not connected" instead of a generic failure.
export class ApiError extends Error {
  constructor(message, { status = 0, pending = false } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.pending = pending; // true = backend unreachable / endpoint not implemented yet
  }
}
