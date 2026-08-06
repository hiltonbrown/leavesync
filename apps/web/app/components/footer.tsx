import { brandNameDisplay } from "@repo/seo/branding";
import Image from "next/image";
import Link from "next/link";
import { signUpHref } from "@/src/lib/auth-links";

const footerColumns = [
  {
    items: [
      { href: "/features#ics-feeds", title: "Calendar feeds" },
      { href: "/features#leave-workflow", title: "Leave approvals" },
      { href: "/integrations", title: "Xero integration" },
      { href: "/pricing", title: "Pricing" },
    ],
    title: "Product",
  },
  {
    items: [
      { href: "/about", title: "About" },
      { href: "/customers", title: "Customers" },
      { href: "/blog", title: "Blog" },
      { href: "/careers", title: "Careers" },
    ],
    title: "Company",
  },
  {
    items: [
      { href: "/security", title: "Security" },
      { href: "/status", title: "Status" },
      { href: "/help-centre", title: "Help centre" },
      { href: "/contact", title: "Contact" },
      { href: "/changelog", title: "Changelog" },
    ],
    title: "Resources",
  },
];

const legalLinks = [
  { href: "/privacy-policy", title: "Privacy" },
  { href: "/terms-of-service", title: "Terms" },
];

export const Footer = () => (
  <footer className="marketing-footer">
    <div className="marketing-footer__grid">
      <div className="marketing-footer__brand">
        <Image
          alt={brandNameDisplay}
          className="marketing-footer__wordmark"
          height={42}
          src="/marketing/brand-wordmark-inverse.svg"
          width={168}
        />
        <p>
          Team availability, synced from Xero Payroll and published to the
          calendars your people already use.
        </p>
        <p className="marketing-footer__proof">
          Built for Xero Payroll teams in Australia. New Zealand and United
          Kingdom support is planned.
        </p>
        <div className="marketing-footer__actions">
          <Link className="marketing-footer__primary-link" href={signUpHref}>
            Sign up
          </Link>
          <Link className="marketing-footer__secondary-link" href="/contact">
            Talk to us
          </Link>
        </div>
      </div>
      {footerColumns.map((column) => (
        <div className="marketing-footer__column" key={column.title}>
          <h2>{column.title}</h2>
          {column.items.map((item) => (
            <Link href={item.href} key={item.title}>
              {item.title}
            </Link>
          ))}
        </div>
      ))}
    </div>
    <div className="marketing-footer__bottom">
      <span>© 2026 {brandNameDisplay}. Built on the Gold Coast.</span>
      <nav aria-label="Legal" className="marketing-footer__legal">
        {legalLinks.map((item) => (
          <Link href={item.href} key={item.title}>
            {item.title}
          </Link>
        ))}
      </nav>
    </div>
  </footer>
);
