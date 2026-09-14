export function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function seededValue(seed: number, step: number): number {
  let value = (seed + Math.imul(step + 1, 0x6d2b79f5)) >>> 0;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
}

export function pickSeeded<T>(items: readonly T[], seed: number, count: number): T[] {
  return [...items]
    .map((item, index) => ({
      item,
      rank: seededValue(seed, index),
    }))
    .sort((left, right) => left.rank - right.rank)
    .slice(0, count)
    .map(({ item }) => item);
}
