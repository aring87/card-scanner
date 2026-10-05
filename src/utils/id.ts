let counter = 0;

/**
 * Locally unique, roughly time-sortable id (e.g. `scan_lx2k9a_0007_q3v8`). Good enough for an
 * offline single-device store; swap for UUIDv7 if/when records sync to a server.
 */
export function createId(prefix: string): string {
  counter = (counter + 1) % 10000;
  const time = Date.now().toString(36);
  const seq = counter.toString(36).padStart(4, '0');
  const rand = Math.floor(Math.random() * 36 ** 4)
    .toString(36)
    .padStart(4, '0');
  return `${prefix}_${time}_${seq}_${rand}`;
}
