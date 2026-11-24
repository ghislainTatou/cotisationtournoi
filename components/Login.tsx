"use client";

import { useState } from "react";
import { post } from "@/lib/client-api";
import type { SessionUser } from "@/lib/types";

export default function Login({ onSuccess }: { onSuccess: (user: SessionUser) => void }) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await post<{ user: SessionUser }>("/api/auth/login", { phone, password });
      onSuccess(data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connexion impossible.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-hero">
        <div>
          <div className="brand">
            <div className="brand-mark">⚽</div>
            <div>
              <div className="brand-title">Cotisations Tournoi</div>
              <div className="brand-subtitle">Suivi en temps réel des paiements</div>
            </div>
          </div>
        </div>

        <div>
          <h1>Chaque cotisation compte pour faire vivre le tournoi.</h1>
          <p>
            Connectez-vous avec votre numéro de téléphone pour consulter la liste des membres
            à jour et suivre la date limite.
          </p>
          <ul>
            <li>Liste des cotisations payées en direct</li>
            <li>Compte à rebours automatique avant la clôture</li>
            <li>Export PDF des payés et des membres restants</li>
          </ul>
        </div>

        <div className="brand-subtitle">Édition 2026</div>
      </section>

      <section className="login-panel">
        <form className="login-card" onSubmit={handleSubmit}>
          <h2>Connexion</h2>
          <p>Entrez vos identifiants pour accéder à votre espace.</p>

          {error && <div className="notice error">{error}</div>}

          <div className="field">
            <label htmlFor="phone">Numéro de téléphone</label>
            <input
              id="phone"
              type="tel"
              autoComplete="username"
              placeholder="+225 07 00 00 00 00"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="password">Mot de passe</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="Votre numéro de téléphone"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? "Connexion…" : "Se connecter"}
          </button>

          <div className="login-foot">
            <strong>Mot de passe par défaut :</strong> votre numéro de téléphone. Laissez le champ
            vide ou saisissez-le directement.
          </div>
        </form>
      </section>
    </main>
  );
}
