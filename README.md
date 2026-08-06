# ♠ Cacifes

Controle de cacifes, saldos e acerto de contas para a noite de poker.
Login e dados no Supabase; o app é um PWA em React + Vite.

## Rodando localmente

```bash
npm install
cp .env.example .env   # preencha com a URL e a anon key do seu projeto Supabase
npm run dev
```

Abre em `http://localhost:5173`. Sem o `.env` o app sobe e mostra uma tela
explicando o que falta configurar.

Antes do primeiro login é preciso criar as tabelas no Supabase — o passo a passo
completo (banco, Google, Vercel) está em [`SETUP.md`](SETUP.md).

```bash
npm run build     # build de produção em dist/
npm run test      # vitest
npm run lint      # eslint
```

## Como funciona

- **Autenticação**: e-mail + senha ou Google, via Supabase Auth. A sessão fica
  guardada no navegador e é renovada sozinha — só sai quem clicar em "Sair".
- **Mesas**: cada noite é uma mesa. Você escolhe o valor do cacife, quem senta
  (do seu elenco de jogadores) e quem centraliza o acerto no fim.
- **Saldo é calculado, nunca guardado**: `saldo = ajustes - (cacifes × valor do cacife)`.
  Mudar o valor do cacife recalcula a mesa inteira na hora.
- **Acerto**: ao encerrar, o app gera as transferências em estrela — quem perdeu
  paga uma pessoa só, e ela repassa a quem ganhou. São no máximo (n-1)
  pagamentos em vez de todo mundo pagando todo mundo. Por padrão quem centraliza
  é o maior ganhador; dá para fixar um jogador na criação da mesa.
- **Quem já pagou**: cada transferência tem um check. O histórico mostra quanto
  ainda falta acertar em cada mesa.
- **Offline**: as alterações feitas sem rede ficam numa fila no `localStorage` e
  sobem sozinhas quando a conexão volta.

## Estrutura

```
src/
  App.jsx                     rotas + porteiro de autenticação
  index.css                   tema visual (mesa de poker)
  utils.js                    formatação e cálculo de saldo
  lib/
    supabase.js               cliente do Supabase
    settlement.js             quem paga quem no fim da noite
    syncQueue.js              fila de escritas offline
  hooks/
    useAuth.jsx               sessão do usuário
    useRoster.js              elenco de jogadores recorrentes
    useTables.js              lista de mesas + criação
    useTable.js               estado vivo de uma mesa
  screens/
    LoginScreen.jsx           entrar / criar conta
    TablesScreen.jsx          mesa em andamento + histórico
    CreateTableScreen.jsx     cacife, jogadores e quem recebe
    TableScreen.jsx           a tela de cacifes
    SettlementScreen.jsx      acerto de contas e quem já pagou
  components/                 peças de UI (sem lógica de persistência)
  data/handRankings.js        ranking das mãos do Texas Hold'em
supabase/schema.sql           tabelas, índices e RLS
```
