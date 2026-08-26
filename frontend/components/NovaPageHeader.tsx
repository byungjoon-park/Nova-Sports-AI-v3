"use client";

import { useRouter } from "next/navigation";
import { useNovaSettings } from "../app/settings-context";

type NovaPageHeaderProps = {
  showBack?: boolean;
};

export default function NovaPageHeader({ showBack = true }: NovaPageHeaderProps) {
  const router = useRouter();
  const { language } = useNovaSettings();

  const labels = {
    ko: { back: "뒤로가기", home: "홈으로" },
    en: { back: "Back", home: "Home" },
    ja: { back: "戻る", home: "ホーム" },
  }[language];

  return (
    <header className="nova-page-header">
      {showBack && (
        <button
          className="nova-back-button"
          type="button"
          aria-label={labels.back}
          onClick={() => router.back()}
        >
          ←
        </button>
      )}

      <button
        className="nova-brand nova-brand-button"
        type="button"
        aria-label={labels.home}
        onClick={() => router.push("/")}
      >
        <strong>NOVA</strong>
        <span>AI SPORTS PERFORMANCE PLATFORM</span>
      </button>

      <span className="nova-system-dot" />
    </header>
  );
}
