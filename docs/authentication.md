# Autenticação do MIND +

## Arquitetura

O servidor Better Auth self-managed roda em `apps/api` e usa o `PrismaClient` singleton exportado por `@mind-plus/database`. O endpoint Next.js fica em `/api/auth/[...all]`, com operações Better Auth sob `/api/auth/*`. Mobile e admin falam apenas com a API.

A configuração usa Better Auth `1.7.25`, adapter Prisma oficial `@better-auth/prisma-adapter` `1.7.25` e Prisma ORM `7.10.1`. O adapter foi validado contra Prisma 7. Better Auth 1.7.25 ainda não oferece suporte ao Prisma 8.

## Endpoints principais

- `POST /api/auth/sign-in/email`
- `POST /api/auth/sign-out`
- `GET /api/auth/get-session`
- `GET /api/auth/verify-email`

O endpoint de cadastro continua definido pelo Better Auth, mas a configuração usa `emailAndPassword.disableSignUp: true` e rejeita novos cadastros antes de gravar o usuário. Reenvio de verificação e recuperação/reset de senha são bloqueados no Route Handler com HTTP 410 (`EMAIL_FLOWS_ARCHIVED`). Links de verificação já emitidos ainda podem ser validados enquanto forem válidos.

Better Auth valida os payloads desses endpoints. Origens precisam estar em `BETTER_AUTH_TRUSTED_ORIGINS`; `mindplus://` é permitido para deep links do app e `exp://**` é adicionado somente em desenvolvimento.

O Route Handler permite CORS com credenciais somente para origens HTTP(S) exatas da URL e da allowlist configurada. Ele responde preflight `OPTIONS` para `GET` e `POST`; origens web não listadas recebem `403`. A origem customizada do app mobile continua validada pelo Better Auth e não recebe cabeçalhos CORS de navegador.

## Sessões dos clientes

- **Admin web:** usa cookies de sessão HttpOnly, SameSite Lax e Secure em HTTPS. O cliente Better Auth envia `credentials: include`; o navegador não recebe a chave de sessão via JavaScript.
- **Mobile Expo:** usa o plugin oficial `@better-auth/expo` com `expo-secure-store` para persistir o cookie/sessão de forma segura. Configure `EXPO_PUBLIC_API_URL` com um endereço da API alcançável pelo dispositivo; `localhost` só serve no mesmo host.
- Nenhum app cliente importa Prisma nem conecta ao PostgreSQL. Não copie `BETTER_AUTH_SECRET` para variáveis `NEXT_PUBLIC_*` ou `EXPO_PUBLIC_*`.

O cliente Expo oferece boas-vindas, login e uma tela autenticada básica com logout. Novos cadastros estão temporariamente indisponíveis e as telas de cadastro/reenvio não são apresentadas na navegação principal; a rota direta mostra um aviso. A sessão continua sendo restaurada antes de liberar as rotas pelo plugin oficial Better Auth Expo com SecureStore. O admin ainda não adiciona telas nem autorização administrativa. Não existe plugin `admin`, campo de role, nem política de permissões nesta etapa.

Para testar o mobile, configure `EXPO_PUBLIC_API_URL` com a origem da API alcançável pelo dispositivo (por exemplo, `http://10.0.2.2:3000` no emulador Android ou o IP LAN do computador em um dispositivo físico) e inicie `npm run dev:api` e `npm run dev:mobile` a partir da raiz. A variável é pública e não pode conter segredos. Os detalhes de configuração e testes estão em `apps/mobile/README.md`.

## E-mail transacional e verificação

A verificação continua obrigatória antes do login. O envio transacional está arquivado até que o MIND + tenha domínio próprio e remetente configurado. O módulo de e-mail em `apps/api/src/lib/email.ts` foi preservado para retomada, incluindo interface de transporte desacoplada, template HTML/texto, escaping, chave de idempotência e tratamento de erros sem registrar conteúdo sensível. A configuração padrão da API não carrega esse módulo nem exige `RESEND_API_KEY` ou `MIND_PLUS_EMAIL_FROM`; seus callbacks de envio são inertes.

Quando a integração for retomada, serão necessários domínio próprio verificado no Resend, remetente autorizado, `RESEND_API_KEY` armazenada somente no ambiente privado da API e `BETTER_AUTH_URL` HTTPS pública. Não use `EXPO_PUBLIC_*` para credenciais. Se uma chave Resend real apareceu legível em captura/conversa, revogue-a e gere outra; não reutilize a chave exposta. A configuração da conta Resend ou uma chamada de teste do dashboard não comprova entrega de e-mail do MIND +.

O Better Auth continua aceitando `GET /api/auth/verify-email` para links válidos emitidos anteriormente; não há novos envios durante o arquivamento. A rota de callback termina em `/verification-complete`, uma página web de fallback que não recebe nem exibe tokens. Para reativar e-mails, o domínio precisa ser publicamente acessível por HTTPS; um IP LAN não funciona fora da rede local. Em uma retomada, planeje Android App Links/iOS Universal Links para builds distribuídos e mantenha a página web como fallback.

