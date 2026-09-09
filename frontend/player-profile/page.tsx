 "use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import NovaTopBar from "../components/NovaTopBar";
import { useNovaAthlete } from "../lib/use-nova-athlete";
import "./player-profile.css";

export default function PlayerProfilePage() {
  const router = useRouter();
  const { athlete, save } = useNovaAthlete();
  const [form, setForm] = useState({
    name: athlete.name || "",
    birthDate: athlete.birthDate || "",
    age: athlete.age?.toString() || "",
    heightCm: athlete.heightCm?.toString() || "",
    weightKg: athlete.weightKg?.toString() || "",
    affiliation: athlete.affiliation || "",
    sport: athlete.sport || "",
    position: athlete.position || "",
  });

  const update = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    save({
      name: form.name.trim(),
      birthDate: form.birthDate || undefined,
      age: form.age ? Number(form.age) : undefined,
      heightCm: form.heightCm ? Number(form.heightCm) : undefined,
      weightKg: form.weightKg ? Number(form.weightKg) : undefined,
      affiliation: form.affiliation.trim() || undefined,
      sport: form.sport.trim() || undefined,
      position: form.position.trim() || undefined,
    });
  };

  return (
    <main className="nova-profile-page">
      <NovaTopBar />

      <section className="nova-profile-shell">
        <div className="nova-profile-heading">
          <span>PLAYER PROFILE</span>
          <h1>선수 프로필</h1>
          <p>저장된 선수 정보는 Camera AI와 리포트에서 공통으로 사용됩니다.</p>
        </div>

        <form onSubmit={submit} className="nova-profile-form">
          {[
            ["name", "선수 이름", "text"],
            ["birthDate", "생년월일", "date"],
            ["age", "나이", "number"],
            ["heightCm", "키 (cm)", "number"],
            ["weightKg", "몸무게 (kg)", "number"],
            ["affiliation", "소속", "text"],
            ["sport", "종목", "text"],
            ["position", "포지션", "text"],
          ].map(([key, label, type]) => (
            <label key={key}>
              <span>{label}</span>
              <input
                type={type}
                value={form[key as keyof typeof form]}
                onChange={(e) => update(key as keyof typeof form, e.target.value)}
              />
            </label>
          ))}

          <div className="nova-profile-actions">
            <button type="button" onClick={() => router.push("/report")}>리포트 보기</button>
            <button type="submit">프로필 저장</button>
          </div>
        </form>
      </section>
    </main>
  );
}
