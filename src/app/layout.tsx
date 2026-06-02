import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { IdentityProvider } from "@/components/identity";
import { SiteHeader } from "@/components/site-header";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LotZero — global live auctions with zero oversells",
  description:
    "A globally-distributed live-auction marketplace. The money ledger runs on Aurora DSQL (active-active strong consistency); the social firehose runs on DynamoDB. Zero oversells, zero double-spends, every Region.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <IdentityProvider>
          <SiteHeader />
          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>
          <footer className="mx-auto w-full max-w-7xl px-4 py-10 text-xs text-[var(--muted)]">
            LotZero · Aurora DSQL + DynamoDB on Vercel · built for the H0: Hack the Zero hackathon
          </footer>
        </IdentityProvider>
      </body>
    </html>
  );
}
