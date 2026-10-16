"use client";

import { useEffect, useRef, useState } from "react";
import DesktopPage from "../../report/page";

type Html2Canvas = (
  element: HTMLElement,
  options?: {
    backgroundColor?: string;
    scale?: number;
    useCORS?: boolean;
    allowTaint?: boolean;
    logging?: boolean;
    width?: number;
    height?: number;
    windowWidth?: number;
    windowHeight?: number;
  },
) => Promise<HTMLCanvasElement>;

declare global {
  interface Window {
    html2canvas?: Html2Canvas;
  }
}

let html2canvasLoader: Promise<Html2Canvas> | null = null;

function collectPrintCss(): string {
  const chunks: string[] = [];

  for (const sheet of Array.from(document.styleSheets)) {
    try {
      for (const rule of Array.from(sheet.cssRules)) {
        if (
          rule instanceof CSSMediaRule &&
          rule.conditionText.includes("print")
        ) {
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

function loadHtml2Canvas(): Promise<Html2Canvas> {
  const loadedHtml2Canvas = window.html2canvas;

  if (loadedHtml2Canvas) return Promise.resolve(loadedHtml2Canvas);
  if (html2canvasLoader) return html2canvasLoader;

  html2canvasLoader = new Promise<Html2Canvas>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-nova-html2canvas="true"]',
    );

    if (existing) {
      const existingModule = window.html2canvas;

      if (existingModule) {
        resolve(existingModule);
        return;
      }

      existing.addEventListener(
        "load",
        () => {
          const loadedModule = window.html2canvas;
          if (loadedModule) resolve(loadedModule);
          else reject(new Error("PNG 변환 모듈을 불러오지 못했습니다."));
        },
        { once: true },
      );

      existing.addEventListener(
        "error",
        () => reject(new Error("PNG 변환 모듈을 불러오지 못했습니다.")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
    script.async = true;
    script.dataset.novaHtml2canvas = "true";

    script.onload = () => {
      const loadedModule = window.html2canvas;
      if (loadedModule) resolve(loadedModule);
      else reject(new Error("PNG 변환 모듈을 불러오지 못했습니다."));
    };

    script.onerror = () =>
      reject(new Error("PNG 변환 모듈을 불러오지 못했습니다."));

    document.head.appendChild(script);
  }).catch((error: unknown) => {
    html2canvasLoader = null;
    throw error;
  });

  return html2canvasLoader;
}

async function waitForImages(root: HTMLElement): Promise<void> {
  await Promise.all(
    Array.from(root.querySelectorAll("img")).map((image) => {
      if (image.complete) return Promise.resolve();

      return new Promise<void>((resolve) => {
        image.addEventListener("load", () => resolve(), { once: true });
        image.addEventListener("error", () => resolve(), { once: true });
      });
    }),
  );
}

async function elementToPng(
  element: HTMLElement,
  html2canvas: Html2Canvas,
): Promise<Blob> {
  const rect = element.getBoundingClientRect();
  const width = Math.ceil(rect.width) || 794;
  const height = Math.ceil(rect.height) || 1123;
  const clone = element.cloneNode(true) as HTMLElement;

  clone.classList.add("nova-share-capture-page");
  Object.assign(clone.style, {
    display: "block",
    position: "relative",
    left: "0",
    top: "0",
    width: `${width}px`,
    height: `${height}px`,
    margin: "0",
    transform: "none",
    breakAfter: "auto",
    pageBreakAfter: "auto",
  });

  const host = document.createElement("div");
  host.className = "nova-share-capture-host";
  Object.assign(host.style, {
    position: "fixed",
    left: "0",
    top: "0",
    width: `${width}px`,
    height: `${height}px`,
    overflow: "hidden",
    background: "#fff",
    zIndex: "2147483647",
    pointerEvents: "none",
  });

  const style = document.createElement("style");
  style.textContent = `
    ${collectPrintCss()}
    .nova-share-capture-host,
    .nova-share-capture-host * { box-sizing: border-box; }
    .nova-share-capture-host .nova-share-capture-page {
      display: block !important;
      width: ${width}px !important;
      height: ${height}px !important;
      min-height: ${height}px !important;
      max-height: ${height}px !important;
      overflow: hidden !important;
      background: #fff !important;
    }
    .nova-share-capture-host .print-result-page {
      break-after: auto !important;
      page-break-after: auto !important;
    }

    /* Stabilize the motion radar chart during PNG capture.
       Print CSS uses physical mm units that can be mis-scaled by canvas capture. */
    .nova-share-capture-host .motion-radar {
      position: relative !important;
      width: 220px !important;
      height: 220px !important;
      min-width: 220px !important;
      min-height: 220px !important;
      margin: 0 auto !important;
      overflow: visible !important;
    }

    .nova-share-capture-host .motion-radar-ring {
      position: absolute !important;
      left: 50% !important;
      top: 50% !important;
      transform: translate(-50%, -50%) !important;
      border: 1px solid #d9e0ea !important;
      border-radius: 50% !important;
    }

    .nova-share-capture-host .motion-radar-ring.ring-1 {
      width: 64px !important;
      height: 64px !important;
    }

    .nova-share-capture-host .motion-radar-ring.ring-2 {
      width: 116px !important;
      height: 116px !important;
    }

    .nova-share-capture-host .motion-radar-ring.ring-3 {
      width: 168px !important;
      height: 168px !important;
    }

    .nova-share-capture-host .motion-radar-ring.ring-4 {
      width: 220px !important;
      height: 220px !important;
    }

    .nova-share-capture-host .motion-radar-axis {
      position: absolute !important;
      left: 50% !important;
      top: 50% !important;
      width: 110px !important;
      height: 1px !important;
      background: #d9e0ea !important;
      transform-origin: left center !important;
    }

    .nova-share-capture-host .motion-radar-axis.axis-v {
      transform: rotate(-90deg) !important;
    }

    .nova-share-capture-host .motion-radar-axis.axis-h {
      transform: rotate(0deg) !important;
    }

    .nova-share-capture-host .motion-radar-axis.axis-d1 {
      transform: rotate(-36deg) !important;
    }

    .nova-share-capture-host .motion-radar-axis.axis-d2 {
      transform: rotate(36deg) !important;
    }

    .nova-share-capture-host .motion-radar svg {
      position: absolute !important;
      left: 10px !important;
      top: 10px !important;
      width: 200px !important;
      height: 200px !important;
      inset: auto !important;
    }

    .nova-share-capture-host .motion-radar .radar-label {
      position: absolute !important;
      font-size: 11px !important;
      line-height: 1.2 !important;
      white-space: nowrap !important;
      color: #64748b !important;
    }

    .nova-share-capture-host .motion-radar .radar-top {
      top: -14px !important;
      left: 50% !important;
      transform: translateX(-50%) !important;
    }

    .nova-share-capture-host .motion-radar .radar-right-top {
      top: 42px !important;
      right: -38px !important;
    }

    .nova-share-capture-host .motion-radar .radar-right-bottom {
      bottom: 35px !important;
      right: -24px !important;
    }

    .nova-share-capture-host .motion-radar .radar-left-bottom {
      bottom: 35px !important;
      left: -24px !important;
    }

    .nova-share-capture-host .motion-radar .radar-left-top {
      top: 42px !important;
      left: -38px !important;
    }
  `;

  host.append(style, clone);
  document.body.appendChild(host);

  try {
    await waitForImages(clone);
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

    const canvas = await html2canvas(clone, {
      backgroundColor: "#ffffff",
      scale: Math.min(2, Math.max(1, window.devicePixelRatio || 1)),
      useCORS: true,
      allowTaint: false,
      logging: false,
      width,
      height,
      windowWidth: Math.max(document.documentElement.clientWidth, width),
      windowHeight: Math.max(document.documentElement.clientHeight, height),
    });

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("PNG 변환에 실패했습니다."));
        },
        "image/png",
        1,
      );
    });
  } finally {
    host.remove();
  }
}

