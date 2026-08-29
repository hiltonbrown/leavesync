import { primaryDomain } from "@repo/seo/branding";

export const supportEmail = `support@${primaryDomain}`;

const supportSubject = "Team Calendar early access enquiry";
const supportBody = [
  "Organisation name:",
  "Team size:",
  "Xero Payroll region:",
  "Help needed:",
].join("\n");

export const supportMailtoHref = `mailto:${supportEmail}?subject=${encodeURIComponent(supportSubject)}&body=${encodeURIComponent(supportBody)}`;

export const supportHoursLong = "Monday to Friday, 9:00 am to 5:00 pm AEST";
export const supportHoursCompact = "Mon–Fri, 9 am–5 pm AEST";
