import type { ReactNode } from "react";

interface PlansLayoutProperties {
  readonly children: ReactNode;
  readonly modal: ReactNode;
}

const PlansLayout = ({ children, modal }: PlansLayoutProperties) => (
  <>
    {children}
    {modal}
  </>
);

export default PlansLayout;