async function createReportImages(): Promise<File[]> {
  const pages = Array.from(
    document.querySelectorAll<HTMLElement>(".print-result-page"),
  ).slice(0, 3);

  if (pages.length !== 3) {
    throw new Error("리포트 결과지 3페이지를 찾을 수 없습니다.");
  }

  const html2canvas = await loadHtml2Canvas();
  const files: File[] = [];

  for (let index = 0; index < pages.length; index += 1) {
    const blob = await elementToPng(pages[index], html2canvas);
    files.push(
      new File([blob], `NOVA-Report-${index + 1}.png`, {
        type: "image/png",
      }),
    );
  }

  return files;
}

function downloadFiles(files: File[]): void {
  files.forEach((file, index) => {
    const url = URL.createObjectURL(file);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = file.name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    window.setTimeout(() => URL.revokeObjectURL(url), 1500 * (index + 1));
  });
}

export default function MobileReportPage() {
  const [sharing, setSharing] = useState(false);
  const sharingRef = useRef(false);

  useEffect(() => {
    const printButton =
      document.querySelector<HTMLButtonElement>(".print-button");
    if (!printButton) return;

    const originalText = printButton.textContent;
    const originalClassName = printButton.className;

    const handleShare = async (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      if (sharingRef.current) return;
      sharingRef.current = true;
      setSharing(true);

      try {
        const files = await createReportImages();

        // Windows desktop browsers cannot reliably hand off image files
        // from the Web Share sheet to KakaoTalk's chat composer.
        const isWindows =
          /Windows/i.test(navigator.userAgent) &&
          !/Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

        if (isWindows) {
          downloadFiles(files);
          window.alert(
            "결과지 PNG 3장을 다운로드했습니다. 다운로드 폴더에서 3개 파일을 확인한 뒤 카카오톡 채팅방에 직접 첨부해 주세요.",
          );
          return;
        }

        if (navigator.share && navigator.canShare?.({ files })) {
          await navigator.share({
            title: "NOVA AI SPORTS PLATFORM 결과지",
            text: "NOVA 리포트 결과지 3페이지",
            files,
          });
          return;
        }

        downloadFiles(files);
        window.alert(
          "결과지 PNG 3장을 다운로드했습니다. 저장된 이미지를 카카오톡에서 공유해 주세요.",
        );
      } catch (error: unknown) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        window.alert(
          error instanceof Error
            ? error.message
            : "결과지 이미지를 공유하지 못했습니다.",
        );
      } finally {
        sharingRef.current = false;
        setSharing(false);
      }
    };

    printButton.textContent = sharing ? "변환 중…" : "카톡 공유";
    printButton.classList.add("kakao-share-button");
    printButton.disabled = sharing;
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
        .dashboard-link { display: none !important; }
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
          .print-button.kakao-share-button { display: none !important; }
        }
      `}</style>
      <DesktopPage />
    </>
  );
}
