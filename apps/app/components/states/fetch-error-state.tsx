import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@repo/design-system/components/ui/empty";
import type { ReactNode } from "react";

interface FetchErrorStateProps {
  readonly entityName: string;
  readonly retrySlot?: ReactNode;
}

export const FetchErrorState = ({
  entityName,
  retrySlot,
}: FetchErrorStateProps) => {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>Unable to load {entityName}</EmptyTitle>
        <EmptyDescription>
          Try again or contact support if the issue continues.
        </EmptyDescription>
      </EmptyHeader>
      {retrySlot && <EmptyContent>{retrySlot}</EmptyContent>}
    </Empty>
  );
};
