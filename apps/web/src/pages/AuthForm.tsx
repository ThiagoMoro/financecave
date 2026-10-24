import { useState, type FormEvent } from "react";
import { api, ApiError } from "../api";
import type { User } from "../App";

type Props = { onAuthenticated: (user: User) => void };

export function AuthForm({ onAuthenticated }: Props) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const body = Object.fromEntries(form.entries());

    setSubmitting(true);
    setError(null);
    try {
      const data = await api<{ user: User }>(mode === "login" ? "/auth/login" : "/auth/register", {
        method: "POST",
        body,
      });
      onAuthenticated(data.user);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro de conexão");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth">
      <h1>financecave</h1>
      <form onSubmit={handleSubmit}>
        {mode === "register" && <input name="name" placeholder="Nome" required minLength={2} />}
        <input name="email" type="email" placeholder="E-mail" required />
        <input
          name="password"
          type="password"
          placeholder="Senha"
          required
          minLength={mode === "register" ? 8 : 1}
        />
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={submitting}>
          {mode === "login" ? "Entrar" : "Criar conta"}
        </button>
      </form>
      <button className="link" onClick={() => setMode(mode === "login" ? "register" : "login")}>
        {mode === "login" ? "Não tenho conta" : "Já tenho conta"}
      </button>
    </main>
  );
}
