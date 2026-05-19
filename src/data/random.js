export function createRng(seed = "default") {
  let state = hashSeed(String(seed));

  return {
    next() {
      state += 0x6d2b79f5;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    },
    int(min, max) {
      return Math.floor(this.next() * (max - min + 1)) + min;
    },
    pick(items) {
      return items[this.int(0, items.length - 1)];
    }
  };
}

export function makeId(prefix, parts) {
  return `${prefix}_${parts.map((part) => String(part).toLowerCase().replace(/[^a-z0-9]+/g, "_")).join("_")}`;
}

function hashSeed(seed) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
