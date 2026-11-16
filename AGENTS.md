# Instruções de trabalho para o Codex

## Contexto e fontes do projeto

- Leia integralmente `CLAUDE.md` antes de iniciar uma tarefa: ele descreve o produto, a arquitetura desejada, os requisitos de segurança e o roadmap.
- Consulte `CODEX.md` para o fluxo de trabalho do agente e `README.md` para os comandos de entrada.
- Examine o estado atual do repositório e os `AGENTS.md` mais próximos dos arquivos que pretende alterar. Instruções locais complementam este arquivo.
- Trate o código existente como fonte da verdade para o que já foi implementado. Não apresente itens planejados como funcionalidades existentes.

## Arquitetura

### Workspaces atuais

- `apps/mobile`: aplicativo iOS e Android com React Native, Expo SDK 58, Expo Router e TypeScript.
- `apps/admin`: aplicação administrativa independente com Next.js App Router e TypeScript.
- `apps/api`: API central Next.js App Router; possui health check, Better Auth self-managed e ponto de importação do pacote database.
- `packages/contracts`: pacote compartilhado implementado com Zod e TypeScript.
- `packages/database`: Prisma ORM 7 + adapter Neon + PostgreSQL; schema e migration inicial de Better Auth versionados localmente.
- `packages/config`: pacote planejado, ainda não implementado.

### Arquitetura planejada

- `apps/api`: expansão do backend central com regras de negócio, autenticação e API REST.
- `packages/database`: evolução do schema, migrações e configuração PostgreSQL/Neon em etapas aprovadas.
- `packages/config`: configurações comuns de desenvolvimento.

O pacote database centraliza o schema e o Prisma Client. A migration `20261115211836_add_better_auth` foi aplicada à branch Neon `development`; ela cria somente `user`, `session`, `account` e `verification`. A branch `production` não foi alterada nem está autorizada para operações nesta etapa. Regras de negócio além da autenticação e as demais entidades planejadas só devem ser criadas quando autorizadas. A API será a autoridade para regras de negócio, identidade, permissões e acesso a conteúdo. Mobile e admin devem consumi-la por HTTP; não duplique regras de negócio nos clientes nem importe banco ou código de servidor para mobile/admin.

### Acesso ao banco

- `DATABASE_URL` é a conexão pooled para uso pelo Prisma Client em runtime.
- `DATABASE_URL_UNPOOLED` é direta e deve ser usada pelo Prisma CLI para validação/introspecção e operações administrativas futuras.
- O `.env.local` único fica na raiz, é ignorado pelo Git e é carregado pela API e pelo Prisma config sem cópia para os workspaces.
- Importe `@mind-plus/database` somente em código servidor da API. Não exponha o pacote ao mobile ou ao admin.
- A versão atual do Prisma ORM, Client e Neon adapter é fixada em `7.10.1`; não misture instruções/configuração de outras versões.
- Better Auth, `@better-auth/prisma-adapter` e `@better-auth/expo` estão fixados em `1.7.25`; mantenha o Prisma 7 até a compatibilidade do adapter com versões futuras ser confirmada.
- Better Auth self-managed é servido em `apps/api` e usa as tabelas no schema público; não o confunda com Neon Auth gerenciado no schema `neon_auth`.
- O segredo `BETTER_AUTH_SECRET` existe somente no `.env.local` ignorado. Nunca o copie para apps clients, logs ou arquivos versionáveis.
- O cadastro está temporariamente desabilitado no servidor por `emailAndPassword.disableSignUp: true`; login por e-mail/senha permanece habilitado e exige verificação (`requireEmailVerification: true`). A configuração padrão não carrega o módulo Resend nem depende de `RESEND_API_KEY` ou `MIND_PLUS_EMAIL_FROM`.
- O envio transacional está arquivado. A integração e o módulo Resend são preservados para retomada, mas a API bloqueia reenvio de verificação e recuperação/reset de senha com HTTP 410. Nenhum e-mail externo deve ser enviado nesta fase. Nunca exponha variáveis privadas via `EXPO_PUBLIC_*`.
- As telas principais mobile não oferecem cadastro nem reenvio. A rota direta de cadastro informa a indisponibilidade; componentes são preservados para retomada. Login, restauração via SecureStore e logout continuam disponíveis.
- O rate limit atual usa armazenamento em memória; antes de produção, defina armazenamento compartilhado e configure os IPs/proxies confiáveis da plataforma.
- Não aplique migrations, `db push`, nem alterações remotas sem revisão prévia do schema e autorização explícita para a migration específica. A migration inicial de autenticação já foi aplicada somente em `development`; isso não autoriza operações adicionais nem qualquer alteração em `production`.

