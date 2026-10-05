import { findSerialNumbers, formatSerialNumber, parseSerialNumber } from '@/features/recognition/serial/parseSerialNumber';
import { SerialNumberSchema } from '@/models';

describe('parseSerialNumber', () => {
  it.each([
    ['23/50', 23, 50, 2],
    ['004/199', 4, 199, 3],
    ['4/10', 4, 10, 1],
    ['1/1', 1, 1, 1],
    ['099/150', 99, 150, 3],
  ])('parses %s', (text, number, printRun, printedDigits) => {
    const serial = parseSerialNumber(text);
    expect(serial).toMatchObject({ number, printRun, printedDigits, normalized: `${number}/${printRun}` });
    expect(serial?.isOneOfOne).toBe(printRun === 1);
    expect(serial?.confidence).toBeGreaterThanOrEqual(0.9);
    expect(SerialNumberSchema.safeParse(serial).success).toBe(true);
  });

  it('finds a serial number inside surrounding OCR text', () => {
    const serial = parseSerialNumber('© 2026 THE TOPPS COMPANY, INC. CARD 101 23/50 PRINTED IN USA');
    expect(serial?.normalized).toBe('23/50');
    expect(serial?.raw).toBe('23/50');
  });

  it('accepts common prefixes such as # and No.', () => {
    expect(parseSerialNumber('#23/50')?.normalized).toBe('23/50');
    expect(parseSerialNumber('No. 04/10')?.normalized).toBe('4/10');
  });

  it('tolerates whitespace and unicode slashes with slightly lower confidence', () => {
    const spaced = parseSerialNumber('23 / 50');
    const unicode = parseSerialNumber('23／50');
    expect(spaced?.normalized).toBe('23/50');
    expect(unicode?.normalized).toBe('23/50');
    expect(spaced!.confidence).toBeLessThan(parseSerialNumber('23/50')!.confidence);
  });

  it('accepts "1 of 1" phrasing', () => {
    expect(parseSerialNumber('1 of 1')).toMatchObject({ number: 1, printRun: 1, isOneOfOne: true });
  });

  it('corrects common OCR confusions (O→0, l/I→1) with reduced confidence', () => {
    const serial = parseSerialNumber('O4/1O');
    expect(serial?.normalized).toBe('4/10');
    expect(serial!.confidence).toBeLessThan(0.9);
    expect(parseSerialNumber('l/1')?.normalized).toBe('1/1');
  });

  it.each([
    ['dates', '12/31/2026'],
    ['number above print run', '51/50'],
    ['zero serial', '0/50'],
    ['zero print run', '5/0'],
    ['season years', '2025/26'],
    ['implausible print run', '1/99999'],
    ['letters only', 'Il/OO'],
    ['embedded in a word', 'ABC23/50'],
    ['no serial at all', 'TOPPS FLAGSHIP FOOTBALL'],
    ['empty text', ''],
  ])('rejects %s', (_label, text) => {
    expect(parseSerialNumber(text)).toBeNull();
  });

  it('ignores serial-like text glued to a word but finds it once separated', () => {
    expect(parseSerialNumber('NO23/50')).toBeNull();
    expect(parseSerialNumber('SERIAL NO. 23/50')?.normalized).toBe('23/50');
  });

  it('keeps scanning after rejecting a date-like match', () => {
    expect(parseSerialNumber('ISSUED 5/12/31 · 23/50')?.normalized).toBe('23/50');
  });

  it('returns every candidate ordered by confidence', () => {
    const all = findSerialNumbers('O4/1O and 23/50');
    expect(all.map((s) => s.normalized)).toEqual(['23/50', '4/10']);
  });

  it('formats a serial number', () => {
    expect(formatSerialNumber({ number: 4, printRun: 199 })).toBe('4/199');
  });
});
