import { cn } from '@repo/design-system/lib/utils';
import { Geist_Mono, Plus_Jakarta_Sans } from 'next/font/google';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta-sans',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
});

export const fonts = cn(
  plusJakartaSans.variable,
  geistMono.variable,
  'touch-manipulation font-sans antialiased'
);
