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

function collectPrintCss() {
  const chunks: string[] = [];

  for (const sheet of Array.from(document.styleSheets)) {
    try {
      for (const rule of Array.from(sheet.cssRules)) {
        if (rule instanceof CSSMediaRule && rule.conditionText.includes("print")) {
          for (const nested of Array.from(rule.cssRules)) chunks.push(nested.cssText);
        }
      }
    } catch {
      // Ignore stylesheets that the browser does not expose to CSSOM.
    }
  }

  return chunks.join("\n");
}

function loadHtml2Canvas(): Promise<Html2Canvas> {
  if (window.html2canvas) return Promise.resolve(window.html2canvas);
  if (html2canvasLoader) return html2canvasLoader;

  html2canvasLoader = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-nova-html2canvas="true"]',
    );

    if (existing) {
      existing.addEventListener("load", () => {
        if (window.html2canvas) resolve(window.html2canvas);
        else reject(new Error("PNG 변환 모듈을 불러오지 못했습니다."));
      }, { once: true });
      existing.addEventListener("error", () => reject(new Error("PNG 변환 모듈을 불러오지 못했습니다.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
    script.async = true;
    script.dataset.novaHtml2canvas = "true";
    script.onload = () => {
      if (window.html2canvas) resolve(window.html2canvas);
      else reject(new Error("PNG 변환 모듈을 불러오지 못했습니다."));
    };
    script.onerror = () => reject(new Error("PNG 변환 모듈을 불러오지 못했습니다."));
    document.head.appendChild(script);
  }).catch((error) => {
    html2canvasLoader = null;
    throw error;
  });

  return html2canvasLoader;
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

async function elementToPng(element: HTMLElement, html2canvas: Html2Canvas): Promise<Blob> {
  const width = Math.ceil(element.getBoundingClientRect().width) || 794;
  const height = Math.ceil(element.getBoundingClientRect().height) || 1123;
  const clone = element.cloneNode(true) as HTMLElement;

  clone.classList.add("nova-share-capture-page");
  clone.style.display = "block";
  clone.style.position = "relative";
  clone.style.left = "0";
  clone.style.top = "0";
  clone.style.width = `${width}px`;
  clone.style.height = `${height}px`;
  clone.style.margin = "0";
  clone.style.transform = "none";
  clone.style.breakAfter = "auto";
  clone.style.pageBreakAfter = "auto";

  const host = document.createElement("div");
  host.className = "nova-share-capture-host";
  host.style.position = "fixed";
  host.style.left = "0";
  host.style.top = "0";
  host.style.width = `${width}px`;
  host.style.height = `${height}px`;
  host.style.overflow = "hidden";
  host.style.background = "#fff";
  host.style.zIndex = "2147483647";
  host.style.pointerEvents = "none";

  const style = document.createElement("style");
  style.textContent = `${collectPrintCss()}
    .nova-share-capture-host, .nova-share-capture-host * { box-sizing: border-box; }
    .nova-share-capture-host .nova-share-capture-page { display: block !important; width: ${width}px !important; height: ${height}px !important; min-height: ${height}px !important; max-height: ${height}px !important; overflow: hidden !important; background: #fff !important; }
    .nova-share-capture-host .print-result-page { break-after: auto !important; page-break-after: auto !important; }
  `;

  host.append(style, clone);
  document.body.appendChild(host);

  try {
    await waitForImages(clone);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

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
        (blob) => (blob ? resolve(blob) : reject(new Error("PNG 변환에 실패했습니다."))),
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
    files.push(new File([blob], `NOVA-Report-${index + 1}.png`, { type: "image/png" }));
  }

  return files;
}

export default function MobileReportPage() {
  const [sharing, setSharing] = useState(false);
  const sharingRef = useRef(false);

  useEffect(() => {
    const printButton = document.querySelector<HTMLButtonElement>(".print-button");
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

        if (navigator.share && navigator.canShare?.({ files })) {
          await navigator.share({
            title: "NOVA AI SPORTS PLATFORM 결과지",
            text: "NOVA 리포트 결과지 3페이지",
            files,
          });
          return;
        }

        for (const file of files) {
          const url = URL.createObjectURL(file);
          const anchor = document.createElement("a");
          anchor.href = url;
          anchor.download = file.name;
          document.body.appendChild(anchor);
          anchor.click();
          anchor.remove();
          URL.revokeObjectURL(url);
        }

        window.alert("결과지 3페이지 이미지를 저장했습니다. 저장된 이미지를 카카오톡에서 공유해 주세요.");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        window.alert(error instanceof Error ? error.message : "결과지 이미지를 공유하지 못했습니다.");
      } finally {
        sharingRef.current = false;
        setSharing(false);
      }
    };

    printButton.textContent = sharing ? "변환 중…" : "카톡 공유";
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
        @media print { .print-button.kakao-share-button { display: none !important; } }
      `}</style>
      <DesktopPage />
    </>
  );
}
