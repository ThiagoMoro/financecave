import type { FastifyPluginAsync } from "fastify";
import { monthQuerySchema, transactionSchema } from "@financecave/shared";
import { prisma } from "../lib/prisma.js";
import { currentUserId } from "../lib/auth.js";

// Primeiro e último instante (UTC) do mês, para filtrar a coluna `date`.
function monthRange(year: number, month: number) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));
  return { gte: start, lte: end };
}

export const transactionRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", app.authenticate);

  app.get("/", async (request, reply) => {
    const parsed = monthQuerySchema.safeParse(request.query);
    if (!parsed.success) return reply.code(400).send({ error: "Informe year e month" });

    return prisma.transaction.findMany({
      where: {
        userId: currentUserId(request),
        date: monthRange(parsed.data.year, parsed.data.month),
      },
      include: { category: { select: { id: true, name: true } } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });
  });

  app.post("/", async (request, reply) => {
    const parsed = transactionSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    const userId = currentUserId(request);
    const { date, categoryId, ...rest } = parsed.data;

    if (categoryId) {
      const owned = await prisma.category.findFirst({ where: { id: categoryId, userId } });
      if (!owned) return reply.code(400).send({ error: "Categoria inválida" });
    }

    const transaction = await prisma.transaction.create({
      data: { ...rest, date: new Date(`${date}T00:00:00Z`), categoryId: categoryId ?? null, userId },
    });
    return reply.code(201).send(transaction);
  });

  app.delete<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const { count } = await prisma.transaction.deleteMany({
      where: { id: request.params.id, userId: currentUserId(request) },
    });
    if (count === 0) return reply.code(404).send({ error: "Lançamento não encontrado" });
    return { ok: true };
  });
};
