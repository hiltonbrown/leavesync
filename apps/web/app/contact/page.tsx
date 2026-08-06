import { createMetadata } from "@repo/seo/metadata";
import type { Metadata } from "next";
import { ContactForm } from "./components/contact-form";

export const metadata: Metadata = createMetadata({
  description:
    "Talk to us about getting your small business onto Team Calendar, connected to your Xero Payroll file. Tell us your team size and we will help you set up.",
  title: "Get in touch",
});

const Contact = () => <ContactForm />;

export default Contact;
