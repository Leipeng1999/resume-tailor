/**
 * Synchronous JSON parser with multiple fallback strategies.
 * Use this for quick parsing when an async Claude-fix fallback is not needed.
 * For the full async 4-level fallback (including asking Claude to fix JSON),
 * use parseJsonWithFallback from lib/jsonParser.ts instead.
 */

export function safeParseJSON(text: string): unknown {
  // 1. Direct parse
  try { return JSON.parse(text); } catch { /* next */ }

  // 2. Strip markdown code-block fences
  let cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  try { return JSON.parse(cleaned); } catch { /* next */ }

  // 3. Extract outermost { ... }
  const start = cleaned.indexOf('{');
  const end   = cleaned.lastIndexOf('}');
  if (start !== -1 && end !== -1) {
    try { return JSON.parse(cleaned.slice(start, end + 1)); } catch { /* next */ }
  }

  // 4. Extract outermost [ ... ]
  const aStart = cleaned.indexOf('[');
  const aEnd   = cleaned.lastIndexOf(']');
  if (aStart !== -1 && aEnd !== -1) {
    try { return JSON.parse(cleaned.slice(aStart, aEnd + 1)); } catch { /* next */ }
  }

  // 5. Fix trailing commas before ] or }
  cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');
  try { return JSON.parse(cleaned); } catch { /* next */ }

  // 6. All attempts failed
  throw new Error('JSON 解析失败');
}
