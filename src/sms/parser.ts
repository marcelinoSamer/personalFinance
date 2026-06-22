import { extract } from './extractor';
import { applyTemplate, senderMatches } from './templates';
import type { ParsedSms } from './types';
import type { SmsTemplate } from '@/db/schema';

/**
 * Parses a bank SMS: runs the generic extractor, then the first matching
 * enabled template (by sender) to override/fill fields.
 */
export function parseSms(rawText: string, sender: string, templates: SmsTemplate[] = []): ParsedSms {
  const base = extract(rawText);
  for (const tpl of templates) {
    if (!tpl.enabled) continue;
    if (!senderMatches(tpl.sender_match, sender)) continue;
    const applied = applyTemplate(base, rawText, tpl);
    if (applied) return applied;
  }
  return base;
}

export { extract } from './extractor';
export type { ParsedSms } from './types';
