import type { Metadata } from "next";
import localFont from "next/font/local";
import { DM_Mono } from "next/font/google";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  weight: ["300", "400", "500"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "The Garden — Your personal inspiration space",
  description:
    "A calm, minimal space to collect and revisit your inspirations. Images, texts, links and videos — cultivated, not just stored.",
  keywords: ["inspiration", "collection", "garden", "mood board", "creative"],
  openGraph: {
    title: "The Garden",
    description: "Your personal inspiration space",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        {/* Apply dark class before first paint to avoid flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('garden:theme');if(t==='dark')document.documentElement.classList.add('dark');}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${dmMono.variable} antialiased font-sans bg-white dark:bg-[#0A0A0A] text-garden-black dark:text-white transition-colors duration-200`}
      >
        {children}
      </body>
    </html>
  );
}
