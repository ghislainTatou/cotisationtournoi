"use client";

import { useMemo, useState } from "react";
import type { Member } from "@/lib/types";
import { formatDate, formatMoney } from "@/lib/utils";

interface Props {
  rows: Member[];
  variant: "paid" | "remaining" | "all";
  busy?: boolean;
  onToggle?: (member: Member) => void;
  onEdit?: (member: Member) => void;
  onDelete?: (member: Member) => void;
}

export default function MembersTable({ rows, variant, busy, onToggle, onEdit, onDelete }: Props) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("fr-FR");
    if (!needle) return rows;
    return rows.filter((m) =>
      [m.fullName, m.phone, m.categoryName, m.payment?.reference ?? ""]
        .join(" ")
        .toLocaleLowerCase("fr-FR")
        .includes(needle),
    );
  }, [rows, query]);

  const showStatus = variant === "all";
  const showPaymentDate = variant === "paid" || variant === "all";
  const showActions = Boolean(onToggle || onEdit || onDelete);

  return (
    <>
      <div className="toolbar">
        <input
          className="search"
          type="search"
          placeholder="Rechercher un nom, un numéro, une référence…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <span className="hint">{filtered.length} résultat(s)</span>
      </div>

      {filtered.length === 0 ? (
        <div className="empty">
          <strong>Aucun membre à afficher</strong>
          {rows.length === 0
            ? variant === "paid"
              ? "Les paiements apparaîtront ici dès leur enregistrement."
              : "Tous les membres sont à jour."
            : "Essayez une autre recherche."}
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nom</th>
                <th>Téléphone</th>
                <th>Catégorie</th>
                <th>Montant</th>
                {showPaymentDate && <th>Date paiement</th>}
                {showStatus && <th>Statut</th>}
                {showActions && <th style={{ textAlign: "right" }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((member) => (
                <tr key={member.id}>
                  <td className="name-cell">{member.fullName}</td>
                  <td className="phone-cell">{member.phone}</td>
                  <td>{member.categoryName}</td>
                  <td>{formatMoney(member.payment?.amount ?? member.amount)}</td>
                  {showPaymentDate && <td>{formatDate(member.payment?.paidAt)}</td>}
                  {showStatus && (
                    <td>
                      {member.payment ? (
                        <span className="badge ok">✓ Payé</span>
                      ) : (
                        <span className="badge warn">En attente</span>
                      )}
                    </td>
                  )}
                  {showActions && (
                    <td>
                      <div className="row-actions" style={{ justifyContent: "flex-end" }}>
                        {onToggle && (
                          <button
                            className={`btn btn-sm ${member.payment ? "btn-ghost" : "btn-primary"}`}
                            disabled={busy}
                            onClick={() => onToggle(member)}
                          >
                            {member.payment ? "Annuler" : "Marquer payé"}
                          </button>
                        )}
                        {onEdit && (
                          <button className="btn btn-sm btn-ghost" onClick={() => onEdit(member)}>
                            Modifier
                          </button>
                        )}
                        {onDelete && (
                          <button
                            className="btn btn-sm btn-danger"
                            disabled={busy}
                            onClick={() => onDelete(member)}
                          >
                            Supprimer
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
