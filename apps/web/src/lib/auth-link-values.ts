const PRODUCTION_APP_ORIGIN = "https://app.teamcalendar.online";
const LOCAL_APP_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);

interface ResolveAuthLinksInput {
  appUrl: string | undefined;
  vercelEnv: string | undefined;
}

interface AuthLinks {
  signInHref: string;
  signUpHref: string;
}

export function resolveAuthLinks(input: ResolveAuthLinksInput): AuthLinks {
  const appUrl = new URL(input.appUrl ?? PRODUCTION_APP_ORIGIN);

  if (
    input.vercelEnv === "production" &&
    LOCAL_APP_HOSTS.has(appUrl.hostname)
  ) {
    throw new Error(
      "NEXT_PUBLIC_APP_URL must point to the Team Calendar app domain in production."
    );
  }

  return {
    signInHref: `${appUrl.origin}/sign-in`,
    signUpHref: `${appUrl.origin}/sign-up`,
  };
}
