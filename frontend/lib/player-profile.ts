import { readNovaAthleteData, type NovaBodyRecord } from "./nova-data";

export type PlayerProfile = {
  id: string;
  name: string;
  jerseyNumber: string;
  position: string;
  team: string;
  birthDate: string;
  bodyRecords: NovaBodyRecord[];
};

const FALLBACK_PROFILE: PlayerProfile = {
  id: "default-athlete",
  name: "김노바",
  jerseyNumber: "7",
  position: "FW",
  team: "FC NOVA",
  birthDate: "2001-05-20",
  bodyRecords: [
    { date: "2025-05-14", heightCm: 181.4, weightKg: 74.9 },
    { date: "2025-05-15", heightCm: 181.5, weightKg: 75.2 },
    { date: "2025-05-16", heightCm: 181.6, weightKg: 75.5 },
    { date: "2025-05-17", heightCm: 181.7, weightKg: 75.8 },
    { date: "2025-05-18", heightCm: 181.8, weightKg: 76.0 },
    { date: "2025-05-19", heightCm: 181.9, weightKg: 76.0 },
    { date: "2025-05-20", heightCm: 182.0, weightKg: 76.0 },
  ],
};

export function getPlayerProfile(): PlayerProfile {
  if (typeof window === "undefined") return FALLBACK_PROFILE;
  try {
    const data = readNovaAthleteData();
    const athlete = data.athlete;
    return {
      id: athlete.id || FALLBACK_PROFILE.id,
      name: athlete.name || FALLBACK_PROFILE.name,
      jerseyNumber: FALLBACK_PROFILE.jerseyNumber,
      position: athlete.position || FALLBACK_PROFILE.position,
      team: athlete.affiliation || FALLBACK_PROFILE.team,
      birthDate: athlete.birthDate || FALLBACK_PROFILE.birthDate,
      bodyRecords: data.bodyRecords.length ? data.bodyRecords : FALLBACK_PROFILE.bodyRecords,
    };
  } catch {
    return FALLBACK_PROFILE;
  }
}

export const playerProfile = FALLBACK_PROFILE;

export function calculateAge(birthDate?: string, atDate = new Date()) {
  if (!birthDate) return 0;
  const birth = new Date(`${birthDate}T00:00:00`);
  let age = atDate.getFullYear() - birth.getFullYear();
  const month = atDate.getMonth() - birth.getMonth();
  if (month < 0 || (month === 0 && atDate.getDate() < birth.getDate())) age -= 1;
  return Math.max(0, age);
}

export function getBodyRecordsWithBmi(records: NovaBodyRecord[]) {
  return records.map((record) => ({
    ...record,
    heightCm: record.heightCm ?? 0,
    weightKg: record.weightKg ?? 0,
    bmi: record.bmi ?? (
      record.heightCm && record.weightKg
        ? Number((record.weightKg / ((record.heightCm / 100) ** 2)).toFixed(1))
        : 0
    ),
  }));
}

export function getLatestBodyRecord(records: NovaBodyRecord[]) {
  return getBodyRecordsWithBmi(records).sort((a, b) => a.date.localeCompare(b.date)).at(-1)
    ?? { date: "", heightCm: 0, weightKg: 0, bmi: 0 };
}
