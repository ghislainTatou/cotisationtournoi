"use client";

import { useState } from "react";
import AccountingModal, { type AccountingFormValues } from "@/components/AccountingModal";
import { del, post } from "@/lib/client-api";
import { exportAccountingPdf } from "@/lib/pdf";
import type { AccountingData, AccountingKind, AccountingEntry, Settings } from "@/lib/types";
import { exportAccountingCsv, formatDate, formatMoney } from "@/lib/utils";

interface Props {
  accounting: AccountingData;
  settings: Settings;
  isAdmin: boolean;
  refresh: () => Promise<void>;
}

const sourceLabels: Record<AccountingEntry["source"], string> = {
  cotisation: "Auto",
  apport: "Apport",
  manuel: "Manuel",
};

export default function Accounting({ accounting, settings, isAdmin, refresh }: Props) {
  const [formKind, setFormKind] = useState<AccountingKind | null>(null);
  const [filter, setFilter] = useState<"all" | AccountingKind>("all");
  const [detail, setDetail] = useState<AccountingEntry | null>(null);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  function flash(text: string) {
    setNotice(text);
    window.setTimeout(() => setNotice(""), 4000);
  }

  async function run(action: () => Promise<void>, success: string) {
    setBusy(true);
    setError("");
    try {
      await action();
      await refresh();
      flash(success);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
      window.setTimeout(() => setError(""), 5000);
    } finally {
      setBusy(false);
    }
  }

  function save(values: AccountingFormValues) {
    return run(async () => {
      await post("/api/accounting", values);
      setFormKind(null);
    }, values.kind === "income" ? "Entrée enregistrée." : "Sortie enregistrée.");
  }

  function remove(entry: AccountingEntry) {
    if (!entry.manualId) return;
    if (!window.confirm(`Supprimer la ligne « ${entry.label} » ?`)) return;
    return run(async () => {
      await del(`/api/accounting?id=${encodeURIComponent(entry.manualId!)}`);
    }, "Ligne supprimée.");
  }

  async function downloadPdf() {
    setExporting(true);
    setError("");
    try {
      await exportAccountingPdf(accounting, settings);
      flash("Rapport PDF généré.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Génération du rapport impossible.");
      window.setTimeout(() => setError(""), 5000);
    } finally {
      setExporting(false);
    }
  }

  function downloadCsv() {
    setError("");
    try {
      exportAccountingCsv(accounting, settings);
      flash("Rapport CSV généré.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Génération du rapport impossible.");
      window.setTimeout(() => setError(""), 5000);
    }
  }

  const incomeCount = accounting.entries.filter((entry) => entry.kind === "income").length;
  const expenseCount = accounting.entries.length - incomeCount;
  const visibleEntries =
    filter === "all"
      ? accounting.entries
      : accounting.entries.filter((entry) => entry.kind === filter);
  const visibleTotal = visibleEntries.reduce((sum, entry) => sum + entry.amount, 0);

  return (
    <>
      {notice && <div className="notice success">{notice}</div>}
      {error && <div className="notice error">{error}</div>}
      {!accounting.available && (
        <div className="notice error">
          La table comptable n&apos;est pas encore créée. Exécutez le fichier{" "}
          <code>supabase/accounting.sql</code> dans le SQL Editor Supabase pour activer les dons et
          dépenses. Les cotisations sont déjà visibles ci-dessous.
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card green">
          <div className="stat-label">Total entrées</div>
          <div className="stat-value">{formatMoney(accounting.income)}</div>
          <div className="stat-note">cotisations et dons</div>
        </div>
        <div className="stat-card red">
          <div className="stat-label">Total sorties</div>
          <div className="stat-value">{formatMoney(accounting.expense)}</div>
          <div className="stat-note">dépenses enregistrées</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Solde global</div>
          <div className="stat-value">{formatMoney(accounting.balance)}</div>
          <div className="stat-note">entrées − sorties</div>
        </div>
      </div>

      <section className="card">
        <div className="card-head">
          <div>
            <h2>Journal comptable</h2>
            <p className="card-subtitle">
              Chaque cotisation, don ou dépense apparaît sur une ligne distincte.
            </p>
          </div>
          {isAdmin && (
            <div className="toolbar" style={{ marginBottom: 0 }}>
              <button className="btn btn-ghost btn-sm" disabled={exporting} onClick={downloadPdf}>
                📄 Rapport PDF
              </button>
              <button className="btn btn-ghost btn-sm" disabled={exporting} onClick={downloadCsv}>
                CSV
              </button>
              <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => setFormKind("income")}>
                + Entrée
              </button>
              <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => setFormKind("expense")}>
                + Sortie
              </button>
            </div>
          )}
        </div>

        <div className="tabs" role="group" aria-label="Filtrer le journal comptable">
          <button
            type="button"
            className={`tab ${filter === "all" ? "active" : ""}`}
            onClick={() => setFilter("all")}
          >
            Tout ({accounting.entries.length})
          </button>
          <button
            type="button"
            className={`tab ${filter === "income" ? "active" : ""}`}
            onClick={() => setFilter("income")}
          >
            Entrées ({incomeCount})
          </button>
          <button
            type="button"
            className={`tab ${filter === "expense" ? "active" : ""}`}
            onClick={() => setFilter("expense")}
          >
            Sorties ({expenseCount})
          </button>
        </div>

        {filter !== "all" && (
          <p className="card-subtitle" style={{ marginBottom: 12 }}>
            Total affiché : <strong>{formatMoney(visibleTotal)}</strong> sur {visibleEntries.length}{" "}
            ligne(s).
          </p>
        )}

        {visibleEntries.length === 0 ? (
          <div className="empty">
            <strong>
              {filter === "all"
                ? "Aucun mouvement pour le moment"
                : filter === "income"
                  ? "Aucune entrée pour le moment"
                  : "Aucune sortie pour le moment"}
            </strong>
            {filter === "all"
              ? "Les cotisations enregistrées apparaîtront ici automatiquement."
              : "Essayez un autre filtre pour voir les autres mouvements."}
            {filter !== "all" && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ marginTop: 12 }}
                onClick={() => setFilter("all")}
              >
                Voir tout
              </button>
            )}
          </div>
        ) : (
          <div className="responsive-table">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Libellé</th>
                    <th>Observation</th>
                    <th>Origine</th>
                    <th style={{ textAlign: "right" }}>Montant</th>
                    {isAdmin && <th style={{ textAlign: "right" }}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {visibleEntries.map((entry) => (
                    <tr key={entry.id}>
                      <td className="phone-cell">{formatDate(entry.createdAt)}</td>
                      <td>
                        <span className={`badge ${entry.kind === "income" ? "ok" : "expense"}`}>
                          {entry.kind === "income" ? "Entrée" : "Sortie"}
                        </span>
                      </td>
                      <td className="name-cell">{entry.label}</td>
                      <td>{entry.observation ?? "—"}</td>
                      <td>
                        <span
                          className={`badge ${
                            entry.source === "cotisation"
                              ? "info"
                              : entry.source === "apport"
                                ? "apport"
                                : "warn"
                          }`}
                        >
                          {sourceLabels[entry.source]}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <span className={entry.kind === "income" ? "amount-in" : "amount-out"}>
                          {entry.kind === "income" ? "+" : "−"}
                          {formatMoney(entry.amount)}
                        </span>
                      </td>
                      {isAdmin && (
                        <td style={{ textAlign: "right" }}>
                          {entry.manualId && (
                            <button
                              className="btn btn-sm btn-danger"
                              disabled={busy}
                              onClick={() => remove(entry)}
                            >
                              Supprimer
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mobile-cards">
              {visibleEntries.map((entry) => (
                <button
                  type="button"
                  className="data-card"
                  key={entry.id}
                  onClick={() => setDetail(entry)}
                >
                  <span className="data-card-top">
                    <span className="data-card-title">{entry.label}</span>
                    <span className={`data-card-amount ${entry.kind}`}>
                      {entry.kind === "income" ? "+" : "−"}
                      {formatMoney(entry.amount)}
                    </span>
                  </span>
                  <span className="data-card-meta">
                    <span className={`origin-dot ${entry.source}`}>
                      {sourceLabels[entry.source]}
                    </span>
                    <span className={`badge ${entry.kind === "income" ? "ok" : "expense"}`}>
                      {entry.kind === "income" ? "Entrée" : "Sortie"}
                    </span>
                    <span className="phone-cell">{formatDate(entry.createdAt)}</span>
                  </span>
                  <span className="data-card-detail">
                    {entry.observation || "Aucune observation"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {detail && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setDetail(null);
          }}
        >
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="accounting-detail-title">
            <div className="modal-head">
              <div>
                <h2 id="accounting-detail-title">{detail.label}</h2>
                <p className="card-subtitle">{formatDate(detail.createdAt)}</p>
              </div>
              <button type="button" className="icon-btn" aria-label="Fermer" onClick={() => setDetail(null)}>
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="payment-summary">
                <div>
                  <span>Type</span>
                  <strong>{detail.kind === "income" ? "Entrée" : "Sortie"}</strong>
                </div>
                <div>
                  <span>Origine</span>
                  <strong>{sourceLabels[detail.source]}</strong>
                </div>
                <div>
                  <span>Montant</span>
                  <strong className={detail.kind === "income" ? "amount-in" : "amount-out"}>
                    {detail.kind === "income" ? "+" : "−"}
                    {formatMoney(detail.amount)}
                  </strong>
                </div>
              </div>

              <p className="detail-label">Observation</p>
              <p className="detail-value">{detail.observation || "Aucune observation."}</p>

              {isAdmin && detail.manualId && (
                <button
                  type="button"
                  className="btn btn-danger"
                  disabled={busy}
                  onClick={() => {
                    const entry = detail;
                    setDetail(null);
                    void remove(entry);
                  }}
                >
                  Supprimer cette ligne
                </button>
              )}
            </div>

            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setDetail(null)}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {formKind && (
        <AccountingModal
          kind={formKind}
          busy={busy}
          onClose={() => setFormKind(null)}
          onSave={save}
        />
      )}
    </>
  );
}
