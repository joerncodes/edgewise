import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Knoives",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SessionProvider>
          <header className="border-b">
            <div className="mx-auto max-w-5xl flex items-center gap-6 px-4 py-3">
              <Link href="/" className="font-semibold">
                Knoives
              </Link>
              <nav className="flex items-center gap-4 text-sm text-muted-foreground">
                <Link href="/knives" className="hover:text-foreground">
                  Knives
                </Link>
                <Link href="/owners" className="hover:text-foreground">
                  Owners
                </Link>
              </nav>
              <div className="ml-auto">
                <SignOutButton />
              </div>
            </div>
          </header>
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
          <Toaster richColors position="top-right" />
        </SessionProvider>
      </body>
    </html>
  );
}

