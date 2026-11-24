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
  title: {
    default: "intekchat & intekdrop | Ultra-Fast P2P File Sharing & Private Encrypted Chat",
    template: "%s | intekchat"
  },
  description: "Share files directly at maximum network speed and chat privately with end-to-end encryption. Zero login, no app installation, self-destructing View-Once media, and zero server storage. Free open-source AirDrop alternative for Windows, Android, Mac, and iOS.",
  keywords: [
    "intekchat",
    "intekdrop",
    "airdrop for windows",
    "airdrop alternative for android",
    "p2p file sharing",
    "snapdrop alternative",
    "send large files online free",
    "webrtc file transfer",
    "encrypted chat room",
    "end to end encryption",
    "e2ee private messaging",
    "view once photos",
    "anonymous chat online",
    "no login file share",
    "local network transfer",
    "cross platform file sharing",
    "browser to browser file transfer"
  ],
  authors: [{ name: "intekchat" }],
  creator: "intekchat",
  publisher: "intekchat",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://intekchat.vercel.app"),
  alternates: {
    canonical: "/"
  },
  category: "technology",
  classification: "File Sharing & Private Communication Tool",
  openGraph: {
    title: "intekchat & intekdrop | Ultra-Fast P2P File Sharing & Encrypted Chat",
    description: "Direct peer-to-peer file sharing and private encrypted rooms without server storage. Works on any browser, PC, Mac, iPhone, and Android.",
    url: "https://intekchat.vercel.app",
    siteName: "intekchat",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "intekchat & intekdrop - P2P File Sharing and Private Encrypted Chat",
        type: "image/png"
      }
    ],
    locale: "en_US",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "intekchat & intekdrop | Ultra-Fast P2P File Sharing & Encrypted Chat",
    description: "Direct peer-to-peer file sharing and private encrypted rooms without server storage. Free AirDrop alternative for all platforms.",
    images: ["/og-image.png"]
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
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/icon-96.png", sizes: "96x96", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" }
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png"
  },
  manifest: "/manifest.webmanifest",
  verification: {
    google: "V8f0J8ZCCksA3QqysLVFYCU6PckCFFdtCt34JiR86vs"
  }
};

export const viewport = {
  themeColor: "#070a12",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  interactiveWidget: "resizes-content"
};

export default function RootLayout({ children }) {
  const jsonLdWebapp = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "intekchat & intekdrop",
    "alternateName": ["intekchat", "intekdrop"],
    "url": "https://intekchat.vercel.app",
    "applicationCategory": "CommunicationApplication",
    "operatingSystem": "Web, Windows, macOS, Linux, iOS, Android",
    "description": "Ultra-fast direct P2P file sharing and private encrypted instant chat without server storage. Works across all operating systems via WebRTC.",
    "browserRequirements": "Requires WebRTC and JavaScript enabled",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "featureList": [
      "Direct WebRTC gigabit P2P file transfers",
      "AES-256-GCM End-to-End Encrypted Chat",
      "Self-destructing View-Once photos",
      "Zero server file storage or chat logs",
      "Instant QR code room & file pairing",
      "Works across Windows, Android, Mac, iOS, and Linux"
    ]
  };

  const jsonLdOrg = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "intekchat",
    "url": "https://intekchat.vercel.app",
    "logo": "https://intekchat.vercel.app/icon-512.png",
    "sameAs": [
      "https://github.com/Intekhab-Ansari/IntekChat"
    ]
  };

  const jsonLdFaq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What is IntekDrop?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "IntekDrop is a free, open-source peer-to-peer (P2P) file sharing tool inspired by AirDrop and Snapdrop. It lets devices on the same local network or anywhere on the internet transfer files directly to each other at maximum speed via WebRTC DataChannels with zero file size limits and zero server storage."
        }
      },
      {
        "@type": "Question",
        "name": "What is IntekChat?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "IntekChat is a private, ephemeral room chat application featuring client-side AES-256-GCM end-to-end encryption, password-protected rooms, self-destructing View-Once media, and auto-delete room timers. No phone numbers, emails, or accounts are required."
        }
      },
      {
        "@type": "Question",
        "name": "Do I need to install an app or register an account?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "No. IntekChat and IntekDrop work 100% inside any modern web browser on Windows, Mac, iPhone, iPad, Android, and Linux. No app downloads, accounts, or logins are needed."
        }
      },
      {
        "@type": "Question",
        "name": "Are my files or messages stored on a server?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Never. All file transfers stream directly between devices via encrypted WebRTC DataChannels. Messages are encrypted locally in your browser with AES-256-GCM before transmission. Our signaling infrastructure has zero knowledge of your encryption keys and stores zero files or chat messages."
        }
      },
      {
        "@type": "Question",
        "name": "Can I transfer files between Windows, iPhone, and Android?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes! IntekDrop works seamlessly across different operating systems. Just open intekdrop.vercel.app on both devices, or scan the QR code to pair them instantly."
        }
      }
    ]
  };

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdWebapp) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdOrg) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
