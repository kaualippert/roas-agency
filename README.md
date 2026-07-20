# ROAS Agency

Monorepo da plataforma de gestão da agência, com frontend React e API Node.js persistida no MongoDB Atlas.

## Estrutura

- `apps/web`: React, TypeScript e Vite
- `apps/api`: Express, TypeScript, Mongoose e MongoDB

## Configuração

```bash
npm install
cp apps/api/.env.example apps/api/.env
```

Preencha `MONGODB_URI` no `.env`. Como alternativa, a API pode carregar o arquivo entregue pelo Atlas sem copiá-lo para o projeto:

```bash
ATLAS_CREDENTIALS_FILE=/caminho/absoluto/atlas-credentials.env npm run dev
```

O arquivo de credenciais pode fornecer `MONGODB_URI`, `MONGODB_USERNAME` e `MONGODB_PASSWORD`. Placeholders de usuário e senha na URI são resolvidos automaticamente.

## Desenvolvimento

```bash
npm run dev
```

- Frontend: http://127.0.0.1:5173
- API: http://127.0.0.1:3333
- Health check: http://127.0.0.1:3333/api/health

O MongoDB é a única fonte de verdade dos dados operacionais. O frontend carrega o estado exclusivamente pela API e não inicializa dados demonstrativos nem usa `localStorage` como contingência. Se a API ou o banco estiver indisponível, a aplicação exibe o erro de conexão em vez de apresentar dados obsoletos.

## Deploy único na Vercel

O repositório está configurado para um único projeto Vercel servir frontend e backend no mesmo domínio:

- o projeto Vercel deve usar a raiz do repositório como **Root Directory**;
- `vercel.json` executa `npm run build:vercel` e publica `apps/web/dist`;
- `api/index.ts` recebe todas as rotas `/api/*` como uma Vercel Function;
- as demais rotas são reescritas para `index.html`, preservando o React Router;
- em produção o frontend usa `/api`, sem URL fixa ou CORS entre domínios.

Cadastre estas variáveis em **Settings → Environment Variables** para Production, Preview e Development:

```text
MONGODB_URI
MONGODB_USERNAME
MONGODB_PASSWORD
```

Se `MONGODB_URI` já contiver usuário e senha, as duas variáveis separadas são opcionais. O arquivo local `atlas-credentials.env` não deve ser enviado para a Vercel nem versionado.

No MongoDB Atlas, a Network Access list precisa aceitar conexões da Vercel. Para cargas serverless, use uma regra de acesso compatível com os endereços de saída do projeto ou uma integração privada disponível no plano utilizado.

## Validação

```bash
npm run build
npm run build:vercel
npm test
```
