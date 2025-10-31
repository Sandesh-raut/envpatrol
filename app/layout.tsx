import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "EnvPatrol",
  description: "Catch your secrets before attackers do",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
