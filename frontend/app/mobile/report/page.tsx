"use client";

import { useState } from "react";
import DesktopPage from "../../report/page";

export default function MobileReportPage() {
  const [sharing, setSharing] = useState(false);

  const handleKakaoShare = async () => {
    if (sharing) return;

    setSharing(true);
    try {
      const shareUrl = window.location.href;
      const shareTitle = "NOVA AI SPORTS PLATFORM 리포트";
      const shareText = "NOVA 모바일 리포트를 확인해 주세요.";

      if (navigator.share) {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        return;
      }

      await navigator.clipboard.writeText(shareUrl);
      window.alert("리포트 링크를 복사했습니다. 카카오톡에 붙여넣어 공유해 주세요.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      try {
        await navigator.clipboard.writeText(window.location.href);
        window.alert("리포트 링크를 복사했습니다. 카카오톡에 붙여넣어 공유해 주세요.");
      } catch {
        window.alert("공유할 리포트 링크를 복사하지 못했습니다.");
      }
    } finally {
      setSharing(false);
    }
  };

  return (
    <>
      <style>{`
        .dashboard-link { display: none !important; }

        .mobile-report-share {
          position: fixed;
          right: 18px;
          bottom: calc(18px + env(safe-area-inset-bottom));
          z-index: 1000;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 48px;
          padding: 0 18px;
          border: 0;
          border-radius: 999px;
          background: #fee500;
          color: #191919;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
          font: inherit;
          font-weight: 800;
          cursor: pointer;
        }

        .mobile-report-share:disabled {
          opacity: 0.65;
          cursor: wait;
        }

        .mobile-report-share-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #191919;
          color: #fee500;
          font-size: 13px;
          line-height: 1;
        }

        @media print {
          .mobile-report-share {
            display: none !important;
          }
        }
      `}</style>

      <button
        type="button"
        className="mobile-report-share"
        onClick={handleKakaoShare}
        disabled={sharing}
        aria-label="카카오톡으로 리포트 공유하기"
      >
        <span className="mobile-report-share-icon" aria-hidden="true">
          T
        </span>
        {sharing ? "공유 중..." : "카톡 공유하기"}
      </button>

      <DesktopPage />
    </>
  );
}
