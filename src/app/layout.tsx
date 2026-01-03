import type { Metadata } from "next";
import { Lato, Crimson_Text } from "next/font/google";
import "./globals.css";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";

const lato = Lato({
  variable: "--font-lato",
  subsets: ["latin"],
  weight: ["300", "400", "700"],
});

const crimsonText = Crimson_Text({
  variable: "--font-crimson",
  subsets: ["latin"],
  weight: ["400", "600"],
});

export const metadata: Metadata = {
  title: "Ivan Leo - Blog",
  description: "Ivan rambles on about LLM reliability, evals and UX design",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          rel="alternate"
          type="application/rss+xml"
          title="Ivan Leo - Blog RSS"
          href="/rss.xml"
        />
      </head>
      <body
        className={`${lato.variable} ${crimsonText.variable} antialiased`}
      >
        {children}
        <GoogleAnalytics measurementId="G-MM8QMY5JWN" />
      </body>
    </html>
  );
}
