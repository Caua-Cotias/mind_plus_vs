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

## Catálogo público e conta

- A rota inicial `/` consulta `GET /api/catalog/categories` e `GET /api/catalog/series` sem exigir sessão Better Auth.
- A rota `/series` permite buscar pelo título, filtrar por categoria e paginar os resultados com os metadados recebidos da API.
- A rota `/series/[slug]` consulta os detalhes e as temporadas públicas em `GET /api/catalog/series/{slug}` e `GET /api/catalog/series/{slug}/seasons`.
- A rota `/series/[slug]/seasons/[seasonNumber]` consulta episódios publicados em `GET /api/catalog/series/{slug}/seasons/{seasonNumber}/episodes`, preservando a ordem enviada pela API e a paginação.
- As rotas de detalhes e temporadas são públicas e ficam fora do grupo autenticado. Cards de série e temporada abrem esses caminhos; voltar retorna à tela anterior e preserva os filtros da listagem.
- Categorias e séries são apresentadas somente quando a API as retorna. Sem capas cadastradas, a interface mostra um marcador de imagem indisponível; não cria pôsteres, títulos, avaliações ou métricas de exemplo.
- Detalhes mostram sinopse, descrição complementar expansível, categorias, classificação etária quando informada e temporadas. Imagens usam somente URLs HTTP/HTTPS públicas; URLs inválidas ou falhas de carregamento recebem placeholder.
- Episódios mostram miniatura pública quando disponível, título, descrição, duração e nível `FREE` ou `PREMIUM`. O rótulo premium é informativo: não existe player, compra, assinatura ou desbloqueio no aplicativo.
- Loading, falha de conexão, resposta inválida, retry e catálogo vazio têm estados separados.
- O catálogo envia requisições públicas sem cookies de sessão. A autenticação usa seu cliente Better Auth e SecureStore existentes.
- A rota autenticada `/home` restaura e verifica a sessão ao entrar na área da conta. A Home pública não espera por essa requisição e continua acessível se a sessão não puder ser confirmada.
- A área autenticada mantém exibição básica da conta e logout. `/login` continua disponível; novos cadastros estão temporariamente indisponíveis.

## Design system e componentes

Os tokens centralizados estão em `src/constants/theme.ts`: cores cinematográficas escuras, violeta e ciano, tipografia, espaçamento, arredondamentos, interação, loading e erro. O app usa UniWind 1.x com Tailwind CSS 4 para o piloto de estilos utilitários, o botão local baseado no core copy-paste do gluestack-ui v5 e `expo-linear-gradient` para a transição da imagem de destaque. Outros layouts permanecem com `StyleSheet` do React Native; a integração ainda não reformula as telas de autenticação.

O CLI do gluestack não é usado no Windows: a documentação atual recomenda configuração manual nesse ambiente. A integração UniWind foi limitada a `apps/mobile`; não deve ser importada pelo admin Next.js.

Componentes iniciais: `SeriesCard`, `FeaturedSeriesCard`, `CategoryChip`, `SectionHeader`, `EmptyState`, `ErrorState`, `LoadingSkeleton` e `PremiumBadge`.

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
npx expo export --platform android
npx expo export --platform ios
```

Os testes do mobile incluem fluxos de autenticação, cliente HTTP do catálogo com fetch simulado, schemas de detalhe/temporada/episódio, respostas 404, rejeição de campos internos, rotas públicas sem dependência de Better Auth e renderização das telas/componentes no preset de teste do Expo. Eles não iniciam o servidor Next.js e não acessam Neon. Testes HTTP com banco real continuam opt-in, usam somente Neon `development` e exigem autorização explícita separada.

As exportações Android/iOS verificam o bundle do Expo para as plataformas; não substituem uma execução visual em aparelho. Não havia emulador ou dispositivo conectado ao ambiente Codex durante a validação.

## Testar em celular com Expo Go

1. Configure `EXPO_PUBLIC_API_URL` em `apps/mobile/.env.local` com o endereço LAN do computador, por exemplo `http://192.168.1.20:3000`. A variável contém somente a URL pública da API, nunca credenciais.
2. No primeiro terminal, na raiz do monorepo, execute `npm run dev:api`.
3. No segundo terminal, execute `npm run dev:mobile` e escaneie o QR Code com Expo Go. Mantenha celular e computador na mesma rede Wi-Fi e permita a porta 3000 no firewall local.
4. A Home deve abrir o catálogo sem login. Com séries publicadas, abra um card para conferir detalhes e temporadas; escolha uma temporada para ver episódios e rótulos de acesso. Sem conteúdo publicado, as telas exibem estados vazios reais. Teste busca e erros de rede/retry desligando temporariamente a API local, se necessário.
5. “Acessar conta” leva à área protegida. O login continua limitado a contas previamente verificadas; o catálogo público não altera a sessão existente.

Depois de alterar `.env.local`, reinicie o servidor Expo para carregar a URL nova.

## Próximas etapas

Etapa 12B pode implementar os detalhes públicos de série, temporadas e lista de episódios usando as rotas existentes, sem player ou reprodução. Antes de conectar o painel administrativo, defina os fluxos de e-mail, política de sessão web/cookies e autorização de administradores no backend. O admin deverá consumir somente a API central; não deve acessar Prisma ou Neon diretamente.