## Mudanças e planejamento

- Faça alterações pequenas, relacionadas ao pedido e fáceis de revisar. Não implemente módulos não solicitados nem avance automaticamente para a próxima etapa do roadmap.
- Antes de uma mudança arquitetural ou estrutural importante, apresente o problema, as opções e um plano concreto e aguarde aprovação.
- Não crie `apps/api`, Prisma, autenticação, pagamentos ou player sem autorização explícita para essa etapa.
- Não altere versões de Expo, React Native, React, Next.js, TypeScript ou outras dependências sem justificar compatibilidade e obter aprovação quando a mudança for significativa.
- Não instale dependências sem necessidade. Use npm a partir da raiz do monorepo; mantenha um único `package-lock.json` na raiz e não crie lockfiles nos workspaces.
- Preserve funcionalidades existentes. Não apague arquivos, artefatos do usuário ou configurações sem autorização ou necessidade clara aprovada.

## Ferramentas e documentação de frameworks

- Antes de alterar Expo, React Native ou EAS, confira a versão instalada no manifest do mobile e consulte a documentação correspondente a esse SDK. Não escolha APIs com base apenas na memória ou na documentação `latest`.
- Instale dependências Expo apenas quando aprovadas e usando a ferramenta de instalação recomendada para o SDK do projeto. Não execute comandos que baixem ferramentas via `npx` durante uma auditoria de validação sem confirmar que já estão disponíveis.
- Antes de alterar APIs ou convenções Next.js, leia o guia relevante em `node_modules/next/dist/docs/` (ou no `node_modules` do app, se aplicável) para a versão instalada.
- `apps/mobile` usa Expo Router: rotas ficam em `src/app/`; componentes, hooks e utilitários ficam fora dessa pasta. Preserve o Continuous Native Generation e configure recursos nativos por `app.json` ou config plugins; não crie `ios/` ou `android/` manualmente.
- Não edite arquivos gerados como `.next/`, `next-env.d.ts`, `expo-env.d.ts` ou artefatos de build para corrigir código-fonte.

## Comandos existentes

Execute os comandos a partir da raiz, depois de confirmar que as dependências já estão instaladas:

```sh
npm run dev:mobile
npm run dev:admin
npm run dev:api
npm run generate --workspace @mind-plus/database
npm run validate --workspace @mind-plus/database
npm run typecheck --workspace @mind-plus/database
npm run lint --workspace @mind-plus/database
npm run build --workspace @mind-plus/database
npm run lint
npm run typecheck
npm run build
npm test
```

- `dev:mobile` inicia o Expo; `dev:admin` inicia o Next.js administrativo na porta 3001; `dev:api` inicia a API na porta 3000.
- `lint` executa os scripts de lint declarados pelos workspaces.
- `typecheck` compila contratos e gera o Prisma Client antes de verificar os workspaces; executa `next typegen` e `tsc --noEmit` nos apps Next e `tsc --noEmit` no mobile.
- `build` compila contratos, gera/compila o Prisma Client e executa os builds de produção dos apps Next.
- `test` executa os testes de contratos, Better Auth em memória e o fluxo mobile. Os testes Neon são opt-in e ficam ignorados por padrão; verificam que as tentativas de cadastro são rejeitadas sem escrita.
- Para executar explicitamente um teste integrado que escreve em `development`, defina a flag no PowerShell e remova-a ao terminar:

  ```powershell
  $env:MIND_PLUS_RUN_NEON_AUTH_INTEGRATION = "1"
  try { npm run test:integration --workspace @mind-plus/api }
  finally { Remove-Item Env:MIND_PLUS_RUN_NEON_AUTH_INTEGRATION -ErrorAction SilentlyContinue }
  ```

  O teste verifica projeto/branch e hosts das duas conexões antes de escrever, usa identidade sintética e remove somente os registros identificados por ela. Exige autorização específica.
