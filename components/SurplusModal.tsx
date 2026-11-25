"use client";

import { useEffect } from "react";
import { formatMoney } from "@/lib/utils";

interface Props {
  memberName: string;
  paidAmount: number;
  categoryAmount: number;
  busy: boolean;
  onClose: () => void;
  onChoose: (asApport: boolean) => void | Promise<void>;
}

export default function SurplusModal({
  memberName,
  paidAmount,
  categoryAmount,
  busy,
  onClose,
  onChoose,
}: Props) {
  const surplus = Math.max(0, paidAmount - categoryAmount);
  const cotisationAmount = Math.min(paidAmount, categoryAmount);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) onClose();
    }
    window.addEventListener("keydown", handleKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKey);
    };
  }, [busy, onClose]);

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="surplus-modal-title">
        <div className="modal-head">
          <div>
            <h2 id="surplus-modal-title">Cotisation ou apport ?</h2>
            <p className="card-subtitle">{memberName}</p>
          </div>
          <button type="button" className="icon-btn" aria-label="Fermer" onClick={onClose} disabled={busy}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className="payment-summary">
            <div>
              <span>Montant versé</span>
              <strong>{formatMoney(paidAmount)}</strong>
            </div>
            <div>
              <span>Tarif catégorie</span>
              <strong>{formatMoney(categoryAmount)}</strong>
            </div>
            <div>
              <span>Surplus</span>
              <strong>{formatMoney(surplus)}</strong>
            </div>
          </div>

          <p className="surplus-intro">
            Le montant versé dépasse le tarif de la catégorie. Précisez comment le comptabiliser dans
            le journal.
          </p>

          {surplus <= 0 ? (
            <p className="notice error">
              Le montant versé ne dépasse pas le tarif de la catégorie : aucun apport à enregistrer.
            </p>
          ) : (
            <>
              <button
                type="button"
                className="surplus-option"
                disabled={busy}
                onClick={() => onChoose(true)}
              >
                <span className="surplus-option-title">✅ Oui, c’est un apport</span>
                <span className="surplus-option-detail">
                  Cotisation {formatMoney(cotisationAmount)} + apport {formatMoney(surplus)} ={" "}
                  {formatMoney(paidAmount)} en deux lignes distinctes.
                </span>
              </button>

              <button
                type="button"
                className="surplus-option"
                disabled={busy}
                onClick={() => onChoose(false)}
              >
                <span className="surplus-option-title">Pas un apport</span>
                <span className="surplus-option-detail">
                  Seule la cotisation de {formatMoney(cotisationAmount)} sera inscrite. Le surplus de{" "}
                  {formatMoney(surplus)} ne sera pas comptabilisé.
                </span>
              </button>
            </>
          )}
        </div>

        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}
