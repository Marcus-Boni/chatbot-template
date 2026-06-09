import type { Metadata } from "next";
import { Geist, Geist_Mono, Bricolage_Grotesque } from "next/font/google";
import "./globals.css";
import "@copilotkit/react-ui/styles.css";
import { CopilotKit } from "@copilotkit/react-core";
import { appConfig } from "@/config/app.config";
import { AppShell } from "@/components/layout/AppShell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Distinctive display face — characterful, editorial grotesque used for the
// brand wordmark and headings (deliberately not Inter/Roboto/system).
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: `${appConfig.brand.name} · Meeting Copilot`,
  description:
    "Copilot de reuniões da " +
    appConfig.brand.name +
    ": pergunte em linguagem natural e receba respostas fundamentadas nas transcrições, sempre com a reunião e a data citadas.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} ${bricolage.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <div className="app-aurora" aria-hidden />
        <div className="app-grain" aria-hidden />
        <CopilotKit runtimeUrl="/api/copilotkit">
          <AppShell>{children}</AppShell>
        </CopilotKit>
      </body>
    </html>
  );
}
