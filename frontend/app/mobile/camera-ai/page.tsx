"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MobileFeaturePage from "../_components/MobileFeaturePage";
import { getCurrentUser, type NovaUser } from "../../../lib/nova-auth";

export default function MobileCameraAiPage() {
  const router = useRouter();
  const [user, setUser] = useState<NovaUser | null>(null);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    const current = getCurrentUser();

    if (!current) {
      router.replace("/mobile/login");
      return;
    }

    if (current.role === "parent") {
      setBlocked(true);
      router.replace("/mobile");
      return;
    }

    setUser(current);
  }, [router]);

  if (blocked || !user) return null;
  return <MobileFeaturePage section="camera-ai" />;
}
