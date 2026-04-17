const EXTERNAL_URL_PATTERN = /^[a-z][a-z0-9+.-]*:/i;

export const ORG_QUERY_PARAM = "org";

export function withOrg(href: string, orgId?: string | null): string {
  if (!orgId || EXTERNAL_URL_PATTERN.test(href) || href.startsWith("#")) {
    return href;
  }

  const [pathWithQuery = "", hash = ""] = href.split("#", 2);
  const [pathname = "", query = ""] = pathWithQuery.split("?", 2);
  const params = new URLSearchParams(query);
  params.set(ORG_QUERY_PARAM, orgId);

  const nextHref = `${pathname}?${params.toString()}`;
  return hash ? `${nextHref}#${hash}` : nextHref;
}

export function getOrgFromSearchParams(
  searchParams: URLSearchParams
): string | null {
  const org = searchParams.get(ORG_QUERY_PARAM);
  return org && org.trim().length > 0 ? org : null;
}

export function preserveOrgQueryParam(
  params: URLSearchParams,
  orgQueryValue?: null | string
): void {
  if (orgQueryValue) {
    params.set(ORG_QUERY_PARAM, orgQueryValue);
    return;
  }

  params.delete(ORG_QUERY_PARAM);
}
