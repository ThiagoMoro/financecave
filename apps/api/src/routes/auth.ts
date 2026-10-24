import type { FastifyPluginAsync, FastifyReply } from "fastify";
import bcrypt from "bcryptjs";
import { loginSchema, registerSchema } from "@financecave/shared";
import { prisma } from "../lib/prisma.js";
import { TOKEN_COOKIE } from "../app.js";
import { currentUserId } from "../lib/auth.js";

const SEVEN_DAYS = 60 * 60 * 24 * 7;

export const authRoutes: FastifyPluginAsync = async (app) => {
  function setSession(reply: FastifyReply, userId: string) {
    const token = app.jwt.sign({ sub: userId }, { expiresIn: SEVEN_DAYS });
    reply.setCookie(TOKEN_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SEVEN_DAYS,
    });
  }

  app.post("/register", async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    const { name, email, password } = parsed.data;
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return reply.code(409).send({ error: "E-mail já cadastrado" });

    const user = await prisma.user.create({
      data: { name, email, passwordHash: await bcrypt.hash(password, 12) },
      select: { id: true, name: true, email: true },
    });
    setSession(reply, user.id);
    return reply.code(201).send({ user });
  });

  app.post("/login", async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Dados inválidos" });

    const { email, password } = parsed.data;
    const user = await prisma.user.findUnique({ where: { email } });
    const valid = user && (await bcrypt.compare(password, user.passwordHash));
    if (!user || !valid) return reply.code(401).send({ error: "E-mail ou senha incorretos" });

    setSession(reply, user.id);
    return { user: { id: user.id, name: user.name, email: user.email } };
  });

  app.post("/logout", async (_request, reply) => {
    reply.clearCookie(TOKEN_COOKIE, { path: "/" });
    return { ok: true };
  });

  app.get("/me", { preHandler: [app.authenticate] }, async (request) => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: currentUserId(request) },
      select: { id: true, name: true, email: true },
    });
    return { user };
  });
};
