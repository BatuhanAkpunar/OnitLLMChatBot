import type { Metadata } from "next";
import { Geist, Geist_Mono, Pixelify_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { ReactScan } from "@/components/dev/react-scan";
import { I18nProvider } from "@/components/i18n-provider";
import { resolveAppLanguage } from "@/lib/i18n-server";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Display/accent only - the neo-retro "Pixel Atelier" spice. Never body copy.
const pixelifySans = Pixelify_Sans({
  variable: "--font-pixel",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Onit AI · Your AI product team",
  description:
    "Brief a party of AI specialists - Analyst, PM, Designer, QA - in one chat. They plan, debate, and build with you.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const lang = await resolveAppLanguage();
  return (
    <html
      lang={lang}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${pixelifySans.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        <ReactScan />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <I18nProvider lang={lang}>{children}</I18nProvider>
          <Toaster theme="system" position="top-center" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
