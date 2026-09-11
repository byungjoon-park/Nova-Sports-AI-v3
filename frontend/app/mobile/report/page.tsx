"use client";

import { useEffect, useState } from "react";
import DesktopPage from "../../report/page";

type CapturedPage = {
  blob: Blob;
  file: File;
};

function collectPrintCss() {
  const chunks: string[] = [];

  for (const sheet of Array.from(document.styleSheets)) {
    try {
      for (const rule of Array.from(sheet.cssRules)) {
        if (rule instanceof CSSMediaRule && rule.conditionText.includes("print")) {
          for (const nested of Array.from(rule.cssRules)) {
            chunks.push(nested.cssText);
          }
        }
      }
    } catch {
      // Ignore stylesheets that the browser does not expose to CSSOM.
    }
  }

  return chunks.join("\n");
}

async function waitForImages(root: HTMLElement) {
  const images = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    images.map(
      (image) =>
        image.complete
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              image.addEventListener("load", () => resolve(), { once: true });
              image.addEventListener("error", () => resolve(), { once: true });
            }),
    ),
  );
}

async function elementToPng(element: HTMLElement): Promise<Blob> {
  const rect = element.getBoundingClientRect();
  const width = Math.ceil(rect.width);
  const height = Math.ceil(rect.height);
  const scale = Math.min(2, Math.max(1, window.devicePixelRatio || 1));

  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.display = "block";
  clone.style.position = "relative";
  clone.style.left = "0";
  clone.style.top = "0";
  clone.style.width = `${width}px`;
  clone.style.height = `${height}px`;
  clone.style.margin = "0";
  clone.style.transform = "none";

  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "-100000px";
  host.style.top = "0";
  host.style.width = `${width}px`;
  host.style.height = `${height}px`;
  host.style.overflow = "hidden";
  host.style.background = "#fff";
  host.style.zIndex = "-1";

  const style = document.createElement("style");
  style.textContent = collectPrintCss();

  host.append(style, clone);
  document.body.appendChild(host);

  try {
    await waitForImages(clone);

    const serialized = new XMLSerializer().serializeToString(clone);
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" xmlns:xhtml="http://www.w3.org/1999/xhtml"
           width="${width * scale}" height="${height * scale}"
           viewBox="0 0 ${width} ${height}">
        <rect width="100%" height="100%" fill="#fff"/>
        <foreignObject x="0" y="0" width="${width}" height="${height}">
          <div xmlns="http://www.w3.org/1999/xhtml"
               style="width:${width}px;height:${height}px;background:#fff;">
            ${serialized}
          </div>
        </foreignObject>
      </svg>
    `;

    const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);

    try {
      const image = new Image();
      image.decoding = "async";
      image.src = svgUrl;
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("결과지 이미지를 생성하지 못했습니다."));
      });

      const canvas = document.createElement("canvas");
      canvas.width = width * scale;
      canvas.height = height * scale;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("이미지 캔버스를 만들 수 없습니다.");

      context.fillStyle = "#fff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      return await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error("PNG 변환에 실패했습니다."))),
          "image/png",
          1,
        );
      });
    } finally {
      URL.revokeObjectURL(svgUrl);
    }
  } finally {
    host.remove();
  }
}

async function createReportImages(): Promise<CapturedPage[]> {
  const pages = Array.from(
    document.querySelectorAll<HTMLElement>(".print-result-page"),
  ).slice(0, 3);

  if (pages.length !== 3) {
    throw new Error("리포트 결과지 3페이지를 찾을 수 없습니다.");
  }

  const captured: CapturedPage[] = [];

  for (let index = 0; index < pages.length; index += 1) {
    const blob = await elementToPng(pages[index]);
    captured.push({
      blob,
      file: new File([blob], `NOVA-Report-${index + 1}.png`, {
        type: "image/png",
      }),
    });
  }

  return captured;
}

export default function MobileReportPage() {
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    const printButton = document.querySelector<HTMLButtonElement>(".print-button");
    if (!printButton) return;

    const originalText = printButton.textContent;
    const originalClassName = printButton.className;

    const handleShare = async (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      if (sharing) return;
      setSharing(true);

      try {
        const captured = await createReportImages();
        const files = captured.map((item) => item.file);

        if (navigator.share && navigator.canShare?.({ files })) {
          await navigator.share({
            title: "NOVA AI SPORTS PLATFORM 결과지",
            text: "NOVA 리포트 결과지 3페이지",
            files,
          });
          return;
        }

        for (const item of captured) {
          const url = URL.createObjectURL(item.blob);
          const anchor = document.createElement("a");
          anchor.href = url;
          anchor.download = item.file.name;
          document.body.appendChild(anchor);
          anchor.click();
          anchor.remove();
          URL.revokeObjectURL(url);
        }

        window.alert(
          "결과지 3페이지 이미지를 저장했습니다. 저장된 3장의 이미지를 카카오톡에서 공유해 주세요.",
        );
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;

        window.alert(
          error instanceof Error
            ? error.message
            : "결과지 이미지를 공유하지 못했습니다.",
        );
      } finally {
        setSharing(false);
      }
    };

    printButton.textContent = "카톡 공유";
    printButton.classList.add("kakao-share-button");
    printButton.disabled = false;
    printButton.addEventListener("click", handleShare, true);

    return () => {
      printButton.removeEventListener("click", handleShare, true);
      printButton.textContent = originalText;
      printButton.className = originalClassName;
      printButton.disabled = false;
    };
  }, [sharing]);

  return (
    <>
      <style>{`
        .dashboard-link {
          display: none !important;
        }

        .print-button.kakao-share-button {
          background: #fee500 !important;
          color: #191919 !important;
          border-color: #fee500 !important;
          font-weight: 800;
        }

        .print-button.kakao-share-button::before {
          content: "T";
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          margin-right: 7px;
          border-radius: 50%;
          background: #191919;
          color: #fee500;
          font-size: 11px;
          font-weight: 900;
          line-height: 1;
        }

        @media print {
          .print-button.kakao-share-button {
            display: none !important;
          }
        }
      `}</style>

      <DesktopPage />
    </>
  );
}
