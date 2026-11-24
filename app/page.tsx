"use client";

import { useEffect, useState } from "react";
import Dashboard from "@/components/Dashboard";
import Login from "@/components/Login";
import { api } from "@/lib/client-api";
import type { SessionUser } from "@/lib/types";

export default function Home() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    api<{ user: SessionUser }>("/api/auth/me")
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setChecking(false));
  }, []);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  if (checking) {
    return (
      <div className="splash">
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 30 }}>⚽</div>
          <p>Chargement…</p>
        </div>
      </div>
    );
  }

  if (!user) return <Login onSuccess={setUser} />;

  return <Dashboard user={user} onLogout={() => setUser(null)} />;
}
