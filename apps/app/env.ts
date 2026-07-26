import { keys as analytics } from "@repo/analytics/keys";
import { keys as auth } from "@repo/auth/keys";
import { keys as billing } from "@repo/billing/keys";
import { keys as database } from "@repo/database/keys";
import { keys as email } from "@repo/email/keys";
import { keys as feeds } from "@repo/feeds/keys";
import { keys as core } from "@repo/next-config/keys";
import { keys as notifications } from "@repo/notifications/keys";
import { keys as observability } from "@repo/observability/keys";
import { keys as xero } from "@repo/xero/keys";
import { createEnv } from "@t3-oss/env-nextjs";

export const env = createEnv({
  extends: [
    auth(),
    billing(),
    analytics(),
    core(),
    database(),
    email(),
    feeds(),
    notifications(),
    observability(),
    xero(),
  ],
  server: {},
  client: {},
  runtimeEnv: {},
  // Belt-and-braces: protects any field this app's own env.ts ever declares
  // directly. The fields that matter today all come through `extends`, and
  // are protected at the package level (see the nine files above).
  emptyStringAsUndefined: true,
});
