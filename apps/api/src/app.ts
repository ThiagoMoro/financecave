import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";
import { authRoutes } from "./routes/auth.js";
import { categoryRoutes } from "./routes/categories.js";
import { transactionRoutes } from "./routes/transactions.js";
import { budgetRoutes } from "./routes/budgets.js";
import { summaryRoutes } from "./routes/summary.js";

export const TOKEN_COOKIE = "token";

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export async function buildApp() {
  const app = Fastify({ logger: process.env.NODE_ENV !== "production" });

  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET não definido");

  await app.register(cookie);
  await app.register(jwt, {
    secret,
    cookie: { cookieName: TOKEN_COOKIE, signed: false },
  });

  app.decorate("authenticate", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      reply.code(401).send({ error: "Não autenticado" });
    }
  });

  await app.register(
    async (api) => {
      api.get("/health", async () => ({ ok: true }));
      await api.register(authRoutes, { prefix: "/auth" });
      await api.register(categoryRoutes, { prefix: "/categories" });
      await api.register(transactionRoutes, { prefix: "/transactions" });
      await api.register(budgetRoutes, { prefix: "/budgets" });
      await api.register(summaryRoutes, { prefix: "/summary" });
    },
    { prefix: "/api" },
  );

  return app;
}
