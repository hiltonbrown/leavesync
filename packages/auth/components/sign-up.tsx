import { SignUp as ClerkSignUp } from "@clerk/nextjs";
import { AuthFormFrame } from "./auth-form-frame";
import { embeddedAuthAppearance } from "./embedded-auth-appearance";

export const signUpCopy = {
  description:
    "Start a new Team Calendar organisation, or accept an invitation from your team email.",
  title: "Create your organisation",
};

export const SignUp = () => (
  <AuthFormFrame {...signUpCopy}>
    <ClerkSignUp appearance={embeddedAuthAppearance} />
  </AuthFormFrame>
);
