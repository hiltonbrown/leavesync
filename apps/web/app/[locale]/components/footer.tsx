import Link from "next/link";

const productLinks = [
  { title: "Features", href: "/features" },
  { title: "Xero Integration", href: "/integrations/xero" },
  { title: "Pricing", href: "/pricing" },
  { title: "Security", href: "/security" },
];

const resourceLinks = [
  { title: "Blog", href: "/blog" },
  { title: "Changelog", href: "/changelog" },
];

const legalLinks = [
  { title: "Privacy Policy", href: "/legal/privacy" },
  { title: "Terms of Service", href: "/legal/terms" },
];

export const Footer = () => (
  <section className="dark border-foreground/10 border-t">
    <div className="w-full bg-background py-20 text-foreground lg:py-40">
      <div className="container mx-auto">
        <div className="grid items-start gap-10 lg:grid-cols-2">
          <div className="flex flex-col items-start gap-6">
            <div className="flex items-center gap-2">
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
              <span className="font-semibold text-lg">LeaveSync</span>
            </div>
            <p className="max-w-sm text-foreground/75 text-base leading-relaxed">
              Leave management and availability publishing for teams using Xero
              Payroll AU, NZ, and UK.
            </p>
            <p className="text-foreground/50 text-sm">
              &copy; {new Date().getFullYear()} LeaveSync. All rights reserved.
            </p>
          </div>

          <div className="grid items-start gap-8 sm:grid-cols-3">
            <div className="flex flex-col gap-3">
              <p className="font-medium text-sm uppercase tracking-widest text-foreground/50">
                Product
              </p>
              {productLinks.map((link) => (
                <Link
                  className="text-foreground/75 text-sm hover:text-foreground transition-colors"
                  href={link.href}
                  key={link.href}
                >
                  {link.title}
                </Link>
              ))}
            </div>
            <div className="flex flex-col gap-3">
              <p className="font-medium text-sm uppercase tracking-widest text-foreground/50">
                Resources
              </p>
              {resourceLinks.map((link) => (
                <Link
                  className="text-foreground/75 text-sm hover:text-foreground transition-colors"
                  href={link.href}
                  key={link.href}
                >
                  {link.title}
                </Link>
              ))}
            </div>
            <div className="flex flex-col gap-3">
              <p className="font-medium text-sm uppercase tracking-widest text-foreground/50">
                Legal
              </p>
              {legalLinks.map((link) => (
                <Link
                  className="text-foreground/75 text-sm hover:text-foreground transition-colors"
                  href={link.href}
                  key={link.href}
                >
                  {link.title}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);
