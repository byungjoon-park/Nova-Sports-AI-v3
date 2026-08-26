import { useCallback, useEffect, useState } from "react";
import { getAthleteProfile, saveAthleteProfile, type NovaAthleteProfile } from "./nova-data";

export function useNovaAthlete() {
  const [athlete, setAthlete] = useState<NovaAthleteProfile>(() => getAthleteProfile());

  useEffect(() => {
    setAthlete(getAthleteProfile());
  }, []);

  const save = useCallback((patch: Partial<Omit<NovaAthleteProfile, "id" | "updatedAt">>) => {
    const next = saveAthleteProfile(patch).athlete;
    setAthlete(next);
    return next;
  }, []);

  return { athlete, save };
}
