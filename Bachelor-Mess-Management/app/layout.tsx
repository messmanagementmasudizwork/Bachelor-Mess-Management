import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { LanguageProvider } from "@/components/providers/LanguageProvider";
import { Toaster } from "sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "MessPilot — Bachelor Mess Management",
    template: "%s | MessPilot",
  },
  description:
    "Smart bachelor mess management platform. Manage meals, expenses, members and monthly reports easily.",
  keywords: ["mess management", "bachelor mess", "meal tracking", "expense management", "Bangladesh"],
  authors: [{ name: "MessPilot" }],
  creator: "MessPilot",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:5000"),
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MessPilot",
  },
  openGraph: {
    type: "website",
    locale: "bn_BD",
    siteName: "MessPilot",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bn" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <QueryProvider>
            <AuthProvider>
            <LanguageProvider>
              {children}
              <Toaster
                position="top-right"
                richColors
                closeButton
                duration={4000}
                toastOptions={{
                  style: { borderRadius: "12px" },
                }}
              />
            </LanguageProvider>
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
