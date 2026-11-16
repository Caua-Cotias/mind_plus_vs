# MIND + — Arquitetura do catálogo

**Estado:** contratos Zod, modelos Prisma, SQL preliminar e migration oficial do catálogo foram preparados localmente. A migration `20261116191648_add_catalog` ainda não foi aplicada a nenhum banco. API de catálogo e telas continuam fora do escopo.

Este documento combina requisitos presentes em `CLAUDE.md` e no PDF de especificação do produto com decisões aprovadas posteriormente. Ele é uma proposta técnica para a próxima etapa de persistência e leitura do catálogo; não autoriza mudanças no banco.

## 1. Base arquitetural e escopo

O monorepo contém `apps/mobile` (Expo Router), `apps/admin` (Next.js), `apps/api` (Next.js Route Handlers), `packages/contracts` (TypeScript + Zod) e `packages/database` (Prisma 7). Apenas a API pode acessar o pacote database. Mobile e admin consomem a API por HTTP.

A especificação do produto descreve uma experiência mobile de séries episódicas curtas, com home, destaque, listagem, categorias, busca, temporadas e episódios. Também cita popularidade, continuar assistindo, banners, assinaturas e player, mas essas capacidades dependem de decisões, modelos ou infraestrutura posteriores e não fazem parte do catálogo inicial.

O schema local inclui os modelos Prisma do catálogo. O [SQL preliminar de revisão](catalog-schema-review.sql) permanece como artefato comparativo; a migration oficial correspondente está em `packages/database/prisma/migrations/20261116191648_add_catalog/migration.sql`. Ela foi gerada offline comparando arquivos de schema locais e incorporou as sete constraints `CHECK` manuais. A migration ainda não foi aplicada. Não cria endpoints, dados demonstrativos ou telas.

## 2. Requisitos e decisões aprovadas

### Requisitos identificados na especificação

- Catálogo organizado em séries, temporadas e episódios.
- Séries possuem título, sinopse/descrição, pôster, imagem de destaque, classificação etária, categorias/gêneros e estado editorial.
- Episódios possuem número, título, descrição, thumbnail, duração, referência de vídeo, estado editorial e classificação de acesso.
- A home visual prevê destaque e cards de séries. Os exemplos visuais de conteúdo são referências, não dados reais para semear.
- A documentação lista `Series`, `Season`, `Episode`, `Category`, `SeriesCategory`, `MediaAsset` e `WatchProgress` como entidades planejadas.

### Decisões de produto para esta fase

1. Leitura de metadados publicados é pública e não exige login.
2. `Category` é a taxonomia inicial única, usada onde o produto chama o conceito de categoria ou gênero.
3. `Series` e `Episode` têm os estados `DRAFT`, `PUBLISHED` e `ARCHIVED`. Temporadas não têm status próprio.
4. A visibilidade da temporada deriva da série publicada e de seus episódios publicados.
5. Metadados de episódios `FREE` e `PREMIUM` podem aparecer publicamente. Isso não concede acesso à reprodução.
6. `synopsis` é a apresentação principal e obrigatória; `description` é complementar e opcional.
7. `MediaAsset` distingue `IMAGE` e `VIDEO`; o serviço valida que o uso referenciado é compatível com o tipo.
8. `publishedAt` registra a publicação efetiva. Não há agendamento nesta versão.
9. Valores definitivos de classificação etária não serão inventados. O campo permanece string opcional até decisão de produto/jurisdição.
10. Não implementar nesta fase agendamento, popularidade, progresso, assinatura, pagamentos, upload ou player.
11. `featuredOrder` é uma prioridade editorial opcional; valores nulos ficam por último. Desempates usam `publishedAt` decrescente e `id` crescente.
12. A busca inicial considera somente o título; busca em sinopse/descrição e busca textual avançada ficam adiadas.
13. Imagens, vídeos e suas referências são opcionais. O schema não exige nem seleciona provedor de storage externo.
14. Exclusões relacionadas são restritas por FK; arquivamento é o caminho editorial preferido.

## 3. Proposta de modelo Prisma — somente para revisão

