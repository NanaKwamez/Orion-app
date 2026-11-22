import type { Metadata } from "next";
import "./globals.css";
import PwaRegister from "@/components/pwa/register";

export const metadata: Metadata = {
  title: "ORION Finance",
  description: "Church finance recording for North Ghana Mission",
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className="min-h-full bg-slate-50 text-slate-950 antialiased dark:bg-slate-950 dark:text-slate-100">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
