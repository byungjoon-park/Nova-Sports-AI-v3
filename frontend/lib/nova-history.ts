import { getMeasurementRange } from "./nova-measurements";
import { readNovaAthleteData } from "./nova-data";

export function getHistorySummary(startDate: string, endDate: string) {
  const range = getMeasurementRange(startDate, endDate);
  const dates = Array.from(new Set([
    ...range.bodyRecords.map(x => x.date),
    ...range.fatigueRecords.map(x => x.date),
    ...range.performanceRecords.map(x => x.date),
    ...range.recoveryRecords.map(x => x.date),
  ])).sort();

  const bodyByDate = new Map(range.bodyRecords.map(x => [x.date, x]));
  const fatigueByDate = new Map(range.fatigueRecords.map(x => [x.date, x.score]));
  const performanceByDate = new Map(range.performanceRecords.map(x => [x.date, x.score]));
  const recoveryByDate = new Map(range.recoveryRecords.map(x => [x.date, x.score]));

  return dates.map(date => {
    const body = bodyByDate.get(date);
    return {
      date,
      heightCm: body?.heightCm,
      weightKg: body?.weightKg,
      bmi: body?.bmi,
      fatigue: fatigueByDate.get(date),
      performance: performanceByDate.get(date),
      recovery: recoveryByDate.get(date),
    };
  });
}

export function getAllStoredHistory() {
  const data = readNovaAthleteData();
  return getHistorySummary(
    data.bodyRecords[0]?.date || data.fatigueRecords[0]?.date || new Date().toISOString().slice(0, 10),
    data.bodyRecords.at(-1)?.date || data.fatigueRecords.at(-1)?.date || new Date().toISOString().slice(0, 10),
  );
}
