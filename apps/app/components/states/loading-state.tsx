import { Spinner } from "@repo/design-system/components/ui/spinner";

export const LoadingState = () => {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-8 text-muted-foreground">
      <Spinner className="size-5" />
      <p className="text-sm">Loading</p>
    </div>
  );
};
