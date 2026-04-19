import { redirect } from "next/navigation";

const LegacyWorkspacesPage = () => {
  redirect("/settings/general");
};

export default LegacyWorkspacesPage;