O schema local foi refinado nesta Etapa 10C. As novas datas do catálogo usam `@db.Timestamptz(3)` para representar instantes com timezone e precisão de milissegundos; os quatro modelos Better Auth mantêm seus tipos originais. O SQL em `docs/catalog-schema-review.sql` contém o diff entre schemas locais e as restrições `CHECK` propostas manualmente porque Prisma 7.10.1 não as representa no schema. Limites de texto alinham-se aos contratos Zod existentes. IDs dos modelos de catálogo usam `@default(uuid())`: Prisma Client gera UUID v4 ao criar cada registro; o PostgreSQL não tem default para esses campos. `SeriesCategory` usa a chave primária composta `(seriesId, categoryId)`. Inserts SQL fora do Prisma precisam fornecer IDs explícitos.

### `Series`

| Campo | Tipo proposto | Finalidade/regras |
|---|---|---|
| `id` | `String @default(uuid()) @db.VarChar(128)` | UUID v4 gerado pelo Prisma Client. |
| `slug` | `String @db.VarChar(120)` | Rota legível; único, minúsculo e separado por hífens. |
| `title` | `String @db.VarChar(180)` | Título editorial obrigatório. |
| `synopsis` | `String @db.VarChar(5000)` | Texto principal obrigatório para apresentação. |
| `description` | `String? @db.VarChar(5000)` | Complemento editorial opcional. |
| `ageRating` | `String? @db.VarChar(32)` | Rótulo fornecido por política editorial futura; sem enum fixo por ora. |
| `publicationStatus` | enum `PublicationStatus` | `DRAFT`, `PUBLISHED` ou `ARCHIVED`; default `DRAFT`. |
| `publishedAt` | `DateTime? @db.Timestamptz(3)` | Instante efetivo em que a série foi publicada; não é uma data futura de agendamento. |
| `featuredOrder` | `Int?` | Prioridade opcional; nulls last, depois data de publicação e ID como desempate. Valores não negativos serão validados no serviço. |
| `posterAssetId` | `String?` | Referência opcional a `MediaAsset` do tipo `IMAGE`. |
| `featuredAssetId` | `String?` | Referência opcional a `MediaAsset` do tipo `IMAGE`. |
| `createdAt`, `updatedAt` | `DateTime @db.Timestamptz(3)` | Auditoria técnica com instante/timezone. |

Relações: uma série contém temporadas e se relaciona a categorias por `SeriesCategory`; pôster e destaque referenciam imagens. Restrições: `UNIQUE(slug)` e índices para status/data, prioridade editorial, título e FKs de assets. Para listas públicas, a API filtra séries publicadas e usa ordenação determinística: `featuredOrder ASC NULLS LAST, publishedAt DESC, id ASC`; `newest` usa `publishedAt DESC, id ASC`; `title` usa `title ASC, id ASC`.

### `Season`

| Campo | Tipo proposto | Finalidade/regras |
|---|---|---|
| `id` | `String @default(uuid()) @db.VarChar(128)` | UUID v4 gerado pelo Prisma Client. |
| `seriesId` | `String @db.VarChar(128)` | FK obrigatória para `Series`. |
| `seasonNumber` | `Int` | Número positivo e ordenável. |
| `title` | `String?` | Título opcional; o número permanece suficiente para navegação inicial. |
| `createdAt`, `updatedAt` | `DateTime @db.Timestamptz(3)` | Auditoria técnica com instante/timezone. |

Restrições: `UNIQUE(seriesId, seasonNumber)`; o índice único já cobre buscas pelo prefixo `seriesId`. Não existe `publicationStatus` em temporada. Uma temporada só é listada se sua série estiver publicada e houver pelo menos um episódio publicado; o endpoint retorna apenas os episódios publicados.

### `Episode`

