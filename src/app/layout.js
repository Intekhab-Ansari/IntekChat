import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const instant = false;

export async function generateMetadata() {
  let host = "intekchat.vercel.app";
  try {
    const headerList = await headers();
    const reqHost = headerList.get("x-forwarded-host") || headerList.get("host");
    if (reqHost) host = reqHost;
  } catch (e) {}

  const protocol = host.includes("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;
  const isDrop = host.toLowerCase().includes("intekdrop") || host.toLowerCase().includes("drop");

  const siteName = isDrop ? "intekdrop" : "intekchat";
  const titleDefault = isDrop
    ? "intekdrop | Ultra-Fast P2P File Sharing & Local AirDrop Alternative"
    : "intekchat | Next-Gen File Sharing & Private Encrypted Chat";
  const titleTemplate = isDrop ? "%s | intekdrop" : "%s | intekchat";
  const description = isDrop
    ? "Transfer large files directly between PC, Mac, Android, and iPhone with zero file size limits, zero login, and maximum network speed via WebRTC. Free open-source AirDrop and Snapdrop alternative with zero server storage."
    : "Share files directly at maximum network speed and chat privately with client-side AES-256-GCM encryption. Zero login, no app installation, self-destructing View-Once media, and zero server storage. Free open-source AirDrop alternative for Windows, Android, Mac, and iOS.";

  const keywords = isDrop
    ? [
        "intekdrop",
        "airdrop for windows",
        "airdrop alternative for android",
        "snapdrop alternative",
        "p2p file sharing",
        "webrtc file transfer",
        "send large files online free",
        "send files between phone and pc",
        "local network transfer",
        "cross platform file sharing",
        "browser to browser file transfer",
        "instant file share",
        "no login file share",
        "zero size limit file share",
        "intekchat"
      ]
    : [
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
      ];

  return {
    title: {
      default: titleDefault,
      template: titleTemplate,
    },
    description,
    keywords,
    authors: [{ name: siteName }],
    creator: siteName,
    publisher: siteName,
    metadataBase: new URL(baseUrl),
    alternates: {
      canonical: "/",
    },
    category: "technology",
    classification: isDrop
      ? "P2P File Transfer & AirDrop Alternative"
      : "File Sharing & Private Communication Tool",
    openGraph: {
      title: titleDefault,
      description,
      url: baseUrl,
      siteName,
      images: [
        {
          url: "/og-image.png",
          width: 1200,
          height: 630,
          alt: `${siteName} - Ultra-Fast P2P File Sharing & Private Encrypted Chat`,
          type: "image/png",
        },
      ],
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: titleDefault,
      description,
      images: ["/og-image.png"],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "any" },
        { url: "/favicon.svg", type: "image/svg+xml" },
        { url: "/icon-48.png", sizes: "48x48", type: "image/png" },
        { url: "/icon-96.png", sizes: "96x96", type: "image/png" },
        { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      ],
      shortcut: "/favicon.ico",
      apple: "/apple-touch-icon.png",
    },
    manifest: "/manifest.webmanifest",
    verification: {
      google: "V8f0J8ZCCksA3QqysLVFYCU6PckCFFdtCt34JiR86vs",
    },
  };
}

export const viewport = {
  themeColor: "#070a12",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  interactiveWidget: "resizes-content"
};

