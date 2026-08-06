"use client";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@repo/design-system/components/ui/sidebar";
import {
  CalendarCheckIcon,
  ClipboardListIcon,
  CreditCardIcon,
  ListChecksIcon,
  PlugIcon,
  RssIcon,
  ScrollTextIcon,
  Settings2Icon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/settings/general", icon: Settings2Icon, label: "General" },
  {
    href: "/settings/getting-started",
    icon: ListChecksIcon,
    label: "Getting Started",
  },
  {
    href: "/settings/leave-approval",
    icon: ClipboardListIcon,
    label: "Leave Approval",
  },
  { href: "/settings/members", icon: UsersIcon, label: "Members" },
  {
    href: "/settings/integrations",
    icon: PlugIcon,
    label: "Integrations",
  },
  {
    href: "/settings/feeds",
    icon: RssIcon,
    label: "Feeds & Publishing",
  },
  { href: "/settings/billing", icon: CreditCardIcon, label: "Billing" },
  {
    href: "/settings/holidays",
    icon: CalendarCheckIcon,
    // "Holidays" (not "Public Holidays") distinguishes this admin-config surface
    // (S-23) from the main-sidebar member view "Public Holidays" (S-11).
    label: "Holidays",
  },
  {
    href: "/settings/audit-log",
    icon: ScrollTextIcon,
    label: "Audit Log",
  },
] as const;

export const SettingsNav = () => {
  const pathname = usePathname();

  return (
    <aside className="w-52 shrink-0 border-border/40 border-r py-6">
      <SidebarMenu className="px-3">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);
          return (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                className="h-9 gap-3"
                isActive={isActive}
                tooltip={item.label}
              >
                <Link href={item.href}>
                  <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                  <span className="font-medium text-[0.8125rem]">
                    {item.label}
                  </span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </aside>
  );
};
