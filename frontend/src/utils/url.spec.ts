import { describe, expect, it } from "vitest";
import { isSafePurchaseUrl } from "./url";

describe("isSafePurchaseUrl", () => {
  it("accepts http/https URLs", () => {
    expect(isSafePurchaseUrl("https://example.com/coffee/123")).toBe(true);
    expect(isSafePurchaseUrl("http://shop.example.com/")).toBe(true);
  });

  it("rejects dangerous schemes (XSS via javascript:/data: URIs)", () => {
    expect(isSafePurchaseUrl("javascript:alert(1)")).toBe(false);
    expect(isSafePurchaseUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
    expect(isSafePurchaseUrl("vbscript:msgbox(1)")).toBe(false);
    expect(isSafePurchaseUrl("file:///etc/passwd")).toBe(false);
  });

  it("rejects malformed or empty input", () => {
    expect(isSafePurchaseUrl("not a url")).toBe(false);
    expect(isSafePurchaseUrl("")).toBe(false);
  });

  it("rejects embedded credentials", () => {
    expect(isSafePurchaseUrl("https://user:pass@example.com/")).toBe(false);
  });

  it("rejects loopback, private, link-local, and cloud metadata hosts (SSRF)", () => {
    expect(isSafePurchaseUrl("http://localhost/")).toBe(false);
    expect(isSafePurchaseUrl("http://127.0.0.1/")).toBe(false);
    expect(isSafePurchaseUrl("http://0.0.0.0/")).toBe(false);
    expect(isSafePurchaseUrl("http://10.0.0.5/")).toBe(false);
    expect(isSafePurchaseUrl("http://192.168.1.1/")).toBe(false);
    expect(isSafePurchaseUrl("http://172.16.0.1/")).toBe(false);
    expect(isSafePurchaseUrl("http://169.254.169.254/")).toBe(false);
    expect(isSafePurchaseUrl("http://[::1]/")).toBe(false);
    expect(isSafePurchaseUrl("http://printer.local/")).toBe(false);
  });
});
