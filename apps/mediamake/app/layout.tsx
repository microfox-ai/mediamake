import type { Metadata, Viewport } from "next";
import { Afacad_Flux, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { DisclaimerBanner } from "@/components/disclaimer-banner";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/next"

// Brand typeface (see the mediamake brand guide).
const afacadFlux = Afacad_Flux({
  variable: "--font-afacad-flux",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Icons come from the brand kit's favicon set, copied into public/brand/.
export const metadata: Metadata = {
  title: "MediaMake",
  description: "MCPs, skills, apps and tutorials for making content.",
  icons: {
    icon: [
      { url: "/brand/favicon.ico", sizes: "32x32" },
      { url: "/brand/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/brand/apple-touch-icon.png",
  },
  manifest: "/brand/site.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${afacadFlux.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Toaster duration={500} richColors />
      </body>
    </html>
  );
}