| Campo | Tipo proposto | Finalidade/regras |
|---|---|---|
| `id` | `String @default(uuid()) @db.VarChar(128)` | UUID v4 gerado pelo Prisma Client. |
| `seasonId` | `String @db.VarChar(128)` | FK obrigatória para `Season`. |
| `episodeNumber` | `Int` | Número positivo, ordenado dentro da temporada. |
| `title` | `String @db.VarChar(180)` | Título obrigatório. |
| `description` | `String? @db.VarChar(5000)` | Complemento opcional. |
| `thumbnailAssetId` | `String? @db.VarChar(128)` | Referência opcional a imagem. |
| `videoAssetId` | `String? @db.VarChar(128)` | Referência interna opcional a vídeo; nunca incluída em resposta pública. |
| `durationSeconds` | `Int?` | Duração positiva quando informada. |
| `publicationStatus` | enum `PublicationStatus` | `DRAFT`, `PUBLISHED` ou `ARCHIVED`; default `DRAFT`. |
| `publishedAt` | `DateTime? @db.Timestamptz(3)` | Instante real de publicação, sem agendamento. |
| `accessLevel` | enum `AccessLevel` | `FREE` ou `PREMIUM`; classificação informativa no catálogo, sem default implícito. |
| `createdAt`, `updatedAt` | `DateTime @db.Timestamptz(3)` | Auditoria técnica com instante/timezone. |

Restrições: `UNIQUE(seasonId, episodeNumber)` e índices `(seasonId, publicationStatus, episodeNumber)` e `(seasonId, publicationStatus, accessLevel, episodeNumber)`. A API não lista episódios de temporadas cuja série não seja visível. O valor `PREMIUM` nunca substitui autorização no servidor.

### Revisão dos índices

O schema mantém 15 índices: slug único de série e categoria; índices compostos para lista pública por data, destaque e título; índices para as FKs opcionais de assets; unicidades de temporada/episódio; índices de listagem de episódios com e sem filtro de acesso; índice de `categoryId` no join e unicidade do `storageKey`. Não há índice separado em `Season.seriesId`, porque o índice único `(seriesId, seasonNumber)` já atende consultas pelo prefixo. Os dois índices compostos de episódios não são redundantes: um ordena todos os episódios publicados e o outro atende o filtro adicional `accessLevel`.

### `Category` e `SeriesCategory`

`Category`: `id` (`VarChar(128)`, UUID v4 gerado pelo Prisma Client), `name` (`VarChar(80)`), `slug` (`VarChar(120)`, único), `createdAt` e `updatedAt` em `Timestamptz(3)`. `SeriesCategory`: associação muitos-para-muitos com chave primária/única `(seriesId, categoryId)`, `createdAt Timestamptz(3)` e índice em `categoryId` (a chave composta já atende consultas pelo prefixo `seriesId`). A mesma taxonomia serve a categorias e gêneros iniciais; não criar uma entidade `Genre` paralela nesta fase. Na leitura pública, retornar somente categorias associadas a séries visíveis.

### `MediaAsset`

Campos: `id` (UUID v4 gerado pelo Prisma Client), `kind` (`IMAGE` ou `VIDEO`), `storageKey?` opaco e único quando presente, `processingStatus` (`PENDING`, `READY`, `FAILED`), `mimeType?` e timestamps `Timestamptz(3)`. As referências a assets também são opcionais. `storageKey` não identifica um provedor e pode permanecer nulo enquanto storage não for escolhido; não há integração nem dependência obrigatória de storage externo. Um asset `READY` precisa ter `storageKey` não vazio.

Uma FK convencional não garante que `kind` combine com o local que referencia o asset. O serviço de domínio deve validar essa compatibilidade antes de associar/publicar. O Prisma não representa essa regra como constraint relacional simples; avaliar constraint manual em migration futura somente após revisão. URLs públicas de imagem serão resolvidas pelo servidor. `storageKey`, estado de processamento e URLs privadas/assinadas de vídeo são dados internos e nunca entram nos contratos públicos.

### Restrições `CHECK` propostas

O schema language do Prisma instalado (7.10.1) não aceita `@@check`; a validação local confirmou essa limitação. Por isso, as sete constraints abaixo aparecem como SQL manual no fim de `docs/catalog-schema-review.sql`, depois do diff Prisma gerado entre arquivos:

