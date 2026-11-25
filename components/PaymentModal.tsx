"use client";

import { useEffect, useRef, useState } from "react";
import type { Member } from "@/lib/types";
import { formatMoney } from "@/lib/utils";

interface Props {
  member: Member;
  busy: boolean;
  /** "topup" : le montant saisi s'ajoute à l'acompte ; "total" : il remplace le montant enregistré. */
  mode: "topup" | "total";
  onClose: () => void;
  onSave: (amount: number, reference: string) => void | Promise<void>;
}

export default function PaymentModal({ member, busy, mode, onClose, onSave }: Props) {
  const isTopup = mode === "topup";
  const [amount, setAmount] = useState(
    String(isTopup ? member.remainingAmount : member.amount),
  );
  const [reference, setReference] = useState(member.payment?.reference ?? "");
  const amountRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    amountRef.current?.focus();

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value < 0) return;
    await onSave(value, reference);
  }

  const title = isTopup
    ? "Compléter l'acompte"
    : member.status === "paid"
      ? "Modifier le paiement"
      : "Enregistrer un paiement";

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="payment-modal-title">
        <div className="modal-head">
          <div>
            <h2 id="payment-modal-title">{title}</h2>
            <p className="card-subtitle">{member.fullName} · {member.phone}</p>
          </div>
          <button type="button" className="icon-btn" aria-label="Fermer" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={submit}>
          <div className="modal-body">
            <div className="payment-summary">
              <div>
                <span>Montant dû</span>
                <strong>{formatMoney(member.amount)}</strong>
              </div>
              <div>
                <span>Déjà versé</span>
                <strong>{formatMoney(member.paidAmount)}</strong>
              </div>
              <div>
                <span>Reste</span>
                <strong>{formatMoney(member.remainingAmount)}</strong>
              </div>
              {isTopup && (
                <div>
                  <span>Total après ajout</span>
                  <strong>{formatMoney(member.paidAmount + (Number(amount) || 0))}</strong>
                </div>
              )}
            </div>

            <div className="field">
              <label htmlFor="payment-amount">
                {isTopup ? "Montant à ajouter (FCFA)" : "Montant versé (FCFA)"}
              </label>
              <input
                id="payment-amount"
                ref={amountRef}
                required
                type="number"
                min="0"
                step="1"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
              <span className="hint">
                {isTopup
                  ? `Ce montant s'ajoute aux ${formatMoney(member.paidAmount)} déjà versés. Laissez 0 pour ne rien ajouter.`
                  : "Un montant inférieur au tarif est enregistré comme acompte. Mettez 0 pour annuler le paiement."}
              </span>
            </div>

            <div className="field">
              <label htmlFor="payment-reference">Référence (facultatif)</label>
              <input
                id="payment-reference"
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                placeholder="Ex. Orange Money"
              />
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
