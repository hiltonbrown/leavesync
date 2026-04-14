"use client";

import { UserButton, useClerk } from "@repo/auth/client";
import { Users } from "lucide-react";

export const CustomUserButton = () => {
  const { openOrganizationProfile } = useClerk();

  return (
    <UserButton>
      <UserButton.MenuItems>
        <UserButton.Action
          label="Organisation profile"
          labelIcon={<Users className="h-4 w-4" />}
          onClick={() => openOrganizationProfile()}
        />
      </UserButton.MenuItems>
    </UserButton>
  );
};
