import { SignIn as ClerkSignIn } from "@clerk/nextjs";
import { AuthFormFrame } from "./auth-form-frame";
import { embeddedAuthAppearance } from "./embedded-auth-appearance";

export const signInCopy = {
  description:
    "Sign in to manage leave and availability for your organisation.",
  title: "Welcome back",
};

export const SignIn = () => (
  <AuthFormFrame {...signInCopy}>
    <ClerkSignIn appearance={embeddedAuthAppearance} />
  </AuthFormFrame>
);
