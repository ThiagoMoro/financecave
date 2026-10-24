import type { FastifyPluginAsync } from "fastify";
import { monthQuerySchema } from "@financecave/shared";
import { prisma } from "../lib/prisma.js";
import { currentUserId } from "../lib/auth.js";

// Compara, por categoria, o orçamento planejado com o total gasto no mês.
export const summaryRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", app.authenticate);

  app.get("/", async (request, reply) => {
    const parsed = monthQuerySchema.safeParse(request.query);
    if (!parsed.success) return reply.code(400).send({ error: "Informe year e month" });

    const { year, month } = parsed.data;
    const userId = currentUserId(request);
    const range = {
      gte: new Date(Date.UTC(year, month - 1, 1)),
      lte: new Date(Date.UTC(year, month, 0)),
    };

    const [categories, budgets, transactions] = await Promise.all([
      prisma.category.findMany({ where: { userId }, orderBy: { name: "asc" } }),
      prisma.budget.findMany({ where: { userId, year, month } }),
      prisma.transaction.findMany({ where: { userId, date: range } }),
    ]);

    const budgetByCategory = new Map(budgets.map((b) => [b.categoryId, b.amountCents]));

    const totals = { income: 0, expense: 0 };
    const spentByCategory = new Map<string, number>();
    for (const t of transactions) {
      if (t.type === "INCOME") {
        totals.income += t.amountCents;
        continue;
      }
      totals.expense += t.amountCents;
      if (t.categoryId) {
        spentByCategory.set(t.categoryId, (spentByCategory.get(t.categoryId) ?? 0) + t.amountCents);
      }
    }

    return {
      year,
      month,
      totals: { ...totals, balance: totals.income - totals.expense },
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        budgetCents: budgetByCategory.get(c.id) ?? 0,
        spentCents: spentByCategory.get(c.id) ?? 0,
      })),
    };
  });
};
