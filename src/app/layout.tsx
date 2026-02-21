import type { Metadata } from "next";
import "./globals.css";
import SessionProvider from "@/components/SessionProvider";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "MedWare - AI Medical Consultation Platform",
  description:
    "Get AI-powered medical second opinions reviewed by qualified physicians",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <SessionProvider>
          <Navbar />
          <main className="min-h-[calc(100vh-64px)]">{children}</main>
        </SessionProvider>
      </body>
    </html>
  );
}
