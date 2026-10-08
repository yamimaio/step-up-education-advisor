import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Step Up",
  description: "An AI advisor that recommends a leader's best next educational step.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
