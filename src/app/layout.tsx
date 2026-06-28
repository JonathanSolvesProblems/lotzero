import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import "./globals.css";
import { IdentityProvider } from "@/components/identity";
import { SiteHeader } from "@/components/site-header";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "LotZero, global live auctions with zero oversells",
  description:
    "A globally-distributed live-auction marketplace. The money ledger runs on Aurora DSQL (active-active strong consistency); the social firehose runs on DynamoDB. Zero oversells, zero double-spends, every Region.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(localStorage.getItem('lz_theme')==='dark')document.documentElement.setAttribute('data-theme','dark')}catch(e){}",
          }}
        />
      </head>
      <body className="flex min-h-full flex-col">
        <IdentityProvider>
          <SiteHeader />
          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">{children}</main>
          <footer className="mx-auto mt-10 w-full max-w-7xl px-4 py-8">
            <div className="hairline flex flex-wrap items-center gap-x-3 gap-y-1 pt-6 text-xs text-[var(--muted-2)]">
              <span className="display text-sm text-[var(--paper)]">LotZero</span>
              <span>·</span>
              <span>Aurora DSQL + DynamoDB on Vercel</span>
              <span>·</span>
              <span>built for H0: Hack the Zero</span>
            </div>
          </footer>
        </IdentityProvider>
      </body>
    </html>
  );
}
