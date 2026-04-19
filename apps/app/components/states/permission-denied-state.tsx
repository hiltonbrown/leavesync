import { Button } from "@repo/design-system/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@repo/design-system/components/ui/empty";
import Link from "next/link";

interface PermissionDeniedStateProps {
  ctaHref?: string;
  ctaLabel?: string;
  description?: string;
  title?: string;
}

export const PermissionDeniedState = ({
  ctaHref = "/",
  ctaLabel = "Go to Dashboard",
  description = "You do not have permission to view this page.",
  title = "Permission Denied",
}: PermissionDeniedStateProps) => (
  <Empty>
    <EmptyHeader>
      <EmptyTitle>{title}</EmptyTitle>
      <EmptyDescription>{description}</EmptyDescription>
    </EmptyHeader>
    <EmptyContent>
      <Button asChild variant="outline">
        <Link href={ctaHref}>{ctaLabel}</Link>
      </Button>
    </EmptyContent>
  </Empty>
);
