export const NOVA_DATA_VERSION = 2 as const;
export const NOVA_STORAGE_KEY = "nova-athlete-data-v2";
export const NOVA_BACKUP_KEY = "nova-athlete-data-v2-backup";
export const NOVA_CURRENT_ATHLETE_KEY = "nova-current-athlete-id";
export const LEGACY_NOVA_STORAGE_KEY = "nova-athlete-data-v1";
export const LEGACY_CAMERA_AI_KEY = "nova-camera-ai-results";

export type NovaLanguage = "ko" | "en";
export type NovaStatus = "양호" | "관리" | "주의";

export type NovaMetric = { label: string; value: string };

export type NovaAthleteProfile = {
  id: string;
  name: string;
  birthDate?: string;
  age?: number;
  gender?: string;
  heightCm?: number;
  weightKg?: number;
  affiliation?: string;
  sport?: string;
  position?: string;
  updatedAt: string;
};

export type NovaCameraAIResult = {
  id: string;
  title: string;
  category: string;
  score: number;
  status: NovaStatus;
  summary: string;
  recommendation: string;
  metrics: NovaMetric[];
  completedAt: string;
  source: "camera-ai";
};

export type NovaBodyRecord = { date: string; heightCm?: number; weightKg?: number; bmi?: number };
export type NovaFatigueRecord = { date: string; score: number; note?: string };
export type NovaJumpFatigueRecord = {
  athleteId: string;
  date: string;
  previousJumpCm: number;
  currentJumpCm: number;
  fatiguePercent: number;
};
export type NovaPerformanceRecord = { date: string; score: number; note?: string };
export type NovaRecoveryRecord = { date: string; score: number; note?: string };
export type NovaRehabRecord = { date: string; area: string; exercise: string; completed: boolean; note?: string };
export type NovaInjuryEpisode = { id: string; area: string; injuryDate: string; returnDate?: string; reinjuryDate?: string; note?: string };

export type NovaAthleteData = {
  version: typeof NOVA_DATA_VERSION;
  athlete: NovaAthleteProfile;
  bodyRecords: NovaBodyRecord[];
  fatigueRecords: NovaFatigueRecord[];
  jumpFatigueRecords: NovaJumpFatigueRecord[];
  performanceRecords: NovaPerformanceRecord[];
  recoveryRecords: NovaRecoveryRecord[];
  rehabRecords: NovaRehabRecord[];
  injuryRecords: NovaInjuryEpisode[];
  cameraAIResults: NovaCameraAIResult[];
};

