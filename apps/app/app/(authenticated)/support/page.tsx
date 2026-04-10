import { auth } from "@repo/auth/server";
import { redirect } from "next/navigation";
import { Header } from "../components/header";
import { SupportClient } from "./support-client";

const SupportPage = async () => {
  const { userId, orgId } = await auth();

  if (!(userId && orgId)) {
    redirect("/");
  }

  return (
    <>
      <Header page="Support & Feedback" />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-2xl">
          <SupportClient />
        </div>
      </main>
    </>
  );
};

export default SupportPage;
