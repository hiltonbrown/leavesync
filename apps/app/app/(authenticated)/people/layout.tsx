import { type ReactNode } from "react";

interface PeopleLayoutProperties {
  readonly children: ReactNode;
  readonly modal: ReactNode;
}

const PeopleLayout = ({ children, modal }: PeopleLayoutProperties) => (
  <>
    {children}
    {modal}
  </>
);

export default PeopleLayout;
