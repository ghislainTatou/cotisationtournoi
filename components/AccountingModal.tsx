"use client";

import { useEffect, useRef, useState } from "react";
import type { AccountingKind } from "@/lib/types";

export interface AccountingFormValues {
  kind: AccountingKind;
  label: string;
  amount: number;
  observation: string;
}

interface Props {
  kind: AccountingKind;
  busy: boolean;
  onClose: () => void;
  onSave: (values: AccountingFormValues) => void | Promise<void>;
}

export default function AccountingModal({ kind, busy, onClose, onSave }: Props) {
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [observation, setObservation] = useState("");
  const labelRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    labelRef.current?.focus();

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
    if (!Number.isFinite(value) || value <= 0) return;
    await onSave({ kind, label, amount: value, observation });
  }

  const isIncome = kind === "income";

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="accounting-modal-title">
        <div className="modal-head">
          <div>
            <h2 id="accounting-modal-title">
              {isIncome ? "Ajouter une entrée" : "Ajouter une sortie"}
            </h2>
            <p className="card-subtitle">
              {isIncome
                ? "Don, subvention ou toute autre recette."
                : "Dépense : transport, achat, frais divers…"}
            </p>
          </div>
          <button type="button" className="icon-btn" aria-label="Fermer" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={submit}>
          <div className="modal-body">
            <div className="field">
              <label htmlFor="accounting-label">Libellé</label>
              <input
                id="accounting-label"
                ref={labelRef}
                required
                minLength={2}
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                placeholder={isIncome ? "Ex. Don de M. Koffi" : "Ex. Transport lot 2"}
              />
            </div>

            <div className="field">
              <label htmlFor="accounting-amount">Montant (FCFA)</label>
              <input
                id="accounting-amount"
                required
                type="number"
                min="1"
                step="1"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="50000"
              />
            </div>

            <div className="field">
              <label htmlFor="accounting-observation">Observation (facultatif)</label>
              <textarea
                id="accounting-observation"
                value={observation}
                onChange={(event) => setObservation(event.target.value)}
                placeholder="Précision sur le mouvement"
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