As rotas `POST /api/auth/send-verification-email`, `POST /api/auth/request-password-reset` e `POST /api/auth/reset-password` retornam HTTP 410 enquanto o envio estiver arquivado. O app não oferece reenvio ou recuperação de senha. O rate limit Better Auth usa armazenamento em memória; antes de produção, configure armazenamento compartilhado e os IPs/proxies confiáveis da plataforma.

Os testes unitários cobrem login, sessão, logout, verificação e templates com adapter em memória e transporte simulado. A cobertura específica desta etapa confirma cadastro bloqueado sem criação de usuário, endpoints arquivados, inicialização sem credenciais Resend e indisponibilidade de cadastro/reenvio no mobile. Nenhum teste padrão chama Resend ou escreve no Neon. Os testes Neon opt-in foram atualizados para verificar rejeição e ausência de escrita; não acessarão production.

## Neon Auth vs. Better Auth

O Neon informa `Auth enabled` na branch `development`. Isso se refere ao serviço Neon Auth gerenciado, que mantém dados em `neon_auth`. A aplicação usa Better Auth self-managed, servido pela API, com tabelas `user`, `session`, `account` e `verification` no schema PostgreSQL público. Não há integração de sessão ou migração entre os dois serviços, e nenhuma configuração remota Neon foi alterada.

## Estado da migration

O schema foi gerado pelo CLI oficial Better Auth e revisado contra Prisma 7. A migration `20261115211836_add_better_auth` foi aplicada na branch Neon `development`. Ela cria somente:

1. `user` — identidade, nome, e-mail único, verificação e timestamps.
2. `session` — token único, expiração, IP/user-agent opcionais e relação com usuário (`ON DELETE CASCADE`).
3. `account` — provider/account ids, relação com usuário, campos opcionais para credenciais OAuth e senha hash; índice em `userId`.
4. `verification` — identificador, valor e validade; índice em `identifier`.

Constraints adicionais: primary keys nas quatro tabelas, `user.email` único e `session.token` único. As relações de sessão e conta para usuário usam cascade delete. Não são criadas tabelas de Neon Auth, conteúdo, pagamentos ou assinaturas.

O schema e a migration SQL versionada correspondem aos quatro modelos acima. A migration não deve ser reaplicada; futuras migrations continuam exigindo revisão do SQL, confirmação de `development` e autorização explícita antes de qualquer aplicação. Não usar `db push` como substituto. Nenhuma alteração foi autorizada ou aplicada em `production`.

## Limitações antes de produção

- A migration inicial está aplicada em `development`; validação de conectividade e estado não autoriza operações em `production`.
- Novos cadastros e fluxos de e-mail estão temporariamente suspensos. O login permanece ativo para contas previamente verificadas. A reativação exige domínio próprio, configuração de remetente, segredo Resend privado e testes completos de envio/recebimento/verificação em `development`; não basta configurar a chave.
- O rate limit está habilitado, mas seu armazenamento atual é em memória. Configure armazenamento compartilhado para múltiplas instâncias antes de produção.
- Defina a cadeia de proxies confiáveis da plataforma antes de depender de rate limiting por IP; não aceite `X-Forwarded-For` de clientes se o proxy não o sanitizar.
- Configure em produção `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` e uma allowlist `BETTER_AUTH_TRUSTED_ORIGINS` sem origens locais.
- A autenticação do admin e as permissões administrativas dependem de uma estratégia de roles/autorização posterior.
- O teste de persistência Neon é opt-in (`MIND_PLUS_RUN_NEON_AUTH_INTEGRATION=1 npm run test:integration --workspace @mind-plus/api`), confirma o alvo `development`, usa uma identidade sintética e limpa somente os registros gerados por ela. O comando padrão `npm test` não escreve no banco.
- A suíte HTTP real é opt-in e já foi executada com autorização contra Neon `development`. Ela inicia o build local da API com `next start` preso a `127.0.0.1` e porta efêmera; não inicia um deploy remoto. A execução padrão continua sem escrever no banco.
- A suíte HTTP opt-in agora verifica health, CORS, sessão anônima, cadastro recusado, ausência de usuário e bloqueio de reenvio/recuperação. Ela não cria registros e não requer limpeza; mesmo assim, mantém a proteção que confirma a branch `development` antes de consultar o banco.
- Antes de iniciar o servidor, ambas as suítes de banco exigem Windows, `.neon` apontando ao projeto e branch aprovados, `NEON_BRANCH=development` e hosts de `DATABASE_URL`/`DATABASE_URL_UNPOOLED` iguais aos retornados pelo Neon CLI para a branch `development`. Também recusam `NODE_ENV=production` e `VERCEL_ENV=production` no processo que inicia o teste. As connection strings são lidas em memória e nunca impressas.
- Para executar no PowerShell, depois de uma autorização específica para escrita em `development`:

  ```powershell
  npm run build --workspace @mind-plus/contracts
  npm run build --workspace @mind-plus/api
  $env:MIND_PLUS_RUN_NEON_AUTH_HTTP_INTEGRATION = "1"
  try { npm run test:integration:http --workspace @mind-plus/api }
  finally { Remove-Item Env:MIND_PLUS_RUN_NEON_AUTH_HTTP_INTEGRATION -ErrorAction SilentlyContinue }
  ```

- Não há rota privada de negócio nesta etapa. A suíte não cria rota fictícia nem testa acesso a recurso protegido; essa validação fica para quando existir uma rota real de autorização.
