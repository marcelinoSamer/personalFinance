/**
 * Deterministic, synchronous hash (FNV-1a) of sender+body used to skip SMS
 * that were already imported. Collisions are acceptable for personal dedup.
 */
export function dedupHash(sender: string, body: string): string {
  const s = `${sender.trim()}|${body.trim()}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `${(h >>> 0).toString(16)}-${s.length.toString(16)}`;
}
