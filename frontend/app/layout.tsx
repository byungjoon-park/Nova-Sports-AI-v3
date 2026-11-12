import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { NovaSettingsProvider } from "./settings-context";
import NovaFeedbackSurface from "../components/NovaFeedbackSurface";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "KINOX | AI Sports Performance Platform",
    template: "%s | KINOX",
  },
  description:
    "선수 컨디션, 훈련, 부상 재활, 동작 분석을 하나로 관리하는 AI 스포츠 퍼포먼스 플랫폼",
  applicationName: "KINOX",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NovaSettingsProvider>
          {children}
          <NovaFeedbackSurface placement="players" />
        </NovaSettingsProvider>
      </body>
    </html>
  );
}