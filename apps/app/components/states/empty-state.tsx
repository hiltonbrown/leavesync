import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@repo/design-system/components/ui/empty";
import type { ReactNode } from "react";

interface EmptyStateProps {
  readonly actionSlot?: ReactNode;
  readonly description: string;
  readonly title?: string;
}

export const EmptyState = ({
  title,
  description,
  actionSlot,
}: EmptyStateProps) => {
  return (
    <Empty>
      <EmptyHeader>
        {title && <EmptyTitle>{title}</EmptyTitle>}
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {actionSlot && <EmptyContent>{actionSlot}</EmptyContent>}
    </Empty>
  );
};
