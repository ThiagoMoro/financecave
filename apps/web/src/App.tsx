import { useEffect, useState } from "react";
import { api } from "./api";
import { AuthForm } from "./pages/AuthForm";
import { Dashboard } from "./pages/Dashboard";

export type User = { id: string; name: string; email: string };

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ user: User }>("/auth/me")
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="center">Carregando…</p>;
  if (!user) return <AuthForm onAuthenticated={setUser} />;
  return <Dashboard user={user} onLogout={() => setUser(null)} />;
}
