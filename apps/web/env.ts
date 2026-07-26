import { keys as email } from "@repo/email/keys";
import { keys as core } from "@repo/next-config/keys";
import { keys as observability } from "@repo/observability/keys";
import { createEnv } from "@t3-oss/env-nextjs";

export const env = createEnv({
  extends: [core(), email(), observability()],
  server: {},
  client: {},
  runtimeEnv: {},
  // Belt-and-braces: protects any field this app's own env.ts ever declares
  // directly. The fields that matter today all come through `extends`, and
  // are protected at the package level (see the nine files above).
  emptyStringAsUndefined: true,
});