- A suíte HTTP real também exige autorização explícita. Construa contratos e API e rode:

  ```powershell
  npm run build --workspace @mind-plus/contracts
  npm run build --workspace @mind-plus/api
  $env:MIND_PLUS_RUN_NEON_AUTH_HTTP_INTEGRATION = "1"
  try { npm run test:integration:http --workspace @mind-plus/api }
  finally { Remove-Item Env:MIND_PLUS_RUN_NEON_AUTH_HTTP_INTEGRATION -ErrorAction SilentlyContinue }
  ```

  Ela inicia `next start` em `127.0.0.1` e porta efêmera, confirma branch/endpoints antes de iniciar e limpa somente o usuário sintético e suas dependências. O comando padrão `npm test` mantém ambas as suítes Neon ignoradas.

Execute validações pertinentes ao escopo alterado. Não instale ferramentas apenas para fazer uma verificação opcional. Informe checks executados, resultados e limitações.

## Segurança

- Nunca exponha, copie para logs ou versione segredos, tokens, chaves privadas, credenciais, certificados ou valores reais de arquivos `.env`.
- Se uma credencial aparecer legível em uma captura ou conversa, trate-a como comprometida: não a use, revogue-a no provedor e configure uma chave nova, privada e de menor privilégio.
- O `.env.local` e `.neon` da raiz são configurações locais ignoradas pelo Git. Não os force para o índice; nunca replique suas credenciais em arquivos dos workspaces ou em documentação.
- Variáveis `EXPO_PUBLIC_*` são públicas e podem ser incluídas no bundle mobile; nunca coloque segredos nelas.
- Valide entradas no servidor. A autorização de admin, assinaturas e conteúdo premium deve ser feita no backend, não confiada ao estado do cliente.
- Proteja mídia privada com URLs assinadas ou mecanismo equivalente. Valide webhooks e não confie em estado de pagamento enviado pelo cliente.
- Não enfraqueça CORS, autenticação, permissões, validação, CSP ou controles de acesso para contornar erros de desenvolvimento.
- O `.gitignore` atual ignora padrões `.env*`, inclusive `.env.example`; se um exemplo sem segredos precisar ser versionado, revise a regra de exclusão explicitamente antes de adicioná-lo.

## Estado atual de autenticação e limites conhecidos

- Better Auth `1.7.25` e Prisma `7.10.1` estão integrados e validados; as quatro tabelas de autenticação existem em Neon `development` por meio da migration versionada.
- Login de contas previamente verificadas, restauração de sessão e logout permanecem operacionais. Novos cadastros estão temporariamente suspensos por `disableSignUp: true`; a verificação continua obrigatória.
- E-mails transacionais estão arquivados. A configuração normal da API não carrega Resend nem requer credenciais; reenvio e recuperação/reset de senha retornam HTTP 410. Nenhum e-mail é enviado. O módulo e os componentes de cadastro permanecem para retomada.
- O rate limiting configurado usa armazenamento em memória. Antes de produção, configure armazenamento compartilhado e a cadeia de proxies/IPs confiáveis da plataforma.
- Existem testes Neon opt-in: um chama `auth.handler` diretamente e outro percorre o Route Handler através de um servidor Next.js real. Eles verificam health, CORS e rejeição de cadastro sem criar usuário; a suíte HTTP também confirma o bloqueio dos fluxos de e-mail. Os testes não alteram dados nem enviam e-mail.
- Não existe endpoint privado de negócio nesta etapa, portanto a suíte ainda não testa autorização de recursos protegidos. Essa cobertura depende de uma rota privada real em etapa futura.
- Não foi feita nem está autorizada alteração em Neon `production`.

## Qualidade e revisão

- Use TypeScript estrito e siga as convenções já existentes em cada app.
- Prefira contratos e schemas explícitos nas fronteiras HTTP; mantenha código específico de navegador, servidor e React Native nos respectivos ambientes.
- Evite dependências duplicadas, imports de implementação entre apps e lógica sensível em componentes de apresentação.
- Ao concluir, revise as alterações para remover mudanças incidentais e artefatos gerados. Informe os arquivos modificados, dependências adicionadas (se houver), validações e problemas restantes.
- Preserve a staging area e alterações preexistentes. Não execute `git add`, `git commit`, `git reset`, `git clean`, rebase ou comandos destrutivos sem pedido explícito do usuário. Nunca faça commits automaticamente.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
