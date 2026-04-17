"use client";

const XeroClient = () => (
  <div className="rounded-2xl bg-muted p-6">
    <p className="font-medium text-sm">Xero is not connected in this MVP.</p>
    <p className="mt-1 text-muted-foreground text-sm">
      Manual availability is backed by Neon now. Xero OAuth and payroll sync
      will be enabled in a later backend slice.
    </p>
  </div>
);

export { XeroClient };