| Constraint | Regra |
|---|---|
| `series_featured_order_nonnegative_check` | `featuredOrder` é nulo ou não negativo. Valores menores representam maior prioridade. |
| `series_published_requires_published_at_check` | `PUBLISHED` exige `publishedAt IS NOT NULL`. |
| `season_season_number_positive_check` | `seasonNumber > 0`. |
| `episode_episode_number_positive_check` | `episodeNumber > 0`. |
| `episode_duration_seconds_positive_check` | `durationSeconds` é nulo ou positivo. |
| `episode_published_requires_published_at_check` | `PUBLISHED` exige `publishedAt IS NOT NULL`. |
| `media_asset_ready_requires_storage_key_check` | `READY` exige `storageKey` presente e não vazio. |

Essas constraints são adicionadas às tabelas de catálogo recém-criadas e não atualizam registros. Elas não cobrem validações entre tabelas: tipo de asset e relação de uso, nem prontidão de todos os assets de uma série/temporada. Serviços futuros devem rejeitar referência de tipo incompatível; imagem de capa/destaque/thumbnail usa `IMAGE`, mídia de episódio usa `VIDEO`. Um asset referenciado por conteúdo publicado precisa estar `READY`; os campos de asset continuam opcionais e não há requisito de vídeo para armazenar metadados nesta etapa. O serviço de publicação define `publishedAt` com o instante atual e não aceita agendamento.

Como Prisma 7.10.1 não mantém essas checks no `schema.prisma`, a migration oficial local carrega explicitamente o bloco SQL nomeado, e revisões futuras de drift também devem considerar essa limitação. Ao regenerar um diff de arquivos, as instruções `ALTER TABLE ... ADD CONSTRAINT` manuais precisam ser reaplicadas.

### Relações e itens adiados

```text
Series 1 ── N Season 1 ── N Episode
   │                          │
   ├── N ── SeriesCategory ── N ── Category
   ├── MediaAsset (pôster/destaque, IMAGE)
                              ├── MediaAsset (thumbnail, IMAGE)
                              └── MediaAsset (vídeo, VIDEO; privado)

WatchProgress (usuário/episódio) — futuro, fora do catálogo inicial
```

`WatchProgress` é uma necessidade futura associada a continuar assistindo; requer decisão própria sobre sincronização, conclusão e retenção. Todas as FKs do catálogo usam `onDelete: Restrict`; isso impede apagar uma série, temporada, categoria ou asset enquanto houver referências. Arquivar conteúdo é o caminho preferencial. Remoção deliberada exige excluir referências em ordem segura e será uma operação administrativa futura, não um cascade implícito.

## 4. Contratos Zod compartilhados

Os contratos de leitura estão implementados em `packages/contracts/src/schemas/catalog-*.ts`, agregados por `@mind-plus/contracts` e pelo subpath `@mind-plus/contracts/catalog`. Schemas públicos usam objetos estritos; tipos são inferidos com `z.infer`.

Contratos previstos nesta etapa:

- Categoria: `id`, `name`, `slug`.
- Série resumida: identificador/slug/título, `synopsis`, imagem de pôster pública opcional, classificação etária opcional, categorias e `publishedAt`.
- Detalhe da série: resumo acrescido de `description` e imagem de destaque pública, ambos opcionais/nulos conforme ausência de conteúdo.
- Temporada: identificador, número e título opcional.
- Episódio: identificador, número, título, descrição opcional, thumbnail pública, duração, `accessLevel` e `publishedAt`. Sem status de publicação ou referência/URL de reprodução no formato público.
- Consultas: paginação existente, busca, categoria e ordenação de séries; paginação e filtro `accessLevel` para episódios. Episódios seguem sequência por número, portanto não precisam de ordenação escolhida pelo cliente nesta fase.
- Respostas de listas e detalhe: envelopes já existentes, com `items` e `pagination` validados pelo contrato de metadados de paginação.

O enum `DRAFT | PUBLISHED | ARCHIVED` existe como vocabulário compartilhado, mas status não aparece nas respostas públicas. A API filtra primeiro; os schemas estritos também rejeitam campos inesperados, mas não substituem autorização. Há alinhamento entre limites Zod e `VarChar` propostos para IDs, slugs, títulos, sinopses, descrições, classificações e nomes de categoria. Campos opcionais do banco são serializados como `null` nos contratos estáveis quando aplicável. Os contratos expõem URLs de imagem resolvidas pelo servidor, enquanto o banco armazena apenas referências internas a `MediaAsset`.

