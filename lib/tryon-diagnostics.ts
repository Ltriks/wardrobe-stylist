// Only diagnostic fields are serialized; never log request bodies or response images.
export type TryOnDetails = {
  stage?: string; outfitId?: string; profileId?: string; model?: string;
  endpoint?: string; protocol?: string; httpStatus?: number; code?: string;
  requestId?: string; taskId?: string; taskStatus?: string;
};
const detailKeys = ['stage', 'outfitId', 'profileId', 'model', 'endpoint', 'protocol', 'httpStatus', 'code', 'requestId', 'taskId', 'taskStatus'] as const;
type DiagnosticError = Error & { diagnostics?: TryOnDetails; cause?: unknown; code?: string; status?: number };

export function redactTryOnText(text: string, secrets: string[] = []) {
  let result = text;
  for (const secret of secrets.filter(Boolean)) result = result.split(secret).join('[REDACTED]');
  return result
    .replace(/data:[^\s,;]+(?:;[^,]*)?,[^\s"'<>]+/gi, '[IMAGE DATA REDACTED]')
    .replace(/\bBearer\s+[^\s"',;]+/gi, 'Bearer [REDACTED]')
    .replace(/\bsk-[a-zA-Z0-9_-]+/g, '[REDACTED]')
    .replace(/((?:api[_-]?key|access[_-]?token|authorization)["']?\s*[:=]\s*["']?)[^\s"',;}]+/gi, '$1[REDACTED]')
    .replace(/https?:\/\/[^\s"'<>]+/gi, value => {
      try { const url = new URL(value); return `${url.origin}${url.pathname}${url.search ? '?[REDACTED]' : ''}`; }
      catch { return '[URL REDACTED]'; }
    })
    .replace(/[A-Za-z0-9+/=_-]{128,}/g, '[LONG DATA REDACTED]')
    .slice(0, 6000);
}

export function safeTryOnError(error: unknown, details: TryOnDetails = {}, secrets: string[] = [], depth = 0): DiagnosticError {
  const original: DiagnosticError = error instanceof Error ? error as DiagnosticError : new Error(typeof error === 'string' ? error : '试穿生成失败。');
  const safe = new Error(redactTryOnText(original.message, secrets)) as DiagnosticError;
  safe.name = redactTryOnText(original.name, secrets);
  safe.stack = original.stack ? redactTryOnText(original.stack, secrets) : undefined;
  const merged = { ...details, ...original.diagnostics };
  safe.diagnostics = {};
  for (const key of detailKeys) {
    const value = merged[key];
    if (typeof value === 'string') Object.assign(safe.diagnostics, { [key]: redactTryOnText(value, secrets) });
    else if (typeof value === 'number') Object.assign(safe.diagnostics, { [key]: value });
  }
  if (typeof original.code === 'string') safe.code = redactTryOnText(original.code, secrets);
  if (typeof original.status === 'number') safe.status = original.status;
  if (original.cause && depth < 2) safe.cause = safeTryOnError(original.cause, {}, secrets, depth + 1);
  return safe;
}

export function logTryOnError(event: string, error: unknown, details: TryOnDetails = {}) {
  const safe = safeTryOnError(error, details);
  console.error(`[try-on] ${event}`, {
    time: new Date().toISOString(), ...safe.diagnostics,
    name: safe.name, message: safe.message, stack: safe.stack,
    code: safe.code || safe.diagnostics?.code, httpStatus: safe.status || safe.diagnostics?.httpStatus,
    ...(safe.cause ? { cause: safe.cause } : {}),
  });
}
