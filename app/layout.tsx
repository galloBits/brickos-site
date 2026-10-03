import type { Metadata } from "next";
import "./globals.css";
import { NavBar } from "@/components/nav-bar";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "BrickOS — The Real Estate Operator OS",
  description: "AI assistants and working tools for every stage of a real estate deal, from off-market sourcing to exit.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <NavBar />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
