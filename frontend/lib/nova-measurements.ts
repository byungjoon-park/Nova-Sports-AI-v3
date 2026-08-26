import {
  readNovaAthleteData,
  writeNovaAthleteData,
  type NovaBodyRecord,
  type NovaFatigueRecord,
  type NovaPerformanceRecord,
  type NovaRecoveryRecord,
} from "./nova-data";

export type DailyMeasurementInput = {
  date: string;
  heightCm?: number;
  weightKg?: number;
  fatigueScore?: number;
  performanceScore?: number;
  recoveryScore?: number;
  note?: string;
};

function cleanNumber(value: unknown): number | undefined {
  if (value === "" || value == null) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function validDate(date: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

export function saveDailyMeasurement(input: DailyMeasurementInput) {
  if (!validDate(input.date)) throw new Error("날짜 형식이 올바르지 않습니다.");

  const data = readNovaAthleteData();
  const heightCm = cleanNumber(input.heightCm);
  const weightKg = cleanNumber(input.weightKg);
  const fatigueScore = cleanNumber(input.fatigueScore);
  const performanceScore = cleanNumber(input.performanceScore);
  const recoveryScore = cleanNumber(input.recoveryScore);

  if (heightCm !== undefined && heightCm <= 0) throw new Error("키는 0보다 커야 합니다.");
  if (weightKg !== undefined && weightKg <= 0) throw new Error("몸무게는 0보다 커야 합니다.");

  const bounded = (n: number | undefined) =>
    n === undefined ? undefined : Math.max(0, Math.min(100, Math.round(n)));

  const body: NovaBodyRecord = {
    date: input.date,
    ...(heightCm !== undefined ? { heightCm } : {}),
    ...(weightKg !== undefined ? { weightKg } : {}),
  };
  if (heightCm !== undefined && weightKg !== undefined) {
    body.bmi = Number((weightKg / ((heightCm / 100) ** 2)).toFixed(1));
  }

  const replaceByDate = <T extends { date: string }>(list: T[], item: T) =>
    [...list.filter((x) => x.date !== item.date), item].sort((a, b) => a.date.localeCompare(b.date));

  if (heightCm !== undefined || weightKg !== undefined) {
    data.bodyRecords = replaceByDate(
      data.bodyRecords,
      { ...(data.bodyRecords.find((x) => x.date === input.date) || {}), ...body }
    );
  }
  if (fatigueScore !== undefined) {
    const item: NovaFatigueRecord = { date: input.date, score: bounded(fatigueScore)!, ...(input.note ? { note: input.note } : {}) };
    data.fatigueRecords = replaceByDate(data.fatigueRecords, item);
  }
  if (performanceScore !== undefined) {
    const item: NovaPerformanceRecord = { date: input.date, score: bounded(performanceScore)!, ...(input.note ? { note: input.note } : {}) };
    data.performanceRecords = replaceByDate(data.performanceRecords, item);
  }
  if (recoveryScore !== undefined) {
    const item: NovaRecoveryRecord = { date: input.date, score: bounded(recoveryScore)!, ...(input.note ? { note: input.note } : {}) };
    data.recoveryRecords = replaceByDate(data.recoveryRecords, item);
  }

  if (!writeNovaAthleteData(data)) throw new Error("측정값 저장에 실패했습니다.");
  return data;
}

export function getMeasurementRange(startDate: string, endDate: string) {
  const data = readNovaAthleteData();
  const inRange = (date: string) => date >= startDate && date <= endDate;
  return {
    bodyRecords: data.bodyRecords.filter((x) => inRange(x.date)),
    fatigueRecords: data.fatigueRecords.filter((x) => inRange(x.date)),
    performanceRecords: data.performanceRecords.filter((x) => inRange(x.date)),
    recoveryRecords: data.recoveryRecords.filter((x) => inRange(x.date)),
  };
}
