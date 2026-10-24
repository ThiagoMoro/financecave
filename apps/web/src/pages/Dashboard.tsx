import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api, formatBRL, toCents } from "../api";
import type { User } from "../App";

type Category = { id: string; name: string };
type Transaction = {
  id: string;
  type: "INCOME" | "EXPENSE";
  amountCents: number;
  description: string;
  date: string;
  category: Category | null;
};
type Summary = {
  totals: { income: number; expense: number; balance: number };
  categories: { id: string; name: string; budgetCents: number; spentCents: number }[];
};

type Props = { user: User; onLogout: () => void };

export function Dashboard({ user, onLogout }: Props) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const query = `?year=${year}&month=${month}`;
      const [cats, txs, sum] = await Promise.all([
        api<Category[]>("/categories"),
        api<Transaction[]>(`/transactions${query}`),
        api<Summary>(`/summary${query}`),
      ]);
      setCategories(cats);
      setTransactions(txs);
      setSummary(sum);
    } catch {
      setError("Não foi possível carregar os dados");
    }
  }, [year, month]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function logout() {
    await api("/auth/logout", { method: "POST" });
    onLogout();
  }

  return (
    <main className="dashboard">
      <header>
        <h1>Olá, {user.name}</h1>
        <div className="month">
          <input type="number" value={month} min={1} max={12} onChange={(e) => setMonth(Number(e.target.value))} />
          <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} />
        </div>
        <button className="link" onClick={logout}>Sair</button>
      </header>

      {error && <p className="error">{error}</p>}

      {summary && (
        <section className="totals">
          <div><span>Receitas</span><strong>{formatBRL(summary.totals.income)}</strong></div>
          <div><span>Despesas</span><strong>{formatBRL(summary.totals.expense)}</strong></div>
          <div><span>Saldo</span><strong>{formatBRL(summary.totals.balance)}</strong></div>
        </section>
      )}

      {summary && (
        <section>
          <h2>Orçamento por categoria</h2>
          <ul className="budgets">
            {summary.categories.map((c) => (
              <li key={c.id}>
                <span>{c.name}</span>
                <span>
                  {formatBRL(c.spentCents)} de {formatBRL(c.budgetCents)}
                </span>
                <BudgetInput
                  categoryId={c.id}
                  year={year}
                  month={month}
                  onSaved={reload}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2>Novo lançamento</h2>
        <TransactionForm categories={categories} onCreated={reload} />
      </section>

      <section>
        <h2>Lançamentos</h2>
        <ul className="transactions">
          {transactions.map((t) => (
            <li key={t.id} className={t.type.toLowerCase()}>
              <span>{t.date}</span>
              <span>{t.description}</span>
              <span>{t.category?.name ?? "Sem categoria"}</span>
              <strong>
                {t.type === "EXPENSE" ? "-" : "+"}
                {formatBRL(t.amountCents)}
              </strong>
            </li>
          ))}
          {transactions.length === 0 && <li className="empty">Nenhum lançamento neste mês</li>}
        </ul>
      </section>

      <CategoryManager categories={categories} onChange={reload} />
    </main>
  );
}

function BudgetInput({
  categoryId,
  year,
  month,
  onSaved,
}: {
  categoryId: string;
  year: number;
  month: number;
  onSaved: () => void;
}) {
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = new FormData(e.currentTarget).get("amount") as string;
    await api("/budgets", {
      method: "PUT",
      body: { categoryId, year, month, amountCents: toCents(value) },
    });
    e.currentTarget.reset();
    onSaved();
  }

  return (
    <form className="inline" onSubmit={save}>
      <input name="amount" placeholder="Orçamento" inputMode="decimal" required />
    </form>
  );
}

function TransactionForm({ categories, onCreated }: { categories: Category[]; onCreated: () => void }) {
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const categoryId = form.get("categoryId") as string;
    try {
      await api("/transactions", {
        method: "POST",
        body: {
          type: form.get("type"),
          amountCents: toCents(form.get("amount") as string),
          description: form.get("description"),
          date: form.get("date"),
          categoryId: categoryId || null,
        },
      });
      e.currentTarget.reset();
      setError(null);
      onCreated();
    } catch {
      setError("Não foi possível salvar o lançamento");
    }
  }

  return (
    <form className="stack" onSubmit={submit}>
      <select name="type" defaultValue="EXPENSE">
        <option value="EXPENSE">Despesa</option>
        <option value="INCOME">Receita</option>
      </select>
      <input name="description" placeholder="Descrição" required />
      <input name="amount" placeholder="Valor (ex: 42,90)" inputMode="decimal" required />
      <input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
      <select name="categoryId" defaultValue="">
        <option value="">Sem categoria</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      {error && <p className="error">{error}</p>}
      <button type="submit">Adicionar</button>
    </form>
  );
}

function CategoryManager({ categories, onChange }: { categories: Category[]; onChange: () => void }) {
  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = new FormData(e.currentTarget).get("name") as string;
    await api("/categories", { method: "POST", body: { name } });
    e.currentTarget.reset();
    onChange();
  }

  async function remove(id: string) {
    await api(`/categories/${id}`, { method: "DELETE" });
    onChange();
  }

  return (
    <section>
      <h2>Categorias</h2>
      <form className="inline" onSubmit={create}>
        <input name="name" placeholder="Nova categoria" required />
        <button type="submit">Criar</button>
      </form>
      <ul className="categories">
        {categories.map((c) => (
          <li key={c.id}>
            <span>{c.name}</span>
            <button className="link" onClick={() => remove(c.id)}>Remover</button>
          </li>
        ))}
      </ul>
    </section>
  );
}
