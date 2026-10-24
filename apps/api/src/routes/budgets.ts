import type { FastifyPluginAsync } from "fastify";
import { budgetSchema, monthQuerySchema } from "@financecave/shared";
import { prisma } from "../lib/prisma.js";
import { currentUserId } from "../lib/auth.js";

export const budgetRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", app.authenticate);

  app.get("/", async (request, reply) => {
    const parsed = monthQuerySchema.safeParse(request.query);
    if (!parsed.success) return reply.code(400).send({ error: "Informe year e month" });

    return prisma.budget.findMany({
      where: { userId: currentUserId(request), ...parsed.data },
    });
  });

  // Cria ou atualiza o orçamento de uma categoria em um mês.
  app.put("/", async (request, reply) => {
    const parsed = budgetSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    const userId = currentUserId(request);
    const { categoryId, year, month, amountCents } = parsed.data;

    const owned = await prisma.category.findFirst({ where: { id: categoryId, userId } });
    if (!owned) return reply.code(400).send({ error: "Categoria inválida" });

    const budget = await prisma.budget.upsert({
      where: { userId_categoryId_year_month: { userId, categoryId, year, month } },
      update: { amountCents },
      create: { userId, categoryId, year, month, amountCents },
    });
    return budget;
  });
};