export function createEmptyNovaAthleteData(name = "", id = "default-athlete"): NovaAthleteData {
  return {
    version: NOVA_DATA_VERSION,
    athlete: { id, name, updatedAt: new Date().toISOString() },
    bodyRecords: [],
    fatigueRecords: [],
    jumpFatigueRecords: [],
    performanceRecords: [],
    recoveryRecords: [],
    rehabRecords: [],
    injuryRecords: [],
    cameraAIResults: [],
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function normalizeCameraResult(value: unknown): NovaCameraAIResult | null {
  if (!isObject(value) || typeof value.id !== "string" || typeof value.title !== "string") return null;
  const metrics = Array.isArray(value.metrics)
    ? value.metrics.filter(isObject)
        .filter((m) => typeof m.label === "string" && typeof m.value === "string")
        .map((m) => ({ label: m.label as string, value: m.value as string }))
    : [];
  const rawScore = finiteNumber(value.score) ?? 0;
  return {
    id: value.id,
    title: value.title,
    category: typeof value.category === "string" ? value.category : "Camera AI",
    score: Math.max(0, Math.min(100, Math.round(rawScore))),
    status: value.status === "관리" || value.status === "주의" ? value.status : "양호",
    summary: typeof value.summary === "string" ? value.summary : "",
    recommendation: typeof value.recommendation === "string" ? value.recommendation : "",
    metrics,
    completedAt: typeof value.completedAt === "string" ? value.completedAt : new Date().toISOString(),
    source: "camera-ai",
  };
}

function normalizeData(value: unknown): NovaAthleteData {
  const base = createEmptyNovaAthleteData();
  if (!isObject(value)) return base;
  const a = isObject(value.athlete) ? value.athlete : {};
  const camera = Array.isArray(value.cameraAIResults)
    ? value.cameraAIResults.map(normalizeCameraResult).filter(Boolean) as NovaCameraAIResult[]
    : [];
  return {
    version: NOVA_DATA_VERSION,
    athlete: {
      id: typeof a.id === "string" && a.id ? a.id : base.athlete.id,
      name: typeof a.name === "string" ? a.name : "",
      birthDate: typeof a.birthDate === "string" ? a.birthDate : undefined,
      age: finiteNumber(a.age),
      gender: typeof a.gender === "string" ? a.gender : undefined,
      heightCm: finiteNumber(a.heightCm),
      weightKg: finiteNumber(a.weightKg),
      affiliation: typeof a.affiliation === "string" ? a.affiliation : undefined,
      sport: typeof a.sport === "string" ? a.sport : undefined,
      position: typeof a.position === "string" ? a.position : undefined,
      updatedAt: typeof a.updatedAt === "string" ? a.updatedAt : new Date().toISOString(),
    },
    bodyRecords: Array.isArray(value.bodyRecords) ? value.bodyRecords as NovaBodyRecord[] : [],
    fatigueRecords: Array.isArray(value.fatigueRecords) ? value.fatigueRecords as NovaFatigueRecord[] : [],
    jumpFatigueRecords: Array.isArray(value.jumpFatigueRecords)
      ? value.jumpFatigueRecords.filter(isObject).map((item) => ({
          athleteId: typeof item.athleteId === "string" ? item.athleteId : "",
          date: typeof item.date === "string" ? item.date : "",
          previousJumpCm: finiteNumber(item.previousJumpCm) ?? 0,
          currentJumpCm: finiteNumber(item.currentJumpCm) ?? 0,
          fatiguePercent: finiteNumber(item.fatiguePercent) ?? 0,
        }))
      : [],
    performanceRecords: Array.isArray(value.performanceRecords) ? value.performanceRecords as NovaPerformanceRecord[] : [],
    recoveryRecords: Array.isArray(value.recoveryRecords) ? value.recoveryRecords as NovaRecoveryRecord[] : [],
    rehabRecords: Array.isArray(value.rehabRecords) ? value.rehabRecords as NovaRehabRecord[] : [],
    injuryRecords: Array.isArray(value.injuryRecords)
      ? value.injuryRecords.filter(isObject).map((item) => ({
          id: typeof item.id === "string" && item.id ? item.id : `injury-${String(item.injuryDate ?? "")}-${String(item.area ?? "")}`,
          area: typeof item.area === "string" ? item.area : "미분류",
          injuryDate: typeof item.injuryDate === "string" ? item.injuryDate : "",
          returnDate: typeof item.returnDate === "string" ? item.returnDate : undefined,
          reinjuryDate: typeof item.reinjuryDate === "string" ? item.reinjuryDate : undefined,
          note: typeof item.note === "string" ? item.note : undefined,
        })).filter((item) => item.injuryDate)
      : [],
    cameraAIResults: camera,
  };
}

function safeParse(raw: string | null): NovaAthleteData | null {
  if (!raw) return null;
  try {
    return normalizeData(JSON.parse(raw));
  } catch {
    return null;
  }
}

function readRaw(): NovaAthleteData | null {
  if (typeof window === "undefined") return null;
  try {
    const current = safeParse(window.localStorage.getItem(NOVA_STORAGE_KEY));
    if (current) return current;
    const backup = safeParse(window.localStorage.getItem(NOVA_BACKUP_KEY));
    if (backup) return backup;
    const oldV1 = safeParse(window.localStorage.getItem(LEGACY_NOVA_STORAGE_KEY));
    if (oldV1) return oldV1;
    const legacyCamera = window.localStorage.getItem(LEGACY_CAMERA_AI_KEY);
    if (legacyCamera) {
      const migrated = createEmptyNovaAthleteData();
      try {
        const parsed = JSON.parse(legacyCamera);
        migrated.cameraAIResults = Array.isArray(parsed)
          ? parsed.map(normalizeCameraResult).filter(Boolean) as NovaCameraAIResult[]
          : [];
      } catch {}
      return migrated;
    }
  } catch {}
  return null;
}

export function readNovaAthleteData(): NovaAthleteData {
  return readRaw() ?? createEmptyNovaAthleteData();
}

export function writeNovaAthleteData(data: NovaAthleteData): boolean {
  if (typeof window === "undefined") return false;
  try {
    const normalized = normalizeData(data);
    normalized.athlete.updatedAt = new Date().toISOString();
    const payload = JSON.stringify(normalized);
    // Keep the last known-good copy before replacing the active copy.
    const existing = window.localStorage.getItem(NOVA_STORAGE_KEY);
    if (existing) window.localStorage.setItem(NOVA_BACKUP_KEY, existing);
    window.localStorage.setItem(NOVA_STORAGE_KEY, payload);
    return window.localStorage.getItem(NOVA_STORAGE_KEY) === payload;
  } catch {
    return false;
  }
}

export function saveAthleteProfile(profile: Partial<Omit<NovaAthleteProfile, "id" | "updatedAt">> & { id?: string }): NovaAthleteData {
  const data = readNovaAthleteData();
  data.athlete = {
    ...data.athlete,
    ...profile,
    id: profile.id || data.athlete.id || "default-athlete",
    updatedAt: new Date().toISOString(),
  };
  writeNovaAthleteData(data);
  return data;
}

export function getAthleteProfile(): NovaAthleteProfile {
  return readNovaAthleteData().athlete;
}

export function setCurrentAthleteId(id: string): void {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(NOVA_CURRENT_ATHLETE_KEY, id); } catch {}
}

export function getCurrentAthleteId(): string {
  if (typeof window === "undefined") return "default-athlete";
  try { return window.localStorage.getItem(NOVA_CURRENT_ATHLETE_KEY) || "default-athlete"; } catch { return "default-athlete"; }
}

export function upsertCameraAIResult(result: NovaCameraAIResult): NovaAthleteData {
  const data = readNovaAthleteData();
  const normalized = normalizeCameraResult(result);
  if (!normalized) return data;
  data.cameraAIResults = [
    ...data.cameraAIResults.filter((item) => item.id !== normalized.id),
    normalized,
  ].sort((a, b) => a.completedAt.localeCompare(b.completedAt));
  writeNovaAthleteData(data);
  return data;
}

export function getCameraAIResultsInRange(startDate?: string, endDate?: string): NovaCameraAIResult[] {
  return readNovaAthleteData().cameraAIResults.filter((result) => {
    const date = result.completedAt.slice(0, 10);
    return (!startDate || date >= startDate) && (!endDate || date <= endDate);
  });
}

export function clearNovaAthleteData(): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.removeItem(NOVA_STORAGE_KEY);
    window.localStorage.removeItem(NOVA_BACKUP_KEY);
    return true;
  } catch {
    return false;
  }
}


