import type { ReactNode } from "react";

interface FeedLayoutProperties {
  readonly children: ReactNode;
  readonly modal: ReactNode;
}

const FeedLayout = ({ children, modal }: FeedLayoutProperties) => (
  <>
    {children}
    {modal}
  </>
);

export default FeedLayout;
