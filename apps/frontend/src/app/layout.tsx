import type { Metadata } from "next";
import localFont from "next/font/local";

import "../styles/globals.css";

const bricolageGrotesque = localFont({
  variable: "--font-bricolage",
  src: [
    {
      path: "../../public/fonts/bricolage-grotesque-400.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/bricolage-grotesque-500.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../public/fonts/bricolage-grotesque-700.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../../public/fonts/bricolage-grotesque-800.woff2",
      weight: "800",
      style: "normal",
    },
  ],
});

const spaceMono = localFont({
  variable: "--font-space-mono",
  src: [
    {
      path: "../../public/fonts/space-mono-400.woff2",
      weight: "400",
      style: "normal",
    },
  ],
});

export const metadata: Metadata = {
  title: "dropsei • peer-to-peer file transfer",
  description:
    "Send files straight from your machine to theirs. No upload, no size limit, nothing stored in between.",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${bricolageGrotesque.variable} ${spaceMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
