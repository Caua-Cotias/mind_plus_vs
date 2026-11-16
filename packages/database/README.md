# @mind-plus/database

Camada central de persistência do MIND + com Prisma ORM 7 e PostgreSQL no Neon.
Somente código de servidor (atualmente `apps/api`) deve importar este pacote.
Mobile e admin acessam dados exclusivamente pela API HTTP.

## Ambiente

O pacote carrega `DATABASE_URL_UNPOOLED` da raiz do monorepo (`.env.local`, ignorado pelo Git) para comandos do Prisma CLI. A API carrega o mesmo arquivo por meio de `@next/env`. Nenhuma credencial é copiada para dentro dos workspaces.

- `DATABASE_URL`: conexão Neon pooled, usada pelo Prisma Client no runtime.
- `DATABASE_URL_UNPOOLED`: conexão direta, usada pela configuração do Prisma CLI para validação e futuras operações administrativas/migrations.

## Comandos

Execute da raiz do monorepo:

```sh
npm run generate --workspace @mind-plus/database
npm run validate --workspace @mind-plus/database
npm run typecheck --workspace @mind-plus/database
npm run lint --workspace @mind-plus/database
npm run build --workspace @mind-plus/database
```

`dev` observa alterações no schema e regenera o Client. O pacote não aplica migrations automaticamente. As migrations `20261115211836_add_better_auth` e `20261116191648_add_catalog` estão aplicadas somente na branch Neon `development`; não há migrations pendentes. A branch `production` não foi alterada.

## Importação

```ts
import { prisma } from "@mind-plus/database";
```

O pacote mantém uma instância global em desenvolvimento para evitar clientes duplicados durante hot reload. Em produção, o runtime da API deve manter a instância no escopo do processo.

## Schema e migrations

O schema local contém os modelos técnicos de autenticação `User`, `Session`, `Account` e `Verification`, além dos modelos de catálogo `Series`, `Season`, `Episode`, `Category`, `SeriesCategory` e `MediaAsset`. Datas de catálogo usam `Timestamptz(3)`; IDs dos modelos de catálogo são UUID v4 gerados pelo Prisma Client. A migration Better Auth cria somente `user`, `session`, `account` e `verification`. A migration do catálogo está em `prisma/migrations/20261116191648_add_catalog/migration.sql`. As duas migrations foram aplicadas em Neon `development` e verificadas como aplicadas, sem migration pendente.

O SQL preliminar de criação do catálogo fica em `docs/catalog-schema-review.sql`, fora de `prisma/migrations`, como artefato de revisão. A migration oficial foi gerada por comparação entre arquivos de schema locais e inclui explicitamente as sete constraints `CHECK` manuais. Prisma 7.10.1 não representa essas constraints no `schema.prisma`; elas precisam ser preservadas no SQL versionado e consideradas em revisões futuras de drift. Em 16/11/2026, a estrutura foi conferida em Neon `development`: seis tabelas de catálogo, quatro enums, quinze índices explícitos, oito FKs com `ON DELETE RESTRICT` e as sete CHECKs. O diff Prisma não identificou diferenças nas estruturas representadas pelo schema. Não foi acessada nem alterada a branch `production`.

As regras de integridade cobertas pelos `CHECK` devem também ser validadas nos serviços. A compatibilidade entre `MediaAsset.kind`, `processingStatus` e o tipo de referência é uma regra entre registros e continuará sob responsabilidade da camada de domínio; não foi criada trigger.

Para novas alterações, revise primeiro o schema e o SQL gerado; confirme que a conexão aponta para `development` e obtenha autorização explícita antes de criar/aplicar qualquer migration remota. Nunca aponte operações de desenvolvimento para `production`. A branch `production` não foi alterada nem está autorizada por esta configuração.
