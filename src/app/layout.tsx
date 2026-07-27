import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SessionProvider from "@/components/SessionProvider";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: {
    default: "MedWare — AI Medical Consultation Platform",
    template: "%s · MedWare",
  },
  description:
    "Get AI-powered medical second opinions reviewed by qualified physicians. Consultations, visits and clinical documents in one calm, secure workspace.",
  applicationName: "MedWare",
  keywords: [
    "medical second opinion",
    "telemedicine",
    "AI consultation",
    "physician review",
  ],
  openGraph: {
    title: "MedWare — AI Medical Consultation Platform",
    description:
      "AI-assisted medical consultations, reviewed and approved by qualified physicians.",
    siteName: "MedWare",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#254ceb",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">
        <SessionProvider>
          <a
            href="#main-content"
            className="btn-primary sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100]"
          >
            Skip to content
          </a>
          <Navbar />
          <main
            id="main-content"
            className="min-h-[calc(100vh-var(--nav-height))]"
          >
            {children}
          </main>
          <Footer />
        </SessionProvider>
      </body>
    </html>
  );
}