Os `CHECK` reforçam invariantes locais à linha. Os serviços da API também validam payloads Zod e relações de publicação, inclusive consistência entre pais/filhos e tipo/estado dos assets. A FK impede apagar conteúdo ainda referenciado; a `CHECK` não toma decisões editoriais.

Exemplo de uso:

```ts
import {
  catalogSeriesQuerySchema,
  catalogSeriesListResponseSchema,
  type CatalogSeriesSummary,
} from '@mind-plus/contracts';

const query = catalogSeriesQuerySchema.parse(requestQuery);
const payload = catalogSeriesListResponseSchema.parse(apiPayload);
const firstSeries: CatalogSeriesSummary | undefined = payload.data.items[0];
```

## 5. API de leitura proposta

As rotas abaixo são planejadas e ainda não existem. Route Handlers validam query/body com contracts, chamam serviços da API e não expõem Prisma diretamente.

| Método/rota planejada | Acesso | Resultado |
|---|---|---|
| `GET /api/catalog/categories` | Público | Categorias usadas por séries visíveis. |
| `GET /api/catalog/series` | Público | Lista paginada; filtros de categoria e busca; ordenação permitida. |
| `GET /api/catalog/series/{slug}` | Público | Detalhes de série visível. |
| `GET /api/catalog/series/{slug}/seasons` | Público | Temporadas visíveis, derivadas da série e de episódios publicados. |
| `GET /api/catalog/series/{slug}/seasons/{seasonNumber}/episodes` | Público | Metadados de episódios publicados em ordem numérica; pode conter `FREE` e `PREMIUM`, sem reprodução. |
| `GET /api/catalog/episodes/{episodeId}/playback` | Futuro: autenticado + entitlement | Fora desta etapa; requer player, mídia e autorização aprovados. |
| `GET /api/me/watch-progress` | Futuro: autenticado | Depende de `WatchProgress`, fora desta etapa. |

### Filtros e ordenação

- Reutilizar `page` e `pageSize` existentes (página inicia em 1, tamanho padrão 20 e máximo 100).
- Busca inicial limitada ao título e filtro de categoria por slug. A busca não considera sinopse ou descrição. Sem índice específico de busca textual, uma busca por substring pode fazer scan; manter o primeiro catálogo pequeno e avaliar extensão/índice especializado quando o volume justificar.
- A ordenação contratada de séries é `featured`, `newest` ou `title`. `featured` usa `featuredOrder ASC NULLS LAST`, seguido por `publishedAt DESC, id ASC`; `newest` usa `publishedAt DESC, id ASC`; `title` usa `title ASC, id ASC`. Isso não usa popularidade.
- Episódios são ordenados por `episodeNumber`, com desempate técnico estável quando necessário.
- `accessLevel` pode filtrar metadados de episódios; não serve como controle de acesso à mídia.

### Visibilidade, erros e privacidade

- A API só consulta/serializa séries com estado `PUBLISHED` e `publishedAt` definido; `DRAFT` e `ARCHIVED` nunca aparecem em leitura pública. `publishedAt` é gravado na transição para publicação, nunca representa uma data agendada.
- Episódios são públicos somente quando `PUBLISHED`, com `publishedAt` definido, dentro de temporada pertencente a série visível.
- Temporada aparece apenas quando a série é pública e existe ao menos um episódio público nela; seu retorno inclui somente episódios públicos.
- Nunca revelar a existência de registro privado por mensagem de erro ou contagem. Usar `404` para inexistente ou não visível.
- `400` para filtros inválidos; erros usam envelopes atuais e não revelam mensagens Prisma, chaves de storage ou detalhes operacionais.
- Respostas não incluem estado editorial, IDs ou dados administrativos internos além dos IDs públicos necessários, `storageKey`, tokens, URLs privadas/assinadas, estado de processamento ou conteúdo não publicado.
- `FREE`/`PREMIUM` descreve o acesso previsto ao episódio. A entrega de mídia exige verificação própria no servidor numa fase futura.

