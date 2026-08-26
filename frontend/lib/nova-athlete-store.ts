import {
  getAthleteProfile,
  getCurrentAthleteId,
  readNovaAthleteData,
  saveAthleteProfile,
  setCurrentAthleteId,
  type NovaAthleteProfile,
} from "./nova-data";

export function loadAthlete(): NovaAthleteProfile {
  return getAthleteProfile();
}

export function saveAthlete(input: Partial<Omit<NovaAthleteProfile, "updatedAt">> & { id?: string }) {
  const id = input.id || getCurrentAthleteId();
  setCurrentAthleteId(id);
  return saveAthleteProfile({ ...input, id }).athlete;
}

export function loadAthleteData() {
  return readNovaAthleteData();
}

export function ensureAthlete(id = "default-athlete", name = "") {
  const current = loadAthlete();
  if (current.id === id && current.name === name) return current;
  return saveAthlete({ id, name });
}
