# @mind-plus/contracts

Contratos Zod e tipos públicos compartilhados entre `apps/mobile`, `apps/admin` e, futuramente, `apps/api`. O pacote contém apenas validação e tipos: não importa React, Expo, Next.js ou Prisma.

## Instalação no monorepo

Os apps atuais declaram o workspace `@mind-plus/contracts` como dependência. Para compilar o pacote isoladamente:

```sh
npm run build --workspace @mind-plus/contracts
```

Os comandos raiz `npm run build`, `npm run typecheck` e `npm test` incluem o pacote. Os arquivos compilados são gerados em `build/` e não devem ser editados manualmente.

## Importar e validar

Use o export de entrada para importar schemas e tipos:

```ts
import {
  apiErrorResponseSchema,
  createApiResponseSchema,
  paginationParamsSchema,
  publicUserSchema,
  type ApiResponseOf,
  type PublicUser,
} from '@mind-plus/contracts';

const publicUser: PublicUser = publicUserSchema.parse(untrustedUser);
const paging = paginationParamsSchema.parse({ page: '2', pageSize: '25' });

const userResponseSchema = createApiResponseSchema(publicUserSchema);
const response: ApiResponseOf<PublicUser> = userResponseSchema.parse(untrustedResponse);
const error = apiErrorResponseSchema.safeParse(untrustedError);
```

`parse` retorna o valor validado ou lança um `ZodError`. `safeParse` retorna uma união discriminada com `success` e `data` ou `error`, apropriada para tratar entradas inválidas sem exceção.

Também existem exports públicos por schema, por exemplo:

```ts
import { healthCheckSchema } from '@mind-plus/contracts/health-check';
import { paginationMetaSchema } from '@mind-plus/contracts/pagination';
```

## Tipos inferidos

Os tipos públicos são derivados de seus schemas com `z.infer`, como `PublicUser`, `HealthCheck`, `ApiError` e `PaginationParams`. Para uma resposta com payload específico, use `ApiResponseOf<T>` ou infira diretamente do schema criado:

```ts
type UserResponse = ApiResponseOf<PublicUser>;
// Alternativa: type UserResponse = z.infer<typeof userResponseSchema>;
```

## Adicionar contratos

1. Crie um módulo coeso em `src/schemas/`.
2. Exporte o schema e os tipos derivados com `z.infer`.
3. Reexporte explicitamente no `src/index.ts`.
4. Se o contrato precisar de importação modular, adicione seu subpath em `package.json`.
5. Adicione testes válidos e inválidos em `test/` e execute `npm test`.
6. Execute `npm run typecheck`, `npm run lint` e `npm run build` na raiz.

Não coloque regras de negócio, acesso ao banco ou dependências específicas de uma aplicação neste pacote.
