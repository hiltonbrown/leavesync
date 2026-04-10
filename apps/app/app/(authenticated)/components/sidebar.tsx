"use client";

import { UserButton } from "@repo/auth/client";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@repo/design-system/components/ui/sidebar";
import { cn } from "@repo/design-system/lib/utils";
import {
  BarChart2Icon,
  BellIcon,
  CalendarDaysIcon,
  ClipboardListIcon,
  FlagIcon,
  LayoutDashboardIcon,
  LeafIcon,
  LifeBuoyIcon,
  LinkIcon,
  Settings2Icon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, Suspense } from "react";

interface GlobalSidebarProperties {
  readonly children: ReactNode;
}

const navGroups = [
  {
    label: null,
    items: [{ title: "Dashboard", href: "/", icon: LayoutDashboardIcon }],
  },
  {
    label: "My Work",
    items: [
      { title: "My Plans", href: "/plans", icon: ClipboardListIcon },
      { title: "Calendar", href: "/calendar", icon: CalendarDaysIcon },
      { title: "Notifications", href: "/notifications", icon: BellIcon },
    ],
  },
  {
    label: "Team",
    items: [
      { title: "People", href: "/people", icon: UsersIcon },
      { title: "Calendar Feeds", href: "/feed", icon: LinkIcon },
    ],
  },
  {
    label: "Admin",
    items: [
      {
        title: "Leave Approvals",
        href: "/leave-approvals",
        icon: ClipboardListIcon,
      },
      { title: "Public Holidays", href: "/public-holidays", icon: FlagIcon },
    ],
  },
  {
    label: "Reports",
    items: [
      {
        title: "Leave Reports",
        href: "/analytics/leave-reports",
        icon: BarChart2Icon,
      },
      {
        title: "Out of Office",
        href: "/analytics/out-of-office",
        icon: BarChart2Icon,
      },
    ],
  },
] as const;

export const GlobalSidebar = ({ children }: GlobalSidebarProperties) => {
  const sidebar = useSidebar();
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      <Sidebar collapsible="icon" variant="inset">
        <SidebarHeader className="pb-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <div
                className={cn(
                  "mb-1 flex items-center gap-2.5 px-1 py-1.5",
                  !sidebar.open && "justify-center"
                )}
              >
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: "var(--primary)" }}
                >
                  <LeafIcon className="h-4 w-4 text-white" strokeWidth={2} />
                </div>
                {sidebar.open && (
                  <span className="font-semibold text-[0.9375rem] tracking-[-0.01em]">
                    LeaveSync
                  </span>
                )}
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          {navGroups.map((group) => (
            <SidebarGroup key={group.label ?? "__home"}>
              {group.label && (
                <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        className="h-9 gap-3"
                        isActive={isActive(item.href)}
                        tooltip={item.title}
                      >
                        <Link href={item.href}>
                          <item.icon
                            className="h-4 w-4 shrink-0"
                            strokeWidth={1.75}
                          />
                          <span className="font-medium text-[0.8125rem]">
                            {item.title}
                          </span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>

        <SidebarFooter className="gap-0 pt-0">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                className="h-9 gap-3"
                isActive={pathname.startsWith("/settings")}
                tooltip="Settings"
              >
                <Link href="/settings">
                  <Settings2Icon
                    className="h-4 w-4 shrink-0"
                    strokeWidth={1.75}
                  />
                  <span className="font-medium text-[0.8125rem]">Settings</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                className="h-9 gap-3"
                isActive={pathname.startsWith("/support")}
                tooltip="Support & Feedback"
              >
                <Link href="/support">
                  <LifeBuoyIcon
                    className="h-4 w-4 shrink-0"
                    strokeWidth={1.75}
                  />
                  <span className="font-medium text-[0.8125rem]">
                    Support & Feedback
                  </span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>

          <SidebarMenu className="mt-2">
            <SidebarMenuItem>
              <div
                className={cn(
                  "flex items-center gap-2 px-1 py-0.5",
                  !sidebar.open && "justify-center"
                )}
              >
                <Suspense
                  fallback={
                    <div className="h-7 w-7 animate-pulse rounded-full bg-[var(--sidebar-accent)]" />
                  }
                >
                  <UserButton
                    appearance={{
                      elements: {
                        rootBox: cn("flex", sidebar.open ? "flex-1" : "w-auto"),
                        userButtonBox: "flex-row-reverse",
                        userButtonOuterIdentifier:
                          "truncate pl-0 text-[0.8125rem]",
                      },
                    }}
                    showName={sidebar.open}
                  />
                </Suspense>
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      {children}
    </>
  );
};
