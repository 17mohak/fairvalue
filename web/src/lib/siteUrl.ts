// The public base URL of the site, used for canonical links and share-image URLs (metadataBase).
// FAIRVALUE_SITE_URL must be set for any public deployment, at build time as well as run time:
// statically generated pages resolve their metadata when they are built.

export const LOCAL_SITE_URL = "http://localhost:3000";

/**
 * Unset or blank -> the local compose address. A value that is set but is not an absolute http(s)
 * URL throws, so a typo fails the build instead of shipping links that point at localhost.
 */
export function siteUrl(raw: string | undefined): URL {
  const value = raw?.trim();
  if (!value) return new URL(LOCAL_SITE_URL);
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`FAIRVALUE_SITE_URL is not a valid URL: "${value}". Use an absolute address such as https://fairvalue.example.`);
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`FAIRVALUE_SITE_URL must use http or https, got "${url.protocol}".`);
  }
  return url;
}
