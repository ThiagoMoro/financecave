import type { FastifyPluginAsync } from "fastify";
import { categorySchema } from "@financecave/shared";
import { prisma } from "../lib/prisma.js";
import { currentUserId } from "../lib/auth.js";

export const categoryRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", app.authenticate);

  app.get("/", async (request) => {
    return prisma.category.findMany({
      where: { userId: currentUserId(request) },
      orderBy: { name: "asc" },
    });
  });

  app.post("/", async (request, reply) => {
    const parsed = categorySchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    const category = await prisma.category.create({
      data: { name: parsed.data.name, userId: currentUserId(request) },
    });
    return reply.code(201).send(category);
  });

  app.delete<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const { count } = await prisma.category.deleteMany({
      where: { id: request.params.id, userId: currentUserId(request) },
    });
    if (count === 0) return reply.code(404).send({ error: "Categoria não encontrada" });
    return { ok: true };
  });
};
