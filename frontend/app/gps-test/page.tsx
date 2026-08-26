"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import NovaTopBar from "../../components/NovaTopBar";

type GpsStatus = "idle" | "requesting" | "tracking" | "error";

type GpsSample = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speedMps: number | null;
  timestamp: number;
};

const toKmh = (mps: number | null) =>
  mps == null || !Number.isFinite(mps) ? null : mps * 3.6;

const distanceMeters = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) => {
  const R = 6371000;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const formatNumber = (value: number | null, digits = 1) =>
  value == null || !Number.isFinite(value) ? "—" : value.toFixed(digits);

export default function GpsTestPage() {
  const [status, setStatus] = useState<GpsStatus>("idle");
  const [error, setError] = useState("");
  const [sample, setSample] = useState<GpsSample | null>(null);
  const [distance, setDistance] = useState(0);
  const [maxSpeed, setMaxSpeed] = useState(0);
  const [speed, setSpeed] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const watchIdRef = useRef<number | null>(null);
  const lastSampleRef = useRef<GpsSample | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null && "geolocation" in navigator) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    watchIdRef.current = null;
    startTimeRef.current = null;
    setStatus("idle");
  }, []);

  const startTracking = useCallback(() => {
    setError("");
    setStatus("requesting");

    if (!("geolocation" in navigator)) {
      setStatus("error");
      setError("이 브라우저는 GPS 위치 기능을 지원하지 않습니다.");
      return;
    }

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    lastSampleRef.current = null;
    startTimeRef.current = Date.now();
    setSample(null);
    setDistance(0);
    setMaxSpeed(0);
    setSpeed(null);
    setElapsed(0);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const next: GpsSample = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: Number.isFinite(position.coords.accuracy)
            ? position.coords.accuracy
            : null,
          speedMps:
            position.coords.speed != null &&
            Number.isFinite(position.coords.speed)
              ? position.coords.speed
              : null,
          timestamp: position.timestamp,
        };

        const previous = lastSampleRef.current;

        if (previous) {
          const segment = distanceMeters(
            previous.latitude,
            previous.longitude,
            next.latitude,
            next.longitude
          );

          // GPS 오차로 인한 순간적인 비정상 이동을 완전히 누적하지 않도록
          // 정확도가 나쁜 상태에서 매우 큰 점프는 해당 샘플에서 제외한다.
          const accuracy = next.accuracy ?? 999;
          const previousAccuracy = previous.accuracy ?? 999;
          const accuracyLimit = Math.max(accuracy, previousAccuracy);

          if (segment <= Math.max(50, accuracyLimit * 3)) {
            setDistance((value) => value + segment);
          }
        }

        const kmh = toKmh(next.speedMps);
        setSpeed(kmh);
        if (kmh != null) {
          setMaxSpeed((value) => Math.max(value, kmh));
        }

        lastSampleRef.current = next;
        setSample(next);
        setStatus("tracking");
      },
      (positionError) => {
        setStatus("error");
        const messages: Record<number, string> = {
          1: "위치 권한이 거부되었습니다. 브라우저의 위치 권한을 허용해주세요.",
          2: "현재 위치를 확인할 수 없습니다. GPS 신호를 확인해주세요.",
          3: "GPS 응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.",
        };
        setError(messages[positionError.code] ?? positionError.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 15000,
      }
    );
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (startTimeRef.current !== null) {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }
    }, 1000);

    return () => {
      window.clearInterval(timer);
      if (watchIdRef.current !== null && "geolocation" in navigator) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const elapsedLabel = useMemo(() => {
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
      2,
      "0"
    )}`;
  }, [elapsed]);

  const statusLabel = {
    idle: "대기",
    requesting: "위치 권한 요청 중",
    tracking: "GPS 측정 중",
    error: "오류",
  }[status];

  const statusClass = {
    idle: "idle",
    requesting: "requesting",
    tracking: "tracking",
    error: "error",
  }[status];

  return (
    <main className="gps-page">
      <NovaTopBar />
      <section className="gps-shell">
        <header className="gps-header">
          <div>
            <div className="brand">NOVA</div>
            <div className="subtitle">GPS TEST</div>
          </div>
          <div className={`status ${statusClass}`}>
            <span />
            {statusLabel}
          </div>
        </header>

        <div className="notice">
          <strong>GPS 실제 수신 테스트</strong>
          <span>
            휴대폰에서 위치 권한을 허용하면 현재 위치와 이동 데이터를 실시간으로
            확인할 수 있습니다.
          </span>
        </div>

        {error && <div className="error-box">{error}</div>}

        <div className="metrics">
          <article>
            <span>현재 속도</span>
            <strong>{formatNumber(speed)} <small>km/h</small></strong>
          </article>
          <article>
            <span>최고 속도</span>
            <strong>{formatNumber(maxSpeed)} <small>km/h</small></strong>
          </article>
          <article>
            <span>이동 거리</span>
            <strong>{formatNumber(distance / 1000, 3)} <small>km</small></strong>
          </article>
          <article>
            <span>측정 시간</span>
            <strong>{elapsedLabel}</strong>
          </article>
        </div>

        <section className="location-card">
          <h2>현재 GPS 데이터</h2>
          <div className="location-grid">
            <div>
              <span>위도</span>
              <strong>{sample ? formatNumber(sample.latitude, 6) : "—"}</strong>
            </div>
            <div>
              <span>경도</span>
              <strong>{sample ? formatNumber(sample.longitude, 6) : "—"}</strong>
            </div>
            <div>
              <span>GPS 정확도</span>
              <strong>
                {sample?.accuracy != null
                  ? `${formatNumber(sample.accuracy, 1)} m`
                  : "—"}
              </strong>
            </div>
            <div>
              <span>마지막 수신</span>
              <strong>
                {sample
                  ? new Date(sample.timestamp).toLocaleTimeString("ko-KR")
                  : "—"}
              </strong>
            </div>
          </div>
        </section>

        <div className="actions">
          <button
            type="button"
            className="primary"
            onClick={startTracking}
            disabled={status === "requesting"}
          >
            {status === "requesting" ? "GPS 연결 중..." : "GPS 측정 시작"}
          </button>
          <button
            type="button"
            className="secondary"
            onClick={stopTracking}
            disabled={status === "idle"}
          >
            측정 중지
          </button>
        </div>

        <section className="checklist">
          <h2>테스트 확인 항목</h2>
          <ul>
            <li>위치 권한 요청이 표시되는지</li>
            <li>위도/경도가 실제로 변경되는지</li>
            <li>GPS 정확도가 표시되는지</li>
            <li>이동하면 이동거리가 증가하는지</li>
            <li>이동 중 속도와 최고속도가 표시되는지</li>
          </ul>
        </section>

        <p className="footnote">
          이 화면은 GPS 수신 확인용 테스트 화면입니다. 실제 선수 GPS 장비
          연동은 장비 제조사의 API/SDK 연결 단계에서 별도로 진행합니다.
        </p>
      </section>

      <style jsx>{`
        .gps-page {
          min-height: 100vh;
          padding: 40px 20px;
          background: #f7f4ec;
          color: #111827;
        }
        .gps-shell {
          width: min(100%, 980px);
          margin: 0 auto;
        }
        .gps-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 24px;
        }
        .brand {
          font-size: 28px;
          letter-spacing: 0.34em;
          font-weight: 500;
        }
        .subtitle {
          margin-top: 4px;
          font-size: 10px;
          letter-spacing: 0.2em;
          color: #64748b;
        }
        .status {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 9px 14px;
          border: 1px solid #e5e7eb;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.7);
          font-size: 13px;
        }
        .status span {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #94a3b8;
        }
        .status.tracking span {
          background: #16a34a;
        }
        .status.error span {
          background: #dc2626;
        }
        .status.requesting span {
          background: #f59e0b;
        }
        .notice,
        .error-box,
        .location-card,
        .checklist {
          border: 1px solid #e5e1d7;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.78);
          box-shadow: 0 8px 30px rgba(15, 23, 42, 0.04);
        }
        .notice {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 18px 20px;
          margin-bottom: 14px;
        }
        .notice span,
        .footnote {
          color: #64748b;
          font-size: 13px;
          line-height: 1.6;
        }
        .error-box {
          padding: 14px 18px;
          margin-bottom: 14px;
          color: #b91c1c;
          background: #fff7f7;
          border-color: #fecaca;
          font-size: 13px;
        }
        .metrics {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          margin-bottom: 14px;
        }
        .metrics article {
          padding: 20px;
          border: 1px solid #e5e1d7;
          border-radius: 18px;
          background: #fffdf8;
        }
        .metrics span,
        .location-grid span {
          display: block;
          color: #64748b;
          font-size: 12px;
          margin-bottom: 8px;
        }
        .metrics strong {
          font-size: 26px;
          font-weight: 600;
        }
        .metrics small {
          font-size: 12px;
          font-weight: 400;
          color: #64748b;
        }
        .location-card,
        .checklist {
          padding: 22px;
          margin-bottom: 14px;
        }
        h2 {
          margin: 0 0 18px;
          font-size: 16px;
          font-weight: 600;
        }
        .location-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
        }
        .location-grid div {
          padding: 15px;
          border-radius: 12px;
          background: #f8f7f2;
        }
        .location-grid strong {
          font-size: 15px;
          font-weight: 500;
          word-break: break-all;
        }
        .actions {
          display: flex;
          gap: 10px;
          margin: 20px 0;
        }
        button {
          min-height: 44px;
          padding: 0 20px;
          border-radius: 10px;
          border: 1px solid #d9d5ca;
          cursor: pointer;
          font-size: 13px;
        }
        button:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .primary {
          border-color: #173a72;
          background: #173a72;
          color: white;
        }
        .secondary {
          background: white;
          color: #111827;
        }
        .checklist ul {
          margin: 0;
          padding-left: 20px;
          color: #475569;
          font-size: 13px;
          line-height: 1.9;
        }
        .footnote {
          margin: 14px 2px;
        }
        @media (max-width: 760px) {
          .gps-page {
            padding: 24px 14px;
          }
          .gps-header {
            align-items: flex-start;
          }
          .metrics,
          .location-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 460px) {
          .metrics,
          .location-grid {
            grid-template-columns: 1fr;
          }
          .actions {
            flex-direction: column;
          }
          button {
            width: 100%;
          }
        }
      `}</style>
    </main>
  );
}
