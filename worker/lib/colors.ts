const COLORS = [
  "#0f766e",
  "#2563eb",
  "#b45309",
  "#be123c",
  "#7c3aed",
  "#15803d",
];

export function colorFromId(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return COLORS[Math.abs(hash) % COLORS.length];
}
