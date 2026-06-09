import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Oswald } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import Link from "next/link";
import { NavLink } from "@/components/nav-link";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Edgewise",
  description: "Track knives sharpened for friends and coworkers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${plexSans.variable} ${plexMono.variable} ${oswald.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider defaultTheme="dark">
          <SessionProvider>
            <header>
              <div className="mx-auto flex h-12 max-w-3xl items-center gap-6 px-6 text-sm">
                <Link
                  href="/"
                  className="font-heading text-lg font-semibold uppercase tracking-wider"
                >
                  Edgewise
                </Link>
                <nav className="flex items-center gap-5">
                  <NavLink href="/knives">Knives</NavLink>
                  <NavLink href="/owners">Owners</NavLink>
                </nav>
                <div className="ml-auto flex items-center gap-1">
                  <ThemeToggle />
                  <SignOutButton />
                </div>
              </div>
            </header>
            <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">{children}</main>
            <Toaster richColors position="top-right" />
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
