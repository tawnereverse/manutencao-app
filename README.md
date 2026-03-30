# Sistema de Chamados (Vercel + GitHub + Supabase)

Projeto em HTML/CSS/JS puro, com:
- autenticacao real via Supabase Auth
- controle de acesso por perfil (`solicitante`, `tecnico`, `admin`)
- RLS no banco
- API serverless no Vercel para criacao de usuarios (`/api/create-user`)

## 1) Setup no Supabase

1. Abra o SQL Editor do Supabase.
2. Execute o arquivo [`supabase_schema.sql`](./supabase_schema.sql).
3. No Authentication > URL Configuration, configure a URL do seu dominio Vercel.

## 2) Variaveis no Vercel

No projeto do Vercel, configure:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## 3) Estrutura principal

- [`login.html`](./login.html): login com email/senha do Supabase Auth
- [`index.html`](./index.html): abertura de chamados com nome e email do solicitante
- [`admin.html`](./admin.html): painel tecnico para andamento/finalizacao
- [`api/create-user.js`](./api/create-user.js): criacao segura de usuarios (somente admin)
- [`js/`](./js): logica modular de auth, supabase e telas

## 4) Fluxo de uso

1. Usuario faz login em `login.html`.
2. `solicitante` abre chamados em `index.html` informando nome e email.
3. `tecnico/admin` gerencia chamados em `admin.html`.
4. Quando finalizado, o tecnico pode abrir o app de email (`mailto`), compartilhar no WhatsApp ou baixar resumo `.txt`.
5. `admin` pode criar novos usuarios no card "Criar usuario".

## 5) Observacao importante

Se voce mudar o projeto Supabase (URL/chaves), atualize:
- variaveis de ambiente no Vercel
- ou o arquivo [`js/config.js`](./js/config.js), se preferir manter fixo no frontend.
