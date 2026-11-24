"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Accounting from "@/components/Accounting";
import Countdown from "@/components/Countdown";
import AdminPanel from "@/components/AdminPanel";
import MembersTable from "@/components/MembersTable";
import { api, post } from "@/lib/client-api";
import { exportPdf } from "@/lib/pdf";
import type { DashboardData, SessionUser } from "@/lib/types";
import { exportMembersCsv, formatDate, formatMoney } from "@/lib/utils";

interface Props {
  user: SessionUser;
  onLogout: () => void;
}

export default function Dashboard({ user, onLogout }: Props) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [view, setView] = useState<"cotisations" | "comptabilite">("cotisations");
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "" });
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const refreshInFlight = useRef<Promise<void> | null>(null);

  const refresh = useCallback(() => {
    if (refreshInFlight.current) return refreshInFlight.current;

    const request = api<DashboardData>("/api/dashboard").then((result) => {
      setData(result);
      setLastUpdated(new Date());
    });

    refreshInFlight.current = request;
    request
      .catch(() => undefined)
      .finally(() => {
        refreshInFlight.current = null;
      });

    return request;
  }, []);

  useEffect(() => {
    refresh().catch((err) => setError(err instanceof Error ? err.message : "Chargement impossible."));

    let timer: number | undefined;

    function start() {
      if (timer !== undefined) return;
      timer = window.setInterval(() => {
        if (document.visibilityState === "visible") refresh().catch(() => undefined);
      }, 10_000);
    }

    function stop() {
      if (timer === undefined) return;
      window.clearInterval(timer);
      timer = undefined;
    }

    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        refresh().catch(() => undefined);
        start();
      } else {
        stop();
      }
    }

    start();
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onVisibilityChange);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onVisibilityChange);
    };
  }, [refresh]);

  function flash(text: string) {
    setNotice(text);
    window.setTimeout(() => setNotice(""), 4000);
  }

  async function logout() {
    await post("/api/auth/logout");
    onLogout();
  }

  async function handleExport(kind: "paid" | "remaining", format: "pdf" | "csv") {
    if (!data) return;
    const rows = kind === "paid" ? data.paid : data.remaining;
    if (!rows.length) {
      setError("Aucune donnée à exporter.");
      return;
    }
    try {
      setError("");
      if (format === "pdf") await exportPdf(rows, data.settings, kind);
      else exportMembersCsv(rows, data.settings);
      flash("Export généré.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export impossible.");
    }
  }

  async function changePassword(event: React.FormEvent) {
    event.preventDefault();
    try {
      setError("");
      await post("/api/auth/change-password", passwordForm);
      setPasswordForm({ currentPassword: "", newPassword: "" });
      setShowPasswordForm(false);
      flash("Mot de passe modifié.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Changement impossible.");
    }
  }

  if (!data) {
    return (
      <div className="splash">
        <div>
          <div style={{ fontSize: 26, textAlign: "center" }}>⚽</div>
          <p>{error ? <span className="notice error">{error}</span> : "Chargement des cotisations…"}</p>
        </div>
      </div>
    );
  }

  const isAdmin = user.role === "admin";

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">⚽</div>
          <div>
            <div className="brand-title">{data.settings.tournamentName}</div>
            <div className="brand-subtitle">Espace cotisations · {formatDate(data.settings.deadline)}</div>
          </div>
        </div>

        <div className="topbar-right">
          <Countdown deadline={data.settings.deadline} />
          <div
            className="live-chip"
            title="Actualisation automatique toutes les 10 secondes"
            aria-label="Données en direct"
          >
            <span className="live-dot" />
            <span>En direct</span>
            {lastUpdated && (
              <span className="live-time">
                {lastUpdated.toLocaleTimeString("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>
            )}
            <button
              type="button"
              className="live-refresh"
              onClick={() => refresh().catch(() => undefined)}
              aria-label="Actualiser maintenant"
            >
              ↻
            </button>
          </div>
          <div className="user-chip">
            <div className="avatar">{user.fullName.slice(0, 2).toUpperCase()}</div>
            <div>
              <div className="user-name">{user.fullName}</div>
              <div className="user-role">{isAdmin ? "Administrateur" : "Membre"}</div>
            </div>
          </div>
          <button className="btn btn-light btn-sm" onClick={logout}>
            Déconnexion
          </button>
        </div>
      </header>

      <main className="container">
        <div className="page-heading">
          <div>
            <h1>Bonjour {user.fullName.split(" ")[0]} 👋</h1>
            <p>
              {isAdmin
                ? "Gérez les membres, les paiements et les exports depuis ce tableau de bord."
                : "Consultez les cotisations enregistrées pour le tournoi."}
            </p>
          </div>
          {isAdmin && (
            <div className="toolbar" style={{ marginBottom: 0 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => handleExport("paid", "pdf")}>
                📄 PDF payés
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => handleExport("remaining", "pdf")}>
                📄 PDF restants
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => handleExport("paid", "csv")}>
                CSV
              </button>
            </div>
          )}
        </div>

        {notice && <div className="notice success">{notice}</div>}
        {error && <div className="notice error">{error}</div>}

        <div className="tabs">
          <button
            className={`tab ${view === "cotisations" ? "active" : ""}`}
            onClick={() => setView("cotisations")}
          >
            Cotisations
          </button>
          <button
            className={`tab ${view === "comptabilite" ? "active" : ""}`}
            onClick={() => setView("comptabilite")}
          >
            Comptabilité
          </button>
        </div>

        {view === "cotisations" && (
          <>
        <div className="stats-grid">
          <div className="stat-card green">
            <div className="stat-label">Total collecté</div>
            <div className="stat-value">{formatMoney(data.stats.collected)}</div>
            <div className="stat-note">sur {formatMoney(data.stats.expected)} attendus</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Membres inscrits</div>
            <div className="stat-value">{data.stats.total}</div>
            <div className="stat-note">toutes catégories</div>
          </div>
          <div className="stat-card green">
            <div className="stat-label">Ont payé</div>
            <div className="stat-value">{data.stats.paid}</div>
            <div className="stat-note">cotisation entièrement réglée</div>
          </div>
          <div className="stat-card red">
            <div className="stat-label">En attente</div>
            <div className="stat-value">{data.stats.remaining}</div>
            <div className="stat-note">dont {data.stats.partial} acompte(s)</div>
          </div>
        </div>

        {isAdmin ? (
          <AdminPanel data={data} refresh={refresh} />
        ) : (
          <>
            <div className="notice info">
              Date limite : <strong>{formatDate(data.settings.deadline)}</strong>. Pensez à vérifier
              votre statut avant la clôture des inscriptions.
            </div>

            <section className="card">
              <div className="card-head">
                <div>
                  <h2>Membres ayant payé</h2>
                  <p className="card-subtitle">
                      Liste actualisée automatiquement toutes les 10 secondes.
                    </p>
                </div>
                <span className="badge ok">{data.paid.length} payé(s)</span>
              </div>
              <MembersTable rows={data.paid} variant="paid" />
            </section>

            {data.remaining.length > 0 && (
              <section className="card">
                <div className="card-head">
                  <div>
                    <h2>Membres en attente</h2>
                    <p className="card-subtitle">
                      Ils doivent encore un solde, même s&apos;ils ont déjà versé un acompte.
                    </p>
                  </div>
                  <span className="badge warn">{data.remaining.length} en attente</span>
                </div>
                <MembersTable rows={data.remaining} variant="remaining" />
              </section>
            )}
          </>
        )}
          </>
        )}

        {view === "comptabilite" && (
          <Accounting accounting={data.accounting} isAdmin={isAdmin} refresh={refresh} />
        )}

        <section className="card">
          <div className="card-head">
            <div>
              <h2>Mon compte</h2>
              <p className="card-subtitle">
                Connecté avec le numéro <strong>{user.phone}</strong>
              </p>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowPasswordForm((v) => !v)}>
              {showPasswordForm ? "Fermer" : "Changer mon mot de passe"}
            </button>
          </div>

          {showPasswordForm && (
            <form onSubmit={changePassword} className="form-grid">
              <div className="field">
                <label>Mot de passe actuel</label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  placeholder="Votre numéro si inchangé"
                />
              </div>
              <div className="field">
                <label>Nouveau mot de passe</label>
                <input
                  required
                  minLength={6}
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                />
              </div>
              <div className="field" style={{ justifyContent: "flex-end" }}>
                <button className="btn btn-primary" type="submit">
                  Enregistrer
                </button>
              </div>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
