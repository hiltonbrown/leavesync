import { Button } from "@repo/design-system/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@repo/design-system/components/ui/empty";
import Link from "next/link";

export const PermissionDeniedState = () => {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>Permission Denied</EmptyTitle>
        <EmptyDescription>
          You do not have permission to view this page.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button asChild variant="outline">
          <Link href="/">Go to Dashboard</Link>
        </Button>
      </EmptyContent>
    </Empty>
  );
};
