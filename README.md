# MIND +

Monorepo com npm workspaces para o aplicativo mobile, o painel administrativo, a API e os pacotes compartilhados.

## Aplicações

- `apps/mobile`: aplicativo iOS e Android com Expo.
- `apps/admin`: painel administrativo Next.js.
- `apps/api`: API central Next.js com Route Handlers, endpoint health e Better Auth centralizado.
- `packages/contracts`: schemas Zod e tipos compartilhados.
- `packages/database`: camada de persistência Prisma 7 + PostgreSQL Neon, consumida somente pela API.

Mobile e admin consomem a API central por HTTP e não acessam o banco diretamente. O pacote database centraliza schema, migrations e Prisma Client para uso somente no servidor. A migration Better Auth `20261115211836_add_better_auth` está aplicada na branch Neon `development` e criou as tabelas `user`, `session`, `account` e `verification`. Nenhuma alteração foi autorizada ou aplicada em `production`.

## Banco de dados local

O workspace `@mind-plus/database` carrega as variáveis PostgreSQL do `.env.local` ignorado na raiz. `DATABASE_URL` é a conexão pooled usada pelo Prisma Client no runtime; `DATABASE_URL_UNPOOLED` é a conexão direta reservada ao Prisma CLI e a operações administrativas futuras. Não copie esses valores para os diretórios dos aplicativos.

```sh
npm run generate --workspace @mind-plus/database
npm run validate --workspace @mind-plus/database
npm run typecheck --workspace @mind-plus/database
npm run lint --workspace @mind-plus/database
npm run build --workspace @mind-plus/database
```

O comando `npm run dev:api` compila contratos e database antes de iniciar a API.

## Autenticação

Better Auth atende em `http://localhost:3000/api/auth`. O login, logout e restauração de sessão permanecem operacionais para contas já verificadas; novos cadastros estão temporariamente suspensos (`disableSignUp: true`). A verificação continua obrigatória. E-mails transacionais estão arquivados: a configuração normal da API não carrega Resend nem exige credenciais, e as rotas de reenvio e recuperação/reset de senha retornam HTTP 410. O módulo Resend é preservado para retomada após configurar domínio e remetente e validar o fluxo completo. Veja [`docs/authentication.md`](docs/authentication.md) para detalhes de sessão, SecureStore e limitações.

## Catálogo mobile

A Home pública do mobile consulta as rotas públicas de categorias e séries da API e não exige sessão. `/series` oferece busca por título e filtro por categoria; `/series/[slug]` apresenta detalhes e temporadas publicadas; `/series/[slug]/seasons/[seasonNumber]` lista episódios publicados. A rota autenticada `/home` mantém a verificação de sessão Better Auth. Todas as telas usam dados da API, mostram estados de erro e ausência de conteúdo e não implementam reprodução ou desbloqueio premium. O catálogo atual pode estar vazio. A configuração visual e o roteiro de teste em Expo Go estão descritos em [`apps/mobile/README.md`](apps/mobile/README.md).

## Desenvolvimento

Instale as dependências a partir da raiz:

```sh
npm install
```

Execute cada app a partir da raiz:

```sh
npm run dev:mobile
npm run dev:admin
npm run dev:api
npm run lint
npm run typecheck
npm run build
npm test
```

O admin roda na porta `3001`; a API roda em `http://localhost:3000`. O endpoint inicial de saúde é `GET http://localhost:3000/api/health`.

Os comandos gerais executam os scripts declarados pelos workspaces. `npm run typecheck` verifica contratos e aplicações; `npm run build` compila os contratos e gera os builds Next.js. `npm test` executa os testes de contratos, API em memória e fluxo mobile. Os testes Neon são separados, opt-in e verificam que o cadastro é bloqueado sem escrever no banco; veja `AGENTS.md` antes de executá-los.
