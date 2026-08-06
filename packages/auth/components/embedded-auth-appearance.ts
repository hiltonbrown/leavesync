export const embeddedAuthAppearance = {
  elements: {
    card: "w-full",
    cardBox: "w-full max-w-full",
    header: "hidden",
    // The page layout owns sizing and centring, so let the Clerk card flow to
    // the column width instead of its fixed ~25rem, which overflows on phones.
    rootBox: "w-full",
  },
} as const;
