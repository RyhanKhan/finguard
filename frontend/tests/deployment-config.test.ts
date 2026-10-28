import { afterEach, describe, expect, it, vi } from "vitest";

// These credentials are invented input for the configuration rejection test.
const credentialsOrigin = new URL("https://api.example.test");
credentialsOrigin.username = "invented";
credentialsOrigin.password = "invented";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("Vercel deployment API configuration", () => {
  it.each([
    undefined,
    "",
    "http://127.0.0.1:8000",
    "https://localhost",
    "https://127.0.0.2",
    "https://[::1]",
    "https://api.localhost",
    credentialsOrigin.toString(),
    "https://api.example.test/path",
    "https://api.example.test?token=example",
    "https://api.example.test#fragment",
    " https://api.example.test ",
  ])("rejects missing or invalid public API origin %s", async (value) => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", value);
    await expect(import("../next.config")).rejects.toThrow("deployed backend HTTPS origin");
  });

  it("accepts an explicit public HTTPS origin", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.example.test");
    const config = await import("../next.config");
    expect(config.default.poweredByHeader).toBe(false);
  });

  it("preserves explicit loopback support for local production-browser checks", async () => {
    vi.stubEnv("VERCEL", undefined);
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://127.0.0.1:8000");
    const config = await import("../next.config");
    expect(config.default.poweredByHeader).toBe(false);
  });
});
