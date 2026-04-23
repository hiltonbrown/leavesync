"use client";

import { getMDXComponent } from "mdx-bundler/client";
import { useMemo } from "react";

interface MdxContentProps {
  code: string;
}

export const MdxContent = ({ code }: MdxContentProps) => {
  const Component = useMemo(() => getMDXComponent(code), [code]);
  return (
    <div className="prose prose-neutral dark:prose-invert max-w-none">
      <Component />
    </div>
  );
};
