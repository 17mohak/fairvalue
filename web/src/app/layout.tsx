import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed, Source_Serif_4 } from "next/font/google";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import "./globals.css";

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-barlow-condensed",
  display: "swap",
});
const barlow = Barlow({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-barlow", display: "swap" });
const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-source-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "FairValue: football market value, measured and audited", template: "%s · FairValue" },
  description:
    "Estimate a footballer's Transfermarkt market value from match data, see why the model said so, and explore an audit of whether its errors differ for players from inside and outside UEFA.",
};

export const viewport: Viewport = { themeColor: "#0f1713", colorScheme: "dark" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" data-scroll-behavior="smooth" className={`${barlowCondensed.variable} ${barlow.variable} ${sourceSerif.variable}`}>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
