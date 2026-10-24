import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "intekchat | Next-Gen File Sharing & Private Encrypted Chat",
  description: "Share files directly at high speed without server limits. Anonymous room chat with zero login, self-destructing View-Once photos, and private encryption.",
  keywords: [
    "intekchat",
    "p2p file sharing",
    "snapdrop alternative",
    "klaklak alternative",
    "high speed file transfer",
    "webrtc file sharing",
    "encrypted chat",
    "end to end encryption",
    "e2ee chat without server",
    "view once images",
    "anonymous chat room",
    "clear chat"
  ],
  authors: [{ name: "intekchat" }],
  creator: "intekchat",
  publisher: "intekchat",
  metadataBase: new URL("https://intekchat.com"),
  alternates: {
    canonical: "/"
  },
  openGraph: {
    title: "intekchat | High-Speed File Sharing & Private Encrypted Chat",
    description: "Fast direct file drop and private encrypted chat rooms. No apps, no accounts, no server file storage.",
    url: "https://intekchat.com",
    siteName: "intekchat",
    locale: "en_US",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "intekchat | High-Speed File Sharing & Encrypted Chat",
    description: "Send any file directly at maximum network speed. Chat anonymously with View-Once photos and zero server footprints."
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1
    }
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/logo.png"
  }
};

export const viewport = {
  themeColor: "#070a12",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1
};

export default function RootLayout({ children }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "intekchat",
    "operatingSystem": "Web, Android, iOS, Windows, macOS, Linux",
    "applicationCategory": "CommunicationApplication",
    "description": "Ultra-fast direct file sharing and private encrypted instant chat without server storage.",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    }
  };

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
