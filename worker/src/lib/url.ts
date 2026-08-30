const PRIVATE_HOSTNAMES = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

function isPrivateIPv4(host: string): boolean {
  const match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!match) return false;
  const a = Number(match[1]);
  const b = Number(match[2]);
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

function isPrivateIPv6(host: string): boolean {
  const h = host.replace(/^\[|\]$/g, "");
  return h === "::1" || h.startsWith("fe80") || h.startsWith("fc") || h.startsWith("fd");
}

// bean.purchaseUrl is opaque, stored data only -- the Worker never fetches it
// (no link-preview/scrape feature), so there is no SSRF surface today. This
// allowlist (http/https scheme only, no embedded credentials, no loopback/
// private/link-local host) is defense-in-depth so a future feature that does
// fetch this URL can't reintroduce SSRF just by forgetting to validate first.
export function isSafePurchaseUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  if (url.username || url.password) return false;
  const host = url.hostname.toLowerCase();
  if (PRIVATE_HOSTNAMES.has(host)) return false;
  if (host.endsWith(".local")) return false;
  if (isPrivateIPv4(host)) return false;
  if (isPrivateIPv6(host)) return false;
  return true;
}
