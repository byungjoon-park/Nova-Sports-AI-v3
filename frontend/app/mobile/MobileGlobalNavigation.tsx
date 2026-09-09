"use client";

import { useLayoutEffect } from "react";
import { getCurrentUser } from "../../lib/nova-auth";

export default function MobileGlobalNavigation() {
  useLayoutEffect(() => {
    const current = getCurrentUser();
    if (!current) return;

    try {
      // Restore the mobile-login flag before /mobile/page.tsx performs
      // its delayed login check. The durable NOVA auth store is the source.
      sessionStorage.setItem("nova-mobile-login-complete", "1");
      localStorage.setItem("nova-active-role", current.role);
      localStorage.setItem("nova-login-role", current.role);
      localStorage.setItem("nova-role", current.role);
    } catch {}
  }, []);

  // The mobile home page already owns its complete menu state.
  // Feature pages own their sidebar state as well. This component is
  // intentionally an auth/session bridge only, preventing duplicate UI.
  return null;
}