## 6. Navegação Expo proposta

O catálogo aprovado é navegável sem autenticação. A futura topologia deverá permitir o grupo de catálogo fora do segmento protegido, preservando sessões para áreas pessoais:

```text
src/app/
  (catalog)/
    _layout.tsx
    index.tsx                         # home pública
    series/
      index.tsx                       # lista, busca e filtros
      [slug]/
        index.tsx                     # detalhe da série
        seasons/
          [seasonNumber].tsx          # episódios da temporada
  (app)/                               # áreas que realmente exigem sessão
```

Esta é uma estrutura futura; nenhum arquivo Expo deve ser alterado nesta etapa. Home, lista, detalhes e temporadas consumirão somente os endpoints públicos. Não apresentar um botão de reprodução funcional antes da etapa de player. Popularidade, continuar assistindo e banners ficam omitidos até existir definição e dados reais. As telas de autenticação existentes permanecem independentes do catálogo público.

Estados de carregamento, vazio, falha de rede e retry devem refletir respostas reais da API; conteúdo de referência visual não deve ser apresentado como catálogo existente.

## 7. Segurança e publicação

1. Filtragem por status/visibilidade pertence aos serviços da API; Zod valida forma, não autorização.
2. Mobile e admin não importam Prisma nem acessam PostgreSQL diretamente.
3. Metadados `PREMIUM` podem ser públicos, mas URLs privadas, manifests e tokens de reprodução nunca são.
4. Validar `MediaAsset.kind` contra o papel do asset no domínio antes de associar/publicar.
5. A publicação efetiva registra `publishedAt`; não existe status agendado ou regra futura por timezone.
6. Conteúdo público precisa estar publicado e não arquivado. Serviços devem impedir combinações inválidas de série/temporada/episódio.
7. Endpoints de escrita editorial exigirão autenticação administrativa e autorização por papel, ainda não definidas.
8. Mudanças de schema dependem de proposta/SQL revisados, confirmação de Neon `development` e autorização explícita. Nada neste documento acessa o banco ou autoriza migration.

## 8. Decisões pendentes para as próximas fases do catálogo

1. Quais valores/jurisdições e processo editorial serão usados para `ageRating`.
2. Regras de normalização/localização para nomes e títulos, além dos limites de tamanho já alinhados aos contratos atuais.
3. Se a publicação exige imagem, thumbnail ou vídeo pronto; as referências são nullable no schema inicial.
4. Provedor de storage/CDN, resolução de URLs de imagens e processamento/retention dos assets. O schema atual não depende de serviço externo.
5. Semântica da busca por título (prefixo ou substring, caixa/acentos/locale) e se o volume justificará índice especializado, por exemplo trigram.
6. Papéis administrativos e quem poderá criar, publicar e arquivar conteúdo (necessário antes de escrita/admin).
7. Política operacional para remoção deliberada de registros/associações; FKs restringem cascata, mas não definem o fluxo administrativo de exclusão.

Popularidade, progresso, assinatura, agendamento e player foram adiados, não são pendências para a primeira migration do catálogo.

## 9. Sequência recomendada

1. Revisar o schema local, o SQL preliminar em `docs/catalog-schema-review.sql` e a migration oficial, incluindo as sete constraints `CHECK` manuais.
2. Em etapa separada, confirmar que a conexão aponta para Neon `development` e obter autorização explícita antes de aplicar a migration; nunca usar `production` nesta fase.
3. Implementar serviços de leitura na API, com testes de visibilidade, publicação e prevenção de vazamento.
4. Implementar Route Handlers públicos que validam e respondem pelos contracts.
5. Construir navegação pública do catálogo no Expo, com estados reais e sem player.
6. Planejar administração/editorial, storage/assets e funções adiadas em etapas independentes.

## 10. Fora do escopo atual

Esta etapa criou localmente a migration oficial `20261116191648_add_catalog` e atualizou este documento e o README do pacote database. Nenhum banco foi acessado ou alterado. Autenticação, Resend, `neon.ts`, API, admin e mobile não foram modificados. Não implementa upload, processamento, player, progresso, assinatura ou pagamentos.
