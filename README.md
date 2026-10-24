# financecave

Sistema de planejamento financeiro de gastos: categorias, lançamentos de receitas e despesas, orçamento mensal por categoria e painel com planejado versus gasto.

## Stack

- **Front:** React + Vite + TypeScript (`apps/web`)
- **API:** Fastify + TypeScript + Prisma (`apps/api`)
- **Compartilhado:** Zod, schemas usados pelo front e pelo back (`packages/shared`)
- **Banco:** PostgreSQL
- **Auth:** e-mail e senha (bcrypt), sessão em cookie httpOnly com JWT
- **Deploy:** Vercel (front estático + função serverless em `api/[...path].ts`)

## Rodando localmente

Pré-requisitos: Node 20+, pnpm 9 e um PostgreSQL acessível.

```bash
pnpm install
cp apps/api/.env.example apps/api/.env   # ajuste DATABASE_URL e JWT_SECRET
pnpm --filter @financecave/api db:migrate
pnpm dev
```

- Front: http://localhost:5173
- API: http://localhost:3333 (o Vite encaminha `/api` para ela)

## Variáveis de ambiente

| Variável       | Onde | Descrição                                    |
| -------------- | ---- | -------------------------------------------- |
| `DATABASE_URL` | API  | Conexão PostgreSQL (ex.: Neon ou Supabase)   |
| `JWT_SECRET`   | API  | Segredo para assinar a sessão (string longa) |

Na Vercel, cadastre as duas em Project Settings → Environment Variables.

## Deploy na Vercel

1. Importe o repositório na Vercel. A raiz do projeto é a raiz do repo; o `vercel.json` já define build e output.
2. Cadastre `DATABASE_URL` e `JWT_SECRET`.
3. Rode as migrações contra o banco de produção: `pnpm --filter @financecave/api db:deploy`.
