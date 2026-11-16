# MIND + mobile

Aplicativo Expo/React Native para iOS e Android. A autenticação usa a API central do MIND + (Better Auth) e o plugin oficial `@better-auth/expo`, que persiste o cookie de sessão no `expo-secure-store`. Senhas não são persistidas pelo aplicativo.

## Configurar a URL da API

Inicie a API em outro terminal a partir da raiz do monorepo:

```powershell
npm run dev:api
```

O app usa `EXPO_PUBLIC_API_URL` como origem HTTP da API e acrescenta `/api/auth` para o Better Auth. Essa variável é pública e entra no bundle, portanto nunca coloque segredos nela.

Sem variável explícita, os fallbacks de desenvolvimento são:

- Emulador Android: `http://10.0.2.2:3000`.
- Simulador iOS e web local: `http://localhost:3000`.
- Expo Go em dispositivo físico: host LAN anunciado pelo servidor Expo, porta `3000`.
- Development build em dispositivo físico: configure a origem LAN explicitamente.

Para um endereço específico, crie `apps/mobile/.env.local` (arquivo local ignorado pelo Git) com uma linha como:

```dotenv
EXPO_PUBLIC_API_URL=http://192.168.1.20:3000
```

Substitua o IP pelo endereço LAN do computador que executa a API. Computador e dispositivo devem estar na mesma rede, e o firewall do Windows deve permitir conexões locais à porta 3000. Reinicie o Expo depois de alterar a variável.

## Fluxos disponíveis

- Boas-vindas e login por e-mail e senha.
- A sessão é restaurada pelo Better Auth antes de liberar as rotas públicas ou autenticadas.
- Rotas públicas e autenticadas são protegidas com Expo Router.
- A tela autenticada mostra apenas o nome/e-mail da conta e permite sair.
- Novos cadastros estão temporariamente indisponíveis; a rota direta apresenta uma mensagem e volta ao login.

## Verificação de e-mail

O login de contas existentes continua exigindo verificação obrigatória. Novos cadastros e reenvios estão suspensos; a tela de verificação pendente informa que o e-mail transacional está arquivado e oferece retorno ao login.

O transporte Resend e seu template permanecem preservados no servidor para retomada, mas não são carregados pela configuração normal e nenhum e-mail é enviado. A retomada exige domínio próprio verificado, remetente autorizado, `RESEND_API_KEY` privada e `BETTER_AUTH_URL` HTTPS pública. Nunca exponha essas configurações em variáveis `EXPO_PUBLIC_*`. Se uma chave real foi exposta em captura/conversa, revogue-a e gere uma nova antes de reutilizar o serviço.

Links de verificação válidos já emitidos ainda são tratados por `/verification-complete`; não são gerados novos e-mails durante o arquivamento. Um endereço `localhost` ou IP LAN não é apropriado para links abertos fora da rede. Para retomada do fluxo instalado, configure domínio HTTPS e Android App Links/iOS Universal Links.

O app não marca contas como verificadas localmente e o login continua sujeito à resposta da API. Reenvio e recuperação de senha estão indisponíveis. Os testes usam adapter em memória e transporte simulado; não enviam mensagens nem escrevem no Neon.

## Testes e verificações

```powershell
npm test
npm run lint --workspace @mind-plus/mobile
npm run typecheck --workspace @mind-plus/mobile
```

Os testes do mobile validam formulários e fluxos de autenticação através de um gateway simulado. Eles não iniciam o servidor Next.js e não acessam Neon. Testes HTTP com banco real continuam opt-in, usam somente Neon `development` e exigem autorização explícita separada.

## Próximas etapas

Antes de conectar o painel administrativo, defina os fluxos de e-mail, política de sessão web/cookies e autorização de administradores no backend. O admin deverá consumir somente a API central; não deve acessar Prisma ou Neon diretamente.
