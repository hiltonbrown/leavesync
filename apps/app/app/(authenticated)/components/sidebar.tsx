"use client";

import { UserButton } from "@repo/auth/client";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from "@repo/design-system/components/ui/sidebar";
import { cn } from "@repo/design-system/lib/utils";
import { NotificationsTrigger } from "@repo/notifications/components/trigger";
import {
  CalendarCheckIcon,
  CalendarDaysIcon,
  CalendarRangeIcon,
  LayoutDashboardIcon,
  LeafIcon,
  RssIcon,
  Settings2Icon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, Suspense } from "react";

interface GlobalSidebarProperties {
  readonly children: ReactNode;
}

const navItems = [
  { title: "Dashboard", href: "/", icon: LayoutDashboardIcon },
  { title: "My Plans", href: "/plans", icon: CalendarRangeIcon },
  { title: "Calendar", href: "/calendar", icon: CalendarDaysIcon },
  { title: "Feed", href: "/feed", icon: RssIcon },
  { title: "People", href: "/people", icon: UsersIcon },
  {
    title: "Public Holidays",
    href: "/public-holidays",
    icon: CalendarCheckIcon,
  },
] as const;

export const GlobalSidebar = ({ children }: GlobalSidebarProperties) => {
  const sidebar = useSidebar();
  const pathname = usePathname();

  return (
    <>
      <Sidebar collapsible="icon" variant="floating">
        <SidebarHeader className="pb-2">
          <SidebarMenu>
            <SidebarMenuItem>
              {/* Brand mark */}
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
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => {
                  const isActive =
                    item.href === "/"
                      ? pathname === "/"
                      : pathname.startsWith(item.href);
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        className="h-9 gap-3"
                        isActive={isActive}
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
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="gap-0 pt-0">
          <SidebarSeparator className="mb-2" />
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
          </SidebarMenu>

          <SidebarSeparator className="my-2" />

          <SidebarMenu>
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
                {sidebar.open && (
                  <div className="flex shrink-0 items-center gap-0.5">
                    <Button
                      className="h-8 w-8 shrink-0"
                      size="icon"
                      variant="ghost"
                    >
                      <NotificationsTrigger />
                    </Button>
                  </div>
                )}
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
