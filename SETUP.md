# Configuração — Supabase e Vercel

Passo a passo do zero. Leva uns 15 minutos.

---

## 1. Criar o projeto no Supabase

1. Em [supabase.com](https://supabase.com) → **New project**.
2. Escolha uma região perto (ex: São Paulo) e guarde a senha do banco.
3. Espere o projeto subir (~2 min).

## 2. Criar as tabelas

**SQL Editor → New query**, cole o conteúdo de [`supabase/schema.sql`](supabase/schema.sql)
e clique em **Run**. Ele cria as tabelas, os índices e as regras de acesso (RLS).

O script é idempotente: pode rodar de novo a cada atualização do app, e é o que
você faz para aplicar uma versão nova do esquema sem perder dado.

### O que cada tabela guarda

| Tabela | Para que serve |
| --- | --- |
| `groups` | O **grupo**: a turma que joga junto. É dele que penduram elenco, mesas e estatísticas — não da conta de uma pessoa. Tem um `invite_code` curto para chamar gente e a foto do grupo, guardada na própria coluna `image_url` como data URI (o navegador reduz para ~150 KB antes de enviar; o banco recusa acima de 300 000 caracteres). Sem Storage, sem bucket, sem link externo. |
| `group_members` | Quem participa do grupo, com que **papel** (`owner` criou, `host` conduz as mesas, `member` acompanha) e qual jogador do elenco essa pessoa representa — é assim que o app sabe qual daqueles nomes é você. |
| `group_join_requests` | Os **pedidos de entrada** feitos com o código de convite, esperando um host aprovar. |
| `profiles` | O **perfil** de cada conta: nome, sobrenome, foto (mesmo esquema da foto do grupo) e a **chave pix** (opcional). Nasce por gatilho junto com a conta, inclusive no login com Google. Só quem divide um grupo com você enxerga o seu — a exceção é a chave pix, que sai também para quem abre o link do acerto, porque é justamente quem precisa te pagar. |
| `players` | O **elenco do grupo**: os jogadores que sempre aparecem. É essa lista que você marca ao criar uma mesa. |
| `poker_tables` | Uma **noite de poker**: valor do cacife, status (`active`/`finished`) e quem centraliza o acerto. |
| `table_players` | Quem **sentou** naquela mesa, com `cacifes` e `adjustment`. O nome é copiado no momento do jogo, então apagar alguém do elenco não estraga o histórico. |
| `settlements` | O **acerto**: uma linha por pagamento (`quem paga` → `quem recebe`, `amount`, `paid`). É o que a tela de acerto marca como pago. |

### Vindo de uma versão sem grupos

O próprio script migra: cada conta que já tinha elenco ou mesa ganha um grupo
"Meu grupo", entra nele como dona e leva junto tudo que era dela. Ninguém
precisa recadastrar nada.

Mais duas funções, usadas pelo link público do acerto (seção 6 do script):
`get_shared_settlement(token)` e `set_shared_payment(token, pagamento, pago)`.

### Colunas que valem explicação

- `poker_tables.settlement_mode` — `top_winner` (padrão) ou `fixed_player`.
- `poker_tables.settlement_player_id` — só é usado no modo `fixed_player`; aponta
  para uma linha de `players` (o anfitrião ou quem você escolher).
- `table_players.cacifes` — quantos cacifes a pessoa pegou (começa em 1).
- `table_players.adjustment` — o valor que ela levou da mesa no fim.
  `saldo = adjustment - cacifes × buy_in`, calculado no app, nunca guardado.
- `settlements.paid` / `paid_at` — o check da tela de acerto.

### Link público do acerto

`poker_tables.share_token` é um uuid aleatório por mesa, e o link
`/acerto/<token>` abre o acerto sem login. `allow_guest_payments` (ligado por
padrão, escolhido na criação da mesa) decide se quem abre o link pode marcar
pagamento ou só consultar.

O acesso anônimo **não** passa pelas tabelas: passa pelas duas funções
`security definer` do script, que recebem o token e devolvem/alteram apenas a
mesa correspondente. Por isso o papel `anon` continua sem permissão nenhuma nas
tabelas — quem não tem o token não chega a lugar nenhum, e quem tem só alcança
aquela mesa.

Se algum dia um link vazar para quem não devia, rode no SQL Editor:

```sql
update public.poker_tables set share_token = gen_random_uuid() where id = 'ID-DA-MESA';
```

O link antigo morre na hora.

### Segurança (já vem no script)

RLS ligado em todas as tabelas, e o filtro é o **grupo**: `players` e
`poker_tables` só aparecem para quem é membro (`is_group_member`), e só host
escreve (`is_group_host`); `table_players` e `settlements` herdam isso pela
mesa. Ou seja: mesmo com a anon key exposta no front (o que é normal e
esperado), ninguém enxerga as mesas de um grupo de que não faz parte.

Entrar num grupo, aprovar pedido e mudar permissão passam por funções
`security definer` (`request_group_join`, `approve_join_request`,
`set_member_role`) — é o único jeito de quem ainda não é membro conseguir
sequer ver o nome do grupo, e cada uma confere o papel de quem chamou.

## 3. Ligar o login

**Authentication → Sign In / Providers**:

- **Email** — já vem ligado. Em _Confirm email_ você escolhe se quer exigir
  confirmação por e-mail. Ligado é mais seguro; desligado é mais prático para uso
  entre amigos (entra direto ao criar a conta).
- **Google** — ative e cole o _Client ID_ e o _Client Secret_. Para consegui-los:
  1. [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services → Credentials**
  2. **Create credentials → OAuth client ID → Web application**
  3. Em _Authorized redirect URIs_ cole a URI que o próprio Supabase mostra na
     tela do provider Google (algo como `https://SEU-PROJETO.supabase.co/auth/v1/callback`).
  4. Copie Client ID/Secret de volta para o Supabase e salve.

**Authentication → URL Configuration**:

- _Site URL_: `https://seu-app.vercel.app`
- _Redirect URLs_: adicione `http://localhost:5173` (para desenvolvimento) e
  `https://seu-app.vercel.app`. Se usa preview deploys da Vercel, adicione
  também `https://*.vercel.app`.

Sem isso o login com Google volta para o lugar errado depois de autenticar.

## 4. Variáveis de ambiente

O jeito mais rápido: botão verde **Connect** no topo do dashboard → aba
**App Frameworks** → **React / Vite**. Ele já monta o bloco `.env` com os dois
valores e com os nomes certos.

Na mão, em **Project Settings (engrenagem) → API Keys**:

- **Publishable key** (`sb_publishable_...`) → `VITE_SUPABASE_PUBLISHABLE_KEY`.
  É a sucessora da anon key e pode ir no navegador. A aba **Legacy API keys**
  ainda tem a `anon` antiga (JWT `eyJ...`), que também funciona.
- **Secret key** (`sb_secret_...`) → nunca no front, nem na Vercel.

Para a URL, use **Integrations → Data API**, campo _API URL_, **sem o `/rest/v1/`**
do final — só `https://SEU-PROJETO.supabase.co` → `VITE_SUPABASE_URL`.

> O app aceita `VITE_SUPABASE_PUBLISHABLE_KEY` (nome que o botão Connect gera)
> ou `VITE_SUPABASE_ANON_KEY`, nessa ordem de preferência. Basta uma das duas.

Local:

```bash
cp .env.example .env
# preencha os dois valores
```

O `.env` está no `.gitignore` — não suba isso para o repositório.

> A anon key é pública por natureza (vai no bundle do navegador). Quem protege os
> dados é o RLS do passo 2. A chave **service_role** nunca deve aparecer no front.

## 5. Vercel

1. **Add New → Project** e importe o repositório.
2. Framework preset: **Vite**. Build `npm run build`, output `dist` (a Vercel
   detecta sozinha).
3. **Settings → Environment Variables**: adicione `VITE_SUPABASE_URL` e
   `VITE_SUPABASE_PUBLISHABLE_KEY` marcando **Production**, **Preview** e **Development**.
   Elas entram no bundle no momento do build — depois de adicionar/alterar é
   preciso **redeploy**, não basta reiniciar.
4. O [`vercel.json`](vercel.json) do repositório já manda qualquer rota para o
   `index.html`. Sem isso, abrir `/mesa/<id>` direto (ou dar F5 numa rota) dá 404.
5. Depois do primeiro deploy, volte no passo 3 e coloque a URL de produção na
   _Site URL_ e nas _Redirect URLs_ do Supabase.

O `public/_redirectsA` é resquício do Netlify e não faz nada na Vercel — pode
apagar quando quiser.

---

## Checklist

- [ ] `supabase/schema.sql` rodado sem erro
- [ ] Provider Email (e Google, se quiser) ativo
- [ ] Site URL e Redirect URLs preenchidas (produção **e** localhost)
- [ ] `.env` local preenchido
- [ ] Variáveis na Vercel nos 3 ambientes + redeploy
- [ ] Primeiro login OK, primeira mesa criada

## Se der errado

| Sintoma | Causa provável |
| --- | --- |
| Tela "Falta configurar o Supabase" | `.env` ausente ou sem o prefixo `VITE_`; na Vercel, faltou redeploy. |
| Login com Google volta para uma página em branco | URL faltando em _Redirect URLs_. |
| Entra mas a lista de mesas fica vazia e nada salva | O `schema.sql` não rodou, ou rodou sem as políticas de RLS. |
| `new row violates row-level security policy` | Está autenticado mas você não é host desse grupo — confira se rodou o script inteiro. |
| `could not create unique index "players_owner_name_idx"` | Versão antiga do `schema.sql`: depois dos grupos o mesmo nome pode existir em grupos diferentes, e o índice antigo (por conta) não aceita. Pegue o `schema.sql` atual e rode de novo — ele apaga esse índice em vez de recriar. |
| Só parte do script aplicou | Não existe: o SQL Editor roda tudo numa transação, então um erro desfaz o run inteiro. Corrija a causa e rode de novo. |
| `/mesa/<id>` dá 404 na Vercel | `vercel.json` não subiu no deploy. |
