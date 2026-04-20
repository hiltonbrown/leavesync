const LOCAL_API_ORIGIN = "http://localhost:3002";
const TRAILING_SLASHES_PATTERN = /\/+$/;

export function getPublicApiOrigin(): string | null {
  const configuredOrigin = process.env.NEXT_PUBLIC_API_URL?.trim();

  if (configuredOrigin) {
    return configuredOrigin.replace(TRAILING_SLASHES_PATTERN, "");
  }

  if (process.env.NODE_ENV === "development") {
    return LOCAL_API_ORIGIN;
  }

  return null;
}

export function getPublicApiUrl(path: `/${string}`): string | null {
  const origin = getPublicApiOrigin();

  return origin ? `${origin}${path}` : null;
}