export type NovaDailyRecord = {
  id: string;
  date: string;
  type: "body" | "fatigue" | "performance" | "recovery" | "rehab" | "camera-ai";
  sourceId: string;
  createdAt: string;
};

function normalizeDate(date: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : new Date(date).toISOString().slice(0, 10);
}

export function upsertBodyRecord(record: NovaBodyRecord): NovaAthleteData {
  const data = readNovaAthleteData();
  const normalized = { ...record, date: normalizeDate(record.date) };
  data.bodyRecords = [
    ...data.bodyRecords.filter((item) => item.date !== normalized.date),
    normalized,
  ].sort((a, b) => a.date.localeCompare(b.date));
  writeNovaAthleteData(data);
  return data;
}

export function upsertJumpFatigueRecord(record: NovaJumpFatigueRecord): NovaAthleteData {
  const data = readNovaAthleteData();
  const normalized = {
    ...record,
    date: normalizeDate(record.date),
    previousJumpCm: Math.max(0, record.previousJumpCm),
    currentJumpCm: Math.max(0, record.currentJumpCm),
    fatiguePercent: Math.max(0, Math.min(100, record.fatiguePercent)),
  };
  data.jumpFatigueRecords = [
    ...data.jumpFatigueRecords.filter(
      (item) => !(item.athleteId === normalized.athleteId && item.date === normalized.date),
    ),
    normalized,
  ].sort((a, b) => a.date.localeCompare(b.date));
  writeNovaAthleteData(data);
  return data;
}

export function getLatestJumpFatigueRecord(athleteId: string): NovaJumpFatigueRecord | null {
  const records = readNovaAthleteData().jumpFatigueRecords.filter((item) => item.athleteId === athleteId);
  return records.length ? records[records.length - 1] : null;
}

export function getJumpFatigueRecord(athleteId: string, date: string): NovaJumpFatigueRecord | null {
  return (
    readNovaAthleteData().jumpFatigueRecords.find(
      (item) => item.athleteId === athleteId && item.date === date,
    ) ?? null
  );
}

export function upsertFatigueRecord(record: NovaFatigueRecord): NovaAthleteData {
  const data = readNovaAthleteData();
  const normalized = { ...record, date: normalizeDate(record.date) };
  data.fatigueRecords = [
    ...data.fatigueRecords.filter((item) => item.date !== normalized.date),
    normalized,
  ].sort((a, b) => a.date.localeCompare(b.date));
  writeNovaAthleteData(data);
  return data;
}

