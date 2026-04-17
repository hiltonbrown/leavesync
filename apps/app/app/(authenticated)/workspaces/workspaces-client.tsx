"use client";

const WorkspacesClient = () => (
  <div className="rounded-2xl bg-muted p-6">
    <p className="font-medium text-sm">
      Workspace switching is managed by Clerk.
    </p>
    <p className="mt-1 text-muted-foreground text-sm">
      Use the organisation switcher in the sidebar to move between Clerk
      organisations. LeaveSync does not keep a separate workspace table.
    </p>
  </div>
);

export { WorkspacesClient };
