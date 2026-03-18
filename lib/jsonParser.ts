/**
 * Robust JSON parser with multiple fallback strategies.
 * Handles malformed JSON from LLM responses (trailing commas,
 * unescaped newlines inside strings, extra text, code-fences, etc.)
 */
import { callClaude } from './claude';

/* ── 1. Extract the JSON block from raw LLM text ─────────── */
export function extractJsonBlock(text: string): string | null {
  // Strip leading/trailing whitespace
  const t = text.trim();

  // Try ```json ... ``` or ``` ... ``` code fences
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) return fence[1].trim();

  // Find outermost { }
  const objStart = t.indexOf('{');
  const objEnd   = t.lastIndexOf('}');
  if (objStart !== -1 && objEnd > objStart) return t.slice(objStart, objEnd + 1);

  // Find outermost [ ]
  const arrStart = t.indexOf('[');
  const arrEnd   = t.lastIndexOf(']');
  if (arrStart !== -1 && arrEnd > arrStart) return t.slice(arrStart, arrEnd + 1);

  return null;
}

/* ── 2. Repair common JSON errors ────────────────────────── */
export function repairJson(raw: string): string {
  // 2a. Fix unescaped control characters inside string values
  //     by walking the string character-by-character
  raw = fixControlCharsInStrings(raw);

  // 2b. Remove trailing commas before ] or }
  raw = raw.replace(/,(\s*[}\]])/g, '$1');

  // 2c. Replace smart/curly quotes with straight quotes
  raw = raw.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'");

  return raw;
}

function fixControlCharsInStrings(str: string): string {
  let result = '';
  let inString = false;
  let escaped  = false;

  for (let i = 0; i < str.length; i++) {
    const ch   = str[i];
    const code = ch.charCodeAt(0);

    if (escaped) {
      result  += ch;
      escaped  = false;
      continue;
    }

    if (ch === '\\' && inString) {
      result  += ch;
      escaped  = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      result  += ch;
      continue;
    }

    if (inString && code < 0x20) {
      // Replace raw control chars with their JSON escape sequences
      if      (ch === '\n') result += '\\n';
      else if (ch === '\r') result += '\\r';
      else if (ch === '\t') result += '\\t';
      else                  result += `\\u${code.toString(16).padStart(4, '0')}`;
      continue;
    }

    result += ch;
  }

  return result;
}

/* ── 3. Master parse function with 4-level fallback ─────── */
export async function parseJsonWithFallback<T>(
  rawText: string,
  apiKey?: string,
  label = 'API response',
): Promise<T> {

  // Level 1 — direct parse
  try { return JSON.parse(rawText) as T; } catch { /* next */ }

  // Level 2 — extract then parse
  const extracted = extractJsonBlock(rawText);
  if (extracted) {
    try { return JSON.parse(extracted) as T; } catch { /* next */ }

    // Level 3 — extract + repair then parse
    const repaired = repairJson(extracted);
    try { return JSON.parse(repaired) as T; } catch { /* next */ }
  }

  // Level 4 — ask Claude to fix the JSON (only if we have an API key)
  if (apiKey) {
    try {
      const fixPrompt = `The following text is supposed to be valid JSON but has formatting errors. \
Fix ALL errors and return ONLY the corrected JSON — no explanations, no code fences:\n\n${extracted ?? rawText}`;
      const fixed     = await callClaude(fixPrompt, undefined, apiKey);
      const extracted2 = extractJsonBlock(fixed);
      if (extracted2) {
        return JSON.parse(repairJson(extracted2)) as T;
      }
    } catch { /* fall through */ }
  }

  throw new Error(`JSON 解析失败 (${label}) — 请重试`);
}
