import { auth } from "@repo/auth/server";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Header } from "../components/header";
import { SettingsNav } from "./components/settings-nav";

interface SettingsLayoutProps {
  readonly children: ReactNode;
}

const SettingsLayout = async ({ children }: SettingsLayoutProps) => {
  const { orgId, orgRole } = await auth();

  if (!orgId) {
    redirect("/");
  }

  const isAdminOrOwner = orgRole === "org:owner" || orgRole === "org:admin";

  if (!isAdminOrOwner) {
    redirect("/");
  }

  return (
    <>
      <Header page="Settings" />
      <div className="flex flex-1 overflow-hidden">
        <SettingsNav />
        <main className="flex-1 overflow-y-auto p-6 pt-0">{children}</main>
      </div>
    </>
  );
};

export default SettingsLayout;
