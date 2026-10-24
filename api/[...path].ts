import type { IncomingMessage, ServerResponse } from "node:http";
import { buildApp } from "../apps/api/src/app.js";

// Entrada serverless da Vercel: todas as rotas /api/* caem aqui.
// A instância do Fastify é reutilizada entre invocações "quentes".
let appPromise: ReturnType<typeof buildApp> | undefined;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  appPromise ??= buildApp().then(async (app) => {
    await app.ready();
    return app;
  });
  const app = await appPromise;
  app.server.emit("request", req, res);
}
