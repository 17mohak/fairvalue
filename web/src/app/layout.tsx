import type { Metadata, Viewport } from "next";
import { Archivo, Big_Shoulders, Source_Serif_4 } from "next/font/google";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { siteUrl } from "@/lib/siteUrl";
import "./globals.css";

// Brand type (D-039): Big Shoulders, a condensed signage face, for display and big figures;
// Archivo, whose width axis gives both the interface (100) and the expanded broadcast labels
// (125); Source Serif 4 only for long-form reading in Stories and Methods. All OFL, self-hosted.
// next/font has no metrics for Big Shoulders, so it names a narrow system fallback itself.
const bigShoulders = Big_Shoulders({
  subsets: ["latin"],
  axes: ["opsz"],
  variable: "--font-big-shoulders",
  display: "swap",
  adjustFontFallback: false,
  fallback: ["Arial Narrow", "Roboto Condensed", "sans-serif"],
});
const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-archivo", display: "swap" });
const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-source-serif",
  display: "swap",
});

export const metadata: Metadata = {
  // Absolute base for canonical and share-image URLs. FAIRVALUE_SITE_URL is required for any
  // public deployment (see docs/DEPLOYMENT.md); unset, it is the local compose address.
  metadataBase: siteUrl(process.env.FAIRVALUE_SITE_URL),
  title: { default: "FairValue: football market value, measured and audited", template: "%s · FairValue" },
  description:
    "Estimate a footballer's Transfermarkt market value from match data, see why the model said so, and explore an audit of whether its errors differ for players from inside and outside UEFA.",
};

export const viewport: Viewport = { themeColor: "#0f1713", colorScheme: "dark" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" data-scroll-behavior="smooth" className={`${bigShoulders.variable} ${archivo.variable} ${sourceSerif.variable}`}>
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
