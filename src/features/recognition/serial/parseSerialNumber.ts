import type { SerialNumber } from '@/models';

/** Characters OCR commonly confuses with digits on small serial-number foil stamps. */
const OCR_DIGIT_SUBSTITUTIONS: Record<string, string> = {
  O: '0',
  o: '0',
  I: '1',
  l: '1',
  '|': '1',
};

const SLASH_VARIANTS = /[⁄∕／\\]/g; // ⁄ ∕ ／ and backslash
const DIGITISH = '[0-9OoIl|]';
const SERIAL_PATTERN = new RegExp(
  `(${DIGITISH}{1,4})[ \\t]*(\\/|of|OF|Of)[ \\t]*(${DIGITISH}{1,4})`,
  'g',
);

/** Upper bound on plausible print runs; also rejects years such as "2026/27" being read as serials. */
export const MAX_PRINT_RUN = 9999;

function isBoundaryChar(char: string | undefined): boolean {
  return char === undefined || !/[A-Za-z0-9/]/.test(char);
}

function toDigits(group: string): { digits: string; substituted: boolean } {
  let substituted = false;
  const digits = Array.from(group)
    .map((char) => {
      const replacement = OCR_DIGIT_SUBSTITUTIONS[char];
      if (replacement !== undefined) {
        substituted = true;
        return replacement;
      }
      return char;
    })
    .join('');
  return { digits, substituted };
}

function hasRealDigit(group: string): boolean {
  return /[0-9]/.test(group);
}

/**
 * Finds every plausible serial number (e.g. "23/50", "004/199", "4/10", "1/1", "1 of 1") in a
 * block of OCR text. Results are sorted by confidence (highest first), then by position.
 */
export function findSerialNumbers(text: string): SerialNumber[] {
  const source = text.replace(SLASH_VARIANTS, '/');
  const results: { serial: SerialNumber; index: number }[] = [];
  const regex = new RegExp(SERIAL_PATTERN.source, 'g');

  let match: RegExpExecArray | null;
  while ((match = regex.exec(source)) !== null) {
    const [raw, numberGroup = '', separator = '', printRunGroup = ''] = match;
    const start = match.index;
    const end = start + raw.length;

    const accept = (): SerialNumber | null => {
      if (!isBoundaryChar(source[start - 1]) || !isBoundaryChar(source[end])) return null;
      // At least one genuine digit, so words like "Il/OO" are not read as serials but "l/1" (1/1) is.
      if (!hasRealDigit(numberGroup + printRunGroup)) return null;

      const num = toDigits(numberGroup);
      const run = toDigits(printRunGroup);
      const number = Number.parseInt(num.digits, 10);
      const printRun = Number.parseInt(run.digits, 10);
      if (!Number.isFinite(number) || !Number.isFinite(printRun)) return null;
      if (number < 1 || printRun < 1 || number > printRun || printRun > MAX_PRINT_RUN) return null;

      let confidence = 0.95;
      if (num.substituted || run.substituted) confidence -= 0.15;
      if (separator.toLowerCase() === 'of') confidence -= 0.1;
      if (/\s/.test(raw)) confidence -= 0.05;
      if (num.digits.length > run.digits.length) confidence -= 0.1;

      return {
        raw,
        normalized: `${number}/${printRun}`,
        number,
        printRun,
        printedDigits: num.digits.length,
        isOneOfOne: printRun === 1,
        confidence: Math.max(0.05, Number(confidence.toFixed(2))),
      };
    };

    const serial = accept();
    if (serial) {
      results.push({ serial, index: start });
    } else {
      // Retry from the next character so a rejected overlapping match (e.g. "NO23/50") can't hide a valid one.
      regex.lastIndex = start + 1;
    }
  }

  return results
    .sort((a, b) => b.serial.confidence - a.serial.confidence || a.index - b.index)
    .map((r) => r.serial);
}

/** Returns the single most plausible serial number in the text, or null. */
export function parseSerialNumber(text: string): SerialNumber | null {
  return findSerialNumbers(text)[0] ?? null;
}

export function formatSerialNumber(serial: Pick<SerialNumber, 'number' | 'printRun'>): string {
  return `${serial.number}/${serial.printRun}`;
}
