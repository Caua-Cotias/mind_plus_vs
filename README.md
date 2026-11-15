# MIND +

Monorepo com npm workspaces para o aplicativo mobile, o painel administrativo, a API e os pacotes compartilhados.

## Aplicações

- `apps/mobile`: aplicativo iOS e Android com Expo.
- `apps/admin`: painel administrativo Next.js.

A API central Next.js será adicionada em `apps/api` em uma etapa posterior.

## Desenvolvimento

Instale as dependências a partir da raiz:

```sh
npm install
```

Execute cada app a partir da raiz:

```sh
npm run dev:mobile
npm run dev:admin
```

Os comandos gerais `npm run lint`, `npm run typecheck` e `npm run build` executam os scripts declarados pelos workspaces.
