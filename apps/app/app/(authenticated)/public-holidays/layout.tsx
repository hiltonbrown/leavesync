import type { ReactNode } from "react";

interface PublicHolidaysLayoutProps {
  readonly children: ReactNode;
  readonly modal: ReactNode;
}

const PublicHolidaysLayout = ({
  children,
  modal,
}: PublicHolidaysLayoutProps) => (
  <>
    {children}
    {modal}
  </>
);

export default PublicHolidaysLayout;
