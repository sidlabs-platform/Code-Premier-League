import type { Metadata } from "next";
import { Inter, Roboto_Condensed } from "next/font/google";
import "@/app/globals.css";

const bodyFont = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const displayFont = Roboto_Condensed({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Code Premier League",
    template: "%s · CPL",
  },
  description:
    "An unofficial educational cricket auction with live bidding and explainable squad scoring.",
};

const designContract = `<!--
THESIS: A live broadcast control room, not a generic gaming dashboard; every important state reads like a cue the host can act on.
OWN-WORLD: Matte ink panels, paper-white data fields, coral command keys, lime tally lights, hairline channels, and large tabular auction numerals.
STORY: Visitors understand the unofficial educational format, join or host immediately, then follow one authoritative signal from quiz through auction to score.
FIRST VIEWPORT: The landing mechanism fills the frame: live room status left, decisive join and host controls center, three-step match rundown below.
FORM: Broadcast production switcher, grounded direction 3, staged as a registration console; seed 3b1e2c50.
-->`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${bodyFont.variable} ${displayFont.variable}`}>
        <div
          aria-hidden="true"
          className="design-contract"
          dangerouslySetInnerHTML={{ __html: designContract }}
        />
        {children}
      </body>
    </html>
  );
}
