# ♠ Cacifes

Controle de cacifes e saldos para a noite de poker.

## Rodando localmente

```bash
npm install
npm run dev
```

Abre em `http://localhost:5173`.

Para gerar a versão de produção (arquivos estáticos que podem ser hospedados em qualquer lugar):

```bash
npm run build
```

Os arquivos ficam em `dist/`.

## Como funciona

- Estado guardado no `localStorage` do navegador (arquivo `src/hooks/useLocalStorage.js`), então os dados persistem entre sessões no mesmo aparelho/navegador.
- O saldo de cada jogador é **calculado**, não guardado diretamente: `saldo = ajustes manuais - (cacifes × valor do cacife)`. Por isso, ao mudar o valor do cacife, o saldo de todo mundo é recalculado automaticamente.
- Cada jogador novo já entra com 1 cacife.

## Evoluindo para banco de dados

Toda a lógica de estado está centralizada em `src/App.jsx`, usando `useLocalStorage` como única fonte de persistência. Para migrar para um banco de dados (ex: Supabase, Firebase, ou uma API própria):

1. Troque o hook `useLocalStorage` por um hook equivalente que busque/salve os dados remotamente (ex: `useState` + `useEffect` com `fetch`, ou React Query).
2. Adicione um campo `paid` (pago) por jogador para controlar quem já acertou o saldo.
3. O resto dos componentes (`PlayerRow`, `AdjustModal`, etc.) não precisa mudar — eles só recebem dados e disparam callbacks.

## Estrutura

```
src/
  App.jsx                 estado principal e composição das telas
  index.css                tema visual (mesa de poker)
  utils.js                 formatação e cálculo de saldo
  hooks/useLocalStorage.js persistência local
  data/handRankings.js     ranking das mãos do Texas Hold'em
  components/
    Header.jsx             título + menu hambúrguer
    BuyInRow.jsx            input do valor do cacife
    PlayerRow.jsx           linha de cada jogador
    TotalRow.jsx            total da mesa (verde/vermelho)
    DeleteModal.jsx         confirmação de exclusão
    AdjustModal.jsx         ajuste de saldo
    ExportModal.jsx         resumo para copiar/enviar
    ResetModal.jsx          resetar cacifes (100% ou mantendo jogadores)
    HandRankingScreen.jsx   ranking das mãos do poker
```