export function upsertPerformanceRecord(record: NovaPerformanceRecord): NovaAthleteData {
  const data = readNovaAthleteData();
  const normalized = { ...record, date: normalizeDate(record.date) };
  data.performanceRecords = [
    ...data.performanceRecords.filter((item) => item.date !== normalized.date),
    normalized,
  ].sort((a, b) => a.date.localeCompare(b.date));
  writeNovaAthleteData(data);
  return data;
}

export function upsertRecoveryRecord(record: NovaRecoveryRecord): NovaAthleteData {
  const data = readNovaAthleteData();
  const normalized = { ...record, date: normalizeDate(record.date) };
  data.recoveryRecords = [
    ...data.recoveryRecords.filter((item) => item.date !== normalized.date),
    normalized,
  ].sort((a, b) => a.date.localeCompare(b.date));
  writeNovaAthleteData(data);
  return data;
}

export function upsertInjuryEpisode(record: NovaInjuryEpisode): NovaAthleteData {
  const data = readNovaAthleteData();
  const normalized = { ...record, injuryDate: normalizeDate(record.injuryDate), returnDate: record.returnDate ? normalizeDate(record.returnDate) : undefined, reinjuryDate: record.reinjuryDate ? normalizeDate(record.reinjuryDate) : undefined };
  data.injuryRecords = [
    ...data.injuryRecords.filter((item) => item.id !== normalized.id),
    normalized,
  ].sort((a, b) => a.injuryDate.localeCompare(b.injuryDate));
  writeNovaAthleteData(data);
  return data;
}

export function upsertRehabRecord(record: NovaRehabRecord): NovaAthleteData {
  const data = readNovaAthleteData();
  const normalized = { ...record, date: normalizeDate(record.date) };
  data.rehabRecords = [
    ...data.rehabRecords.filter((item) =>
      !(item.date === normalized.date && item.area === normalized.area && item.exercise === normalized.exercise)
    ),
    normalized,
  ].sort((a, b) => a.date.localeCompare(b.date));
  writeNovaAthleteData(data);
  return data;
}

export function getRecordsInRange(startDate: string, endDate: string) {
  const start = normalizeDate(startDate);
  const end = normalizeDate(endDate);
  const data = readNovaAthleteData();
  const inRange = (date: string) => {
    const d = normalizeDate(date);
    return d >= start && d <= end;
  };

  return {
    bodyRecords: data.bodyRecords.filter((r) => inRange(r.date)),
    fatigueRecords: data.fatigueRecords.filter((r) => inRange(r.date)),
    performanceRecords: data.performanceRecords.filter((r) => inRange(r.date)),
    recoveryRecords: data.recoveryRecords.filter((r) => inRange(r.date)),
    rehabRecords: data.rehabRecords.filter((r) => inRange(r.date)),
    cameraAIResults: data.cameraAIResults.filter((r) => inRange(r.completedAt.slice(0, 10))),
  };
}

export function getLatestRecords() {
  const data = readNovaAthleteData();
  const latest = <T extends { date: string }>(records: T[]) =>
    records.length ? [...records].sort((a, b) => b.date.localeCompare(a.date))[0] : undefined;

  return {
    body: latest(data.bodyRecords),
    fatigue: latest(data.fatigueRecords),
    performance: latest(data.performanceRecords),
    recovery: latest(data.recoveryRecords),
    rehab: latest(data.rehabRecords),
    cameraAI: data.cameraAIResults.length
      ? [...data.cameraAIResults].sort((a, b) => b.completedAt.localeCompare(a.completedAt))[0]
      : undefined,
  };
}

export function deleteRecordsForDate(date: string): NovaAthleteData {
  const target = normalizeDate(date);
  const data = readNovaAthleteData();
  data.bodyRecords = data.bodyRecords.filter((r) => normalizeDate(r.date) !== target);
  data.fatigueRecords = data.fatigueRecords.filter((r) => normalizeDate(r.date) !== target);
  data.performanceRecords = data.performanceRecords.filter((r) => normalizeDate(r.date) !== target);
  data.recoveryRecords = data.recoveryRecords.filter((r) => normalizeDate(r.date) !== target);
  data.rehabRecords = data.rehabRecords.filter((r) => normalizeDate(r.date) !== target);
  data.cameraAIResults = data.cameraAIResults.filter((r) => normalizeDate(r.completedAt.slice(0, 10)) !== target);
  writeNovaAthleteData(data);
  return data;
}
