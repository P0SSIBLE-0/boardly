import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Boardly — Collaborative Whiteboards",
  description:
    "Collaborative whiteboard. Start drawing instantly, bring your team in when you're ready.",

  openGraph: {
    title: "Boardly — Collaborative Whiteboards",
    description:
      "Collaborative whiteboard. Start drawing instantly, bring your team in when you're ready.",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "Boardly",
      },
    ],
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Boardly — Collaborative Whiteboards",
    description:
      "Collaborative whiteboard. Start drawing instantly, bring your team in when you're ready.",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "Boardly",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="flex min-h-dvh flex-col bg-background font-sans text-foreground">
        {children}
      </body>
    </html>
  );
}