export default async function RootLayout({ children }) {
  let host = "intekchat.vercel.app";
  try {
    const headerList = await headers();
    const reqHost = headerList.get("x-forwarded-host") || headerList.get("host");
    if (reqHost) host = reqHost;
  } catch (e) {}

  const protocol = host.includes("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;
  const isDrop = host.toLowerCase().includes("intekdrop") || host.toLowerCase().includes("drop");

  const siteName = isDrop ? "intekdrop" : "intekchat";
  const alternateName = isDrop
    ? ["intekdrop", "intekchat", "AirDrop for Windows & Android"]
    : ["intekchat", "intekdrop"];

  const jsonLdWebapp = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": isDrop ? "intekdrop" : "intekchat & intekdrop",
    "alternateName": alternateName,
    "url": baseUrl,
    "applicationCategory": isDrop ? "UtilitiesApplication" : "CommunicationApplication",
    "operatingSystem": "Web, Windows, macOS, Linux, iOS, Android",
    "description": isDrop
      ? "Ultra-fast direct P2P file sharing with zero file size limits and zero server storage. Free open-source AirDrop alternative for PC, Mac, Android, and iPhone."
      : "Ultra-fast direct P2P file sharing and private encrypted instant chat without server storage. Works across all operating systems via WebRTC.",
    "browserRequirements": "Requires WebRTC and JavaScript enabled",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
    },
    "featureList": [
      "Direct WebRTC gigabit P2P file transfers",
      "Zero file size limits and zero server storage",
      "Instant QR code room & file pairing",
      "Works across Windows, Android, Mac, iOS, and Linux",
      "AES-256-GCM End-to-End Encrypted Chat",
      "Self-destructing View-Once photos",
    ],
  };

  const jsonLdOrg = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": siteName,
    "url": baseUrl,
    "logo": `${baseUrl}/icon-512.png`,
    "sameAs": [
      "https://github.com/Intekhab-Ansari/IntekChat",
    ],
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
          "text": "IntekDrop is a free, open-source peer-to-peer (P2P) file sharing tool inspired by AirDrop and Snapdrop. It lets devices on the same local network or anywhere on the internet transfer files directly to each other at maximum speed via WebRTC DataChannels with zero file size limits and zero server storage.",
        },
      },
      {
        "@type": "Question",
        "name": "What is IntekChat?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "IntekChat is a private, ephemeral room chat application featuring client-side AES-256-GCM end-to-end encryption, password-protected rooms, self-destructing View-Once media, and auto-delete room timers. No phone numbers, emails, or accounts are required.",
        },
      },
      {
        "@type": "Question",
        "name": "Do I need to install an app or register an account?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "No. IntekChat and IntekDrop work 100% inside any modern web browser on Windows, Mac, iPhone, iPad, Android, and Linux. No app downloads, accounts, or logins are needed.",
        },
      },
      {
        "@type": "Question",
        "name": "Are my files or messages stored on a server?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Never. All file transfers stream directly between devices via encrypted WebRTC DataChannels. Messages are encrypted locally in your browser with AES-256-GCM before transmission. Our signaling infrastructure has zero knowledge of your encryption keys and stores zero files or chat messages.",
        },
      },
      {
        "@type": "Question",
        "name": "Can I transfer files between Windows, iPhone, and Android?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes! IntekDrop works seamlessly across different operating systems. Just open intekdrop.vercel.app on both devices, or scan the QR code to pair them instantly.",
        },
      },
    ],
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
      <body>
        {children}
        {/* Semantic crawler accessibility container */}
        <section className="sr-only" aria-label="About and FAQ">
          <h2>{isDrop ? "IntekDrop: Ultra-Fast P2P File Sharing & AirDrop Alternative" : "IntekChat: Private Encrypted Chat & Ultra-Fast File Sharing"}</h2>
          <p>
            {isDrop
              ? "IntekDrop enables instant peer-to-peer file transfer directly between browsers on Windows, Android, Mac, and iOS. Zero file size limits, zero server storage, and direct gigabit WebRTC DataChannels."
              : "IntekChat provides client-side encrypted ephemeral rooms, view-once photos, and direct peer-to-peer file transfers with zero registration and zero server logs."}
          </p>
          <h3>Frequently Asked Questions</h3>
          <dl>
            <dt>What is IntekDrop?</dt>
            <dd>IntekDrop is a free, open-source peer-to-peer (P2P) file sharing tool inspired by AirDrop and Snapdrop.</dd>
            <dt>What is IntekChat?</dt>
            <dd>IntekChat is a private, ephemeral room chat application featuring client-side AES-256-GCM end-to-end encryption.</dd>
            <dt>Is any account or app required?</dt>
            <dd>No. Both work entirely in browser on all mobile and desktop platforms.</dd>
          </dl>
        </section>
      </body>
    </html>
  );
}
