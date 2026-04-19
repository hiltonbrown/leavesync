import { Button } from "@repo/design-system/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@repo/design-system/components/ui/empty";
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Page not found</EmptyTitle>
          <EmptyDescription>
            The page or resource you were looking for does not exist or you do
            not have access to it.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild variant="outline">
            <Link href="/">Go to Dashboard</Link>
          </Button>
        </EmptyContent>
      </Empty>
    </main>
  );
}
