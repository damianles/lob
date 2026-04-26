import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { AdminViewAsBar } from "@/components/admin-view-as-bar";
import { AppNav } from "@/components/app-nav";
import { LobBrandMasthead } from "@/components/lob-brand-masthead";
import { DemoBanner } from "@/components/demo-banner";
import { DeployFingerprint } from "@/components/deploy-fingerprint";
import { AppProviders } from "@/components/providers/app-providers";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { RoleRibbon } from "@/components/role-ribbon";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lumber One Board | The #1 Lumber Load Board",
  description:
    "The load board built for forest products — mills, wholesalers, and carriers moving dimensional lumber, panels, and bulk wood with lane intelligence and verified booking.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased pb-16 lg:pb-0`}
      >
        <ClerkProvider>
          <AppProviders>
            <DemoBanner />
            <DeployFingerprint />
            <LobBrandMasthead />
            <AdminViewAsBar />
            <RoleRibbon />
            <AppNav />
            {children}
            <MobileBottomNav />
          </AppProviders>
        </ClerkProvider>
      </body>
    </html>
  );
}
