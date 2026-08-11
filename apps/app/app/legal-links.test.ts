import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("legal link destinations", () => {
  it("uses canonical web routes /privacy-policy and /terms-of-service in RootLayout", () => {
    const layoutPath = path.resolve(import.meta.dirname, "./layout.tsx");
    const content = fs.readFileSync(layoutPath, "utf-8");

    expect(content).toContain('privacyUrl={webUrl("/privacy-policy")}');
    expect(content).toContain('termsUrl={webUrl("/terms-of-service")}');
    expect(content).not.toContain("/legal/privacy");
    expect(content).not.toContain("/legal/terms");
  });

  it("verifies target legal routes exist in apps/web", () => {
    const webPrivacyPath = path.resolve(
      import.meta.dirname,
      "../../web/app/(legal)/privacy-policy/page.tsx"
    );
    const webTermsPath = path.resolve(
      import.meta.dirname,
      "../../web/app/(legal)/terms-of-service/page.tsx"
    );

    expect(fs.existsSync(webPrivacyPath)).toBe(true);
    expect(fs.existsSync(webTermsPath)).toBe(true);
  });
});
