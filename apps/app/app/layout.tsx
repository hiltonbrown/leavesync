import { env } from "@/env";
import "./styles.css";
import { AnalyticsProvider } from "@repo/analytics/provider";
import { DesignSystemProvider } from "@repo/design-system";
import { fonts } from "@repo/design-system/lib/fonts";
import { headers } from "next/headers";
import type { ReactNode } from "react";

interface RootLayoutProperties {
  readonly children: ReactNode;
}

const webUrl = (path: string): string =>
  env.NEXT_PUBLIC_WEB_URL
    ? new URL(path, env.NEXT_PUBLIC_WEB_URL).toString()
    : path;

const RootLayout = async ({ children }: RootLayoutProperties) => {
  const headersList = await headers();
  const nonce = headersList.get("x-nonce") ?? undefined;

  return (
    <html className={fonts} lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AnalyticsProvider nonce={nonce}>
          {/*
            helpUrl points at the marketing site's help centre, not
            NEXT_PUBLIC_DOCS_URL. apps/docs is still the unmodified Mintlify
            Starter Kit, so linking Help there would send users to Mintlify's
            tutorial content and support address instead of Team Calendar's own.
          */}
          <DesignSystemProvider
            afterSignOutUrl={env.NEXT_PUBLIC_WEB_URL}
            helpUrl={webUrl("/help-centre")}
            nonce={nonce}
            privacyUrl={webUrl("/privacy-policy")}
            termsUrl={webUrl("/terms-of-service")}
          >
            {children}
          </DesignSystemProvider>
        </AnalyticsProvider>
      </body>
    </html>
  );
};

export default RootLayout;
