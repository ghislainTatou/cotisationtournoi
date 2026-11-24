"use client";

import { useEffect, useState } from "react";
import { del, patch, post } from "@/lib/client-api";
import type { Category, DashboardData, Member, Role } from "@/lib/types";
import { formatMoney, toLocalInputValue } from "@/lib/utils";
import MembersTable from "@/components/MembersTable";

interface Props {
  data: DashboardData;
  refresh: () => Promise<void>;
}

interface MemberForm {
  fullName: string;
  phone: string;
  categoryId: string;
  role: Role;
  resetPassword: boolean;
}

interface CategoryDraft {
  id: string;
  name: string;
  amount: string;
  sortOrder: string;
}

const emptyMemberForm: MemberForm = {
  fullName: "",
  phone: "",
  categoryId: "",
  role: "member",
  resetPassword: false,
};

export default function AdminPanel({ data, refresh }: Props) {
  const [tab, setTab] = useState<"members" | "categories" | "settings">("members");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Member | null>(null);
  const [memberForm, setMemberForm] = useState<MemberForm>(emptyMemberForm);
  const [importText, setImportText] = useState("");
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [categoryDrafts, setCategoryDrafts] = useState<CategoryDraft[]>([]);
  const [newCategory, setNewCategory] = useState({ name: "", amount: "", sortOrder: "99" });
  const [settingsForm, setSettingsForm] = useState({
    tournamentName: data.settings.tournamentName,
    deadline: toLocalInputValue(data.settings.deadline),
    showRemainingToMembers: data.settings.showRemainingToMembers,
  });

  useEffect(() => {
    setCategoryDrafts(
      data.categories.map((c) => ({
        id: c.id,
        name: c.name,
        amount: String(c.amount),
        sortOrder: String(c.sortOrder),
      })),
    );
  }, [data.categories]);

  useEffect(() => {
    setSettingsForm({
      tournamentName: data.settings.tournamentName,
      deadline: toLocalInputValue(data.settings.deadline),
      showRemainingToMembers: data.settings.showRemainingToMembers,
    });
  }, [data.settings]);

  function notify(text: string) {
    setMessage(text);
    window.setTimeout(() => setMessage(""), 4000);
  }

  function fail(err: unknown) {
    setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    window.setTimeout(() => setError(""), 5000);
  }

  async function run(action: () => Promise<void>, success?: string) {
    setBusy(true);
    setError("");
    try {
      await action();
      await refresh();
      if (success) notify(success);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }

  function startEdit(member: Member) {
    setEditing(member);
    setMemberForm({
      fullName: member.fullName,
      phone: member.phone,
      categoryId: member.categoryId ?? "",
      role: member.role,
      resetPassword: false,
    });
    setTab("members");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetMemberForm() {
    setEditing(null);
    setMemberForm(emptyMemberForm);
  }

  async function submitMember(event: React.FormEvent) {
    event.preventDefault();
    await run(async () => {
      if (editing) {
        await patch(`/api/members/${editing.id}`, memberForm);
        resetMemberForm();
      } else {
        await post("/api/members", memberForm);
        setMemberForm({ ...emptyMemberForm, categoryId: memberForm.categoryId });
      }
    }, editing ? "Membre mis à jour." : "Membre ajouté.");
  }

  async function togglePayment(member: Member) {
    await run(
      () =>
        patch(`/api/members/${member.id}`, {
          payment: { paid: !member.payment },
        }),
      member.payment ? "Paiement annulé." : "Paiement enregistré.",
    );
  }

  async function deleteMember(member: Member) {
    if (!window.confirm(`Supprimer ${member.fullName} et son paiement ?`)) return;
    await run(() => del(`/api/members/${member.id}`), "Membre supprimé.");
  }

  async function submitImport(event: React.FormEvent) {
    event.preventDefault();
    await run(async () => {
      const result = await post<{ created: number; errors: string[] }>("/api/members/import", {
        lines: importText,
      });
      setImportErrors(result.errors);
      if (result.created) {
        setImportText("");
        notify(`${result.created} membre(s) importé(s).`);
      }
    });
  }

  async function saveCategory(draft: CategoryDraft) {
    await run(
      () =>
        patch("/api/categories", {
          id: draft.id,
          name: draft.name,
          amount: Number(draft.amount),
          sortOrder: Number(draft.sortOrder),
        }),
      "Catégorie enregistrée.",
    );
  }

  async function addCategory(event: React.FormEvent) {
    event.preventDefault();
    await run(async () => {
      await post("/api/categories", {
        name: newCategory.name,
        amount: Number(newCategory.amount),
        sortOrder: Number(newCategory.sortOrder || 99),
      });
      setNewCategory({ name: "", amount: "", sortOrder: "99" });
    }, "Catégorie ajoutée.");
  }

  async function deleteCategory(category: Category) {
    if (!window.confirm(`Supprimer la catégorie « ${category.name} » ?`)) return;
    await run(() => del(`/api/categories?id=${category.id}`), "Catégorie supprimée.");
  }

  async function saveSettings(event: React.FormEvent) {
    event.preventDefault();
    await run(async () => {
      await patch("/api/settings", {
        tournamentName: settingsForm.tournamentName,
        deadline: new Date(settingsForm.deadline).toISOString(),
        showRemainingToMembers: settingsForm.showRemainingToMembers,
      });
    }, "Paramètres enregistrés.");
  }

  return (
    <>
      <div className="tabs">
        <button className={`tab ${tab === "members" ? "active" : ""}`} onClick={() => setTab("members")}>
          Gestion des membres
        </button>
        <button className={`tab ${tab === "categories" ? "active" : ""}`} onClick={() => setTab("categories")}>
          Catégories & tarifs
        </button>
        <button className={`tab ${tab === "settings" ? "active" : ""}`} onClick={() => setTab("settings")}>
          Paramètres
        </button>
      </div>

      {message && <div className="notice success">{message}</div>}
      {error && <div className="notice error">{error}</div>}

      {tab === "members" && (
        <>
          <section className="card">
            <div className="card-head">
              <div>
                <h2>{editing ? "Modifier le membre" : "Ajouter un membre"}</h2>
                <p className="card-subtitle">
                  Le mot de passe par défaut est automatiquement le numéro de téléphone.
                </p>
              </div>
              {editing && (
                <button className="btn btn-ghost btn-sm" onClick={resetMemberForm}>
                  Annuler la modification
                </button>
              )}
            </div>

            <form onSubmit={submitMember} className="form-grid">
              <div className="field">
                <label>Nom complet</label>
                <input
                  required
                  value={memberForm.fullName}
                  onChange={(e) => setMemberForm({ ...memberForm, fullName: e.target.value })}
                  placeholder="Ex. Jean Koffi"
                />
              </div>
              <div className="field">
                <label>Téléphone (login)</label>
                <input
                  required
                  type="tel"
                  value={memberForm.phone}
                  onChange={(e) => setMemberForm({ ...memberForm, phone: e.target.value })}
                  placeholder="+2250700000000"
                />
              </div>
              <div className="field">
                <label>Catégorie</label>
                <select
                  value={memberForm.categoryId}
                  onChange={(e) => setMemberForm({ ...memberForm, categoryId: e.target.value })}
                >
                  <option value="">Non catégorisé</option>
                  {data.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — {formatMoney(c.amount)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Rôle</label>
                <select
                  value={memberForm.role}
                  onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value as Role })}
                >
                  <option value="member">Membre</option>
                  <option value="admin">Administrateur</option>
                </select>
              </div>
              {editing && (
                <div className="field full checkbox-row">
                  <input
                    id="reset-password"
                    type="checkbox"
                    checked={memberForm.resetPassword}
                    onChange={(e) => setMemberForm({ ...memberForm, resetPassword: e.target.checked })}
                  />
                  <label htmlFor="reset-password">Réinitialiser le mot de passe au numéro de téléphone</label>
                </div>
              )}
              <div className="field full">
                <button className="btn btn-primary" disabled={busy} type="submit">
                  {editing ? "Enregistrer les modifications" : "Ajouter le membre"}
                </button>
              </div>
            </form>
          </section>

          <section className="card">
            <div className="card-head">
              <div>
                <h2>Tous les membres</h2>
                <p className="card-subtitle">Cochez un paiement pour le comptabiliser immédiatement.</p>
              </div>
            </div>
            <MembersTable
              rows={data.members}
              variant="all"
              busy={busy}
              onToggle={togglePayment}
              onEdit={startEdit}
              onDelete={deleteMember}
            />
          </section>

          <section className="card">
            <div className="card-head">
              <div>
                <h2>Import en masse</h2>
                <p className="card-subtitle">
                  Une ligne par membre : <code>téléphone;nom;catégorie</code>
                </p>
              </div>
            </div>
            <form onSubmit={submitImport}>
              <div className="field">
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder={"+2250700000001;Jean Koffi;Adulte\n+2250500000002;Awa Diallo;Étudiant"}
                />
              </div>
              <div style={{ marginTop: 12 }}>
                <button className="btn btn-ghost" disabled={busy || !importText.trim()} type="submit">
                  Importer
                </button>
              </div>
            </form>
            {importErrors.length > 0 && (
              <div className="notice error" style={{ marginTop: 14, marginBottom: 0 }}>
                {importErrors.map((line) => (
                  <div key={line}>{line}</div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {tab === "categories" && (
        <>
          <section className="card">
            <div className="card-head">
              <div>
                <h2>Catégories de membres</h2>
                <p className="card-subtitle">
                  Modifiez les montants librement. Le changement s&apos;applique aussi aux paiements déjà enregistrés.
                </p>
              </div>
            </div>

            <div className="category-list">
              {categoryDrafts.map((draft) => (
                <div className="category-row" key={draft.id}>
                  <input
                    aria-label="Nom de la catégorie"
                    value={draft.name}
                    onChange={(e) =>
                      setCategoryDrafts((prev) =>
                        prev.map((d) => (d.id === draft.id ? { ...d, name: e.target.value } : d)),
                      )
                    }
                  />
                  <input
                    aria-label="Montant"
                    type="number"
                    min="0"
                    value={draft.amount}
                    onChange={(e) =>
                      setCategoryDrafts((prev) =>
                        prev.map((d) => (d.id === draft.id ? { ...d, amount: e.target.value } : d)),
                      )
                    }
                  />
                  <input
                    aria-label="Ordre"
                    type="number"
                    value={draft.sortOrder}
                    onChange={(e) =>
                      setCategoryDrafts((prev) =>
                        prev.map((d) => (d.id === draft.id ? { ...d, sortOrder: e.target.value } : d)),
                      )
                    }
                  />
                  <div className="row-actions">
                    <button className="btn btn-sm btn-primary" disabled={busy} onClick={() => saveCategory(draft)}>
                      Sauver
                    </button>
                    <button className="btn btn-sm btn-danger" disabled={busy} onClick={() => deleteCategory({ id: draft.id, name: draft.name, amount: Number(draft.amount), sortOrder: Number(draft.sortOrder) })}>
                      ✕
                    </button>
                  </div>
                </div>
              ))}
              {categoryDrafts.length === 0 && <p className="hint">Aucune catégorie pour le moment.</p>}
            </div>
          </section>

          <section className="card">
            <h3>Ajouter une catégorie</h3>
            <form onSubmit={addCategory} className="form-grid">
              <div className="field">
                <label>Nom</label>
                <input
                  required
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                  placeholder="Ex. Senior"
                />
              </div>
              <div className="field">
                <label>Montant (FCFA)</label>
                <input
                  required
                  type="number"
                  min="0"
                  value={newCategory.amount}
                  onChange={(e) => setNewCategory({ ...newCategory, amount: e.target.value })}
                  placeholder="10000"
                />
              </div>
              <div className="field">
                <label>Ordre d&apos;affichage</label>
                <input
                  type="number"
                  value={newCategory.sortOrder}
                  onChange={(e) => setNewCategory({ ...newCategory, sortOrder: e.target.value })}
                />
              </div>
              <div className="field" style={{ justifyContent: "flex-end" }}>
                <button className="btn btn-primary" disabled={busy} type="submit">
                  Ajouter
                </button>
              </div>
            </form>
          </section>
        </>
      )}

      {tab === "settings" && (
        <section className="card">
          <div className="card-head">
            <div>
              <h2>Paramètres du tournoi</h2>
              <p className="card-subtitle">
                La date limite est affichée à tous les membres sous forme de J-3, J-2, J-1…
              </p>
            </div>
          </div>

          <form onSubmit={saveSettings} className="form-grid">
            <div className="field full">
              <label>Nom du tournoi</label>
              <input
                required
                value={settingsForm.tournamentName}
                onChange={(e) => setSettingsForm({ ...settingsForm, tournamentName: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Date et heure limites</label>
              <input
                required
                type="datetime-local"
                value={settingsForm.deadline}
                onChange={(e) => setSettingsForm({ ...settingsForm, deadline: e.target.value })}
              />
              <span className="hint">Les membres voient automatiquement J-x avant cette date.</span>
            </div>
            <div className="field checkbox-row" style={{ alignSelf: "end", paddingBottom: 10 }}>
              <input
                id="show-remaining"
                type="checkbox"
                checked={settingsForm.showRemainingToMembers}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, showRemainingToMembers: e.target.checked })
                }
              />
              <label htmlFor="show-remaining">Afficher la liste des restants aux membres</label>
            </div>
            <div className="field full">
              <button className="btn btn-primary" disabled={busy} type="submit">
                Enregistrer les paramètres
              </button>
            </div>
          </form>
        </section>
      )}
    </>
  );
}
