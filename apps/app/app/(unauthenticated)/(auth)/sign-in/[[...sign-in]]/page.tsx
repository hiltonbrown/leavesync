import { signInCopy } from "@repo/auth/components/sign-in";
import { createMetadata } from "@repo/seo/metadata";
import type { Metadata } from "next";
import dynamic from "next/dynamic";

const SignIn = dynamic(() =>
  import("@repo/auth/components/sign-in").then((mod) => mod.SignIn)
);

export const metadata: Metadata = createMetadata({
  description: signInCopy.description,
  title: signInCopy.title,
});

const SignInPage = () => <SignIn />;

export default SignInPage;
