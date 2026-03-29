export function normalizeRedirectTo(value: string | null | undefined) {
  if (!value || !value.startsWith("/")) {
    return "/boards";
  }

  return value;
}
