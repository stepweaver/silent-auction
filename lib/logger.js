/**
 * Server-side logger. In development logs full details; in production logs
 * short messages only (no stack to client). Use for API routes and server code.
 * PII helpers mask email/phone in logs to avoid exposing in aggregators.
 */

function isDev() {
  return process.env.NODE_ENV === 'development';
}

/**
 * Mask email for logging: show first 2 chars + *** + @domain (e.g. jo***@example.com).
 * @param {string} email
 * @returns {string}
 */
export function maskEmail(email) {
  if (!email || typeof email !== 'string') return '***';
  const at = email.indexOf('@');
  if (at <= 0) return '***';
  const local = email.slice(0, at);
  const domain = email.slice(at);
  if (local.length <= 2) return '***' + domain;
  return local.slice(0, 2) + '***' + domain;
}

/**
 * Mask phone for logging: show last 4 digits only (e.g. ***-***-1234).
 * @param {string} phone
 * @returns {string}
 */
export function maskPhone(phone) {
  if (!phone || typeof phone !== 'string') return '***';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '***';
  return '***-**-' + digits.slice(-4);
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

/**
 * Log an info message. In prod, avoid logging PII; pass masked values or omit.
 * @param {string} message
 * @param {object} [context] - Optional safe context (use maskEmail/maskPhone for PII)
 */
export function logInfo(message, context = null) {
  if (context != null && typeof context === 'object') {
    console.log(message, context);
  } else {
    console.log(message);
  }
}
