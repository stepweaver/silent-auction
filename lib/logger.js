/**
 * Server-side logger. In development logs full details; in production logs
 * short messages only (no stack to client). Use for API routes and server code.
 */

function isDev() {
  return process.env.NODE_ENV === 'development';
}

/**
 * Log an error. In dev: full message and stack. In prod: message only (safe for server logs).
 * @param {string} message - Short description (e.g. "Bid insert failed")
 * @param {Error|object} [err] - Error or details object
 */
export function logError(message, err = null) {
  if (isDev()) {
    if (err instanceof Error) {
      console.error(message, err.message, err.stack);
    } else if (err != null) {
      console.error(message, err);
    } else {
      console.error(message);
    }
  } else {
    const detail = err instanceof Error ? err.message : (err && typeof err === 'object' ? JSON.stringify(err) : String(err));
    console.error(message, detail || '');
  }
}

/**
 * Log a warning. Same behavior as logError for dev vs prod.
 */
export function logWarn(message, err = null) {
  if (isDev()) {
    if (err != null) console.warn(message, err);
    else console.warn(message);
  } else {
    const detail = err instanceof Error ? err.message : (err != null ? String(err) : '');
    console.warn(message, detail || '');
  }
}
