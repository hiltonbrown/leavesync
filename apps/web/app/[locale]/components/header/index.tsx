"use client";

import { ModeToggle } from "@repo/design-system/components/mode-toggle";
import { Button } from "@repo/design-system/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@repo/design-system/components/ui/navigation-menu";
import type { Dictionary } from "@repo/internationalization";
import { Menu, MoveRight, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { env } from "@/env";

interface HeaderProps {
  dictionary: Dictionary;
}

export const Header = ({ dictionary }: HeaderProps) => {
  const [isOpen, setOpen] = useState(false);
  const navLinks = [
    {
      title: dictionary.web.header.features ?? "Features",
      href: "/features",
    },
    {
      title: dictionary.web.header.xero ?? "Xero",
      href: "/integrations/xero",
    },
    {
      title: dictionary.web.header.pricing ?? "Pricing",
      href: "/pricing",
    },
    {
      title: dictionary.web.header.security ?? "Security",
      href: "/security",
    },
    {
      title: dictionary.web.header.changelog ?? "Changelog",
      href: "/changelog",
    },
    {
      title: dictionary.web.header.blog ?? "Blog",
      href: "/blog",
    },
  ];

  return (
    <header className="header-reactive sticky top-0 left-0 z-40 w-full transition-colors duration-300">
      <div className="container relative mx-auto flex min-h-20 flex-row items-center gap-4 lg:grid lg:grid-cols-3">
        {/* Desktop nav */}
        <div className="hidden flex-row items-center justify-start gap-1 lg:flex">
          <NavigationMenu className="flex items-start justify-start">
            <NavigationMenuList className="flex flex-row justify-start gap-1">
              {navLinks.map((item) => (
                <NavigationMenuItem key={item.title}>
                  <NavigationMenuLink asChild>
                    <Button asChild size="sm" variant="ghost">
                      <Link href={item.href}>{item.title}</Link>
                    </Button>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        {/* Wordmark */}
        <div className="flex items-center gap-2 lg:justify-center">
          <svg
            aria-hidden="true"
            className="h-5 w-5 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 2C7.5 2 4 5.5 4 10c0 3.3 1.9 6.2 4.7 7.7L12 22l3.3-4.3C18.1 16.2 20 13.3 20 10c0-4.5-3.5-8-8-8z"
              fill="currentColor"
              opacity="0.2"
            />
            <path
              d="M12 2C8.7 2 6 4.7 6 8c0 2.5 1.4 4.6 3.5 5.7L12 17l2.5-3.3C16.6 12.6 18 10.5 18 8c0-3.3-2.7-6-6-6z"
              fill="currentColor"
            />
          </svg>
          <Link className="whitespace-nowrap font-semibold" href="/">
            LeaveSync
          </Link>
        </div>

        {/* Desktop CTAs */}
        <div className="flex w-full justify-end gap-4">
          <div className="hidden md:block">
            <ModeToggle />
          </div>
          <Button asChild className="hidden md:inline-flex" variant="ghost">
            <Link href={`${env.NEXT_PUBLIC_APP_URL}/sign-in`}>
              {dictionary.web.header.signIn}
            </Link>
          </Button>
          <Button asChild className="hidden md:inline-flex">
            <Link href={`${env.NEXT_PUBLIC_APP_URL}/sign-up`}>
              {dictionary.web.header.signUp}
            </Link>
          </Button>
        </div>

        {/* Mobile menu toggle */}
        <div className="flex w-12 shrink items-end justify-end lg:hidden">
          <Button onClick={() => setOpen(!isOpen)} variant="ghost">
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          {isOpen && (
            <div className="container absolute top-20 right-0 flex w-full flex-col gap-6 border-t bg-background py-6 shadow-lg">
              {navLinks.map((item) => (
                <Link
                  className="flex items-center justify-between text-lg"
                  href={item.href}
                  key={item.href}
                  onClick={() => setOpen(false)}
                >
                  <span>{item.title}</span>
                  <MoveRight className="h-4 w-4 stroke-1 text-muted-foreground" />
                </Link>
              ))}
              <div className="flex flex-col gap-3 border-t pt-4">
                <Button asChild variant="ghost">
                  <Link href={`${env.NEXT_PUBLIC_APP_URL}/sign-in`}>
                    {dictionary.web.header.signIn}
                  </Link>
                </Button>
                <Button asChild>
                  <Link href={`${env.NEXT_PUBLIC_APP_URL}/sign-up`}>
                    {dictionary.web.header.signUp}
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
