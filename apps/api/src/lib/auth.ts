import type { FastifyRequest } from "fastify";

// Lê o id do usuário autenticado (definido pelo JWT em cookie httpOnly).
export function currentUserId(request: FastifyRequest): string {
  return (request.user as { sub: string }).sub;
}
