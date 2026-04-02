function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}

export const env = {
  apiBaseUrl: normalizeBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ?? ""),
};
