// Normalizes Arabic/Persian numerals and separators to ASCII so the same
// parsing logic works for English and Arabic bank messages.

const ARABIC_INDIC_OFFSET = 0x0660; // ٠..٩
const PERSIAN_OFFSET = 0x06f0; // ۰..۹

export function normalizeDigits(input: string): string {
  let out = '';
  for (const ch of input) {
    const code = ch.codePointAt(0)!;
    if (code >= ARABIC_INDIC_OFFSET && code <= ARABIC_INDIC_OFFSET + 9) {
      out += String(code - ARABIC_INDIC_OFFSET);
    } else if (code >= PERSIAN_OFFSET && code <= PERSIAN_OFFSET + 9) {
      out += String(code - PERSIAN_OFFSET);
    } else if (ch === '٫') {
      out += '.'; // Arabic decimal separator
    } else if (ch === '٬') {
      out += ','; // Arabic thousands separator
    } else {
      out += ch;
    }
  }
  return out;
}

const ARABIC_LETTERS = /[؀-ۿ]/;
const LATIN_LETTERS = /[A-Za-z]/;

export function detectLanguage(input: string): 'en' | 'ar' | 'mixed' {
  const hasAr = ARABIC_LETTERS.test(input);
  const hasEn = LATIN_LETTERS.test(input);
  if (hasAr && hasEn) return 'mixed';
  if (hasAr) return 'ar';
  return 'en';
}
