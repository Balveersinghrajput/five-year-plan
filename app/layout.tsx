import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "5-Year Training Plan | Technical Skills Tracker",
  description: "Track your 5-year journey mastering System Design, Fullstack, AI/ML, Generative AI, MLOps and more.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
