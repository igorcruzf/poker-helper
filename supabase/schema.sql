-- Cacifes — esquema completo.
-- Cole tudo no Supabase → SQL Editor → New query → Run.
-- É idempotente: pode rodar de novo sem quebrar.

-- ---------------------------------------------------------------------------
-- 1. Elenco: jogadores recorrentes de cada usuário
-- ---------------------------------------------------------------------------
create table if not exists public.players (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users (id) on delete cascade,
  name        text not null check (length(trim(name)) > 0),
  created_at  timestamptz not null default now()
);

-- Um "Igor" só por conta (ignorando maiúsculas/minúsculas).
create unique index if not exists players_owner_name_idx
  on public.players (owner_id, lower(trim(name)));

create index if not exists players_owner_idx on public.players (owner_id);

-- ---------------------------------------------------------------------------
-- 2. Mesas (uma noite de poker)
-- ---------------------------------------------------------------------------
create table if not exists public.poker_tables (
  id                    uuid primary key default gen_random_uuid(),
  owner_id              uuid not null references auth.users (id) on delete cascade,
  name                  text,
  buy_in                numeric(10,2) not null default 5 check (buy_in >= 0),
  status                text not null default 'active' check (status in ('active', 'finished')),
  -- Quem centraliza o acerto: o maior ganhador (padrão) ou um jogador fixo.
  settlement_mode       text not null default 'top_winner'
                        check (settlement_mode in ('top_winner', 'fixed_player')),
  settlement_player_id  uuid references public.players (id) on delete set null,
  created_at            timestamptz not null default now(),
  finished_at           timestamptz
);

create index if not exists poker_tables_owner_idx
  on public.poker_tables (owner_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 3. Jogadores sentados numa mesa
--    `name` é uma cópia do nome na hora do jogo: apagar alguém do elenco não
--    apaga o histórico das noites em que essa pessoa jogou.
-- ---------------------------------------------------------------------------
create table if not exists public.table_players (
  id          uuid primary key default gen_random_uuid(),
  table_id    uuid not null references public.poker_tables (id) on delete cascade,
  player_id   uuid references public.players (id) on delete set null,
  name        text not null,
  cacifes     integer not null default 1 check (cacifes >= 0),
  adjustment  numeric(10,2) not null default 0,
  position    integer not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists table_players_table_idx on public.table_players (table_id, position);

-- ---------------------------------------------------------------------------
-- 4. Acerto de contas gerado ao encerrar a mesa
-- ---------------------------------------------------------------------------
create table if not exists public.settlements (
  id                    uuid primary key default gen_random_uuid(),
  table_id              uuid not null references public.poker_tables (id) on delete cascade,
  from_table_player_id  uuid not null references public.table_players (id) on delete cascade,
  to_table_player_id    uuid not null references public.table_players (id) on delete cascade,
  amount                numeric(10,2) not null check (amount > 0),
  paid                  boolean not null default false,
  paid_at               timestamptz,
  created_at            timestamptz not null default now()
);

create index if not exists settlements_table_idx on public.settlements (table_id);

-- ---------------------------------------------------------------------------
-- 5. Row Level Security — cada usuário só enxerga o que é dele
-- ---------------------------------------------------------------------------
alter table public.players       enable row level security;
alter table public.poker_tables  enable row level security;
alter table public.table_players enable row level security;
alter table public.settlements   enable row level security;

drop policy if exists players_owner_all on public.players;
create policy players_owner_all on public.players
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists poker_tables_owner_all on public.poker_tables;
create policy poker_tables_owner_all on public.poker_tables
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- Filhas herdam o dono pela mesa.
drop policy if exists table_players_owner_all on public.table_players;
create policy table_players_owner_all on public.table_players
  for all to authenticated
  using (exists (
    select 1 from public.poker_tables t
    where t.id = table_players.table_id and t.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.poker_tables t
    where t.id = table_players.table_id and t.owner_id = (select auth.uid())
  ));

drop policy if exists settlements_owner_all on public.settlements;
create policy settlements_owner_all on public.settlements
  for all to authenticated
  using (exists (
    select 1 from public.poker_tables t
    where t.id = settlements.table_id and t.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.poker_tables t
    where t.id = settlements.table_id and t.owner_id = (select auth.uid())
  ));

-- ---------------------------------------------------------------------------
-- 6. Link público do acerto
--    O host manda um link para o grupo; quem abre não precisa de conta.
--    O token é um uuid aleatório — sem ele não há como chegar nos dados.
-- ---------------------------------------------------------------------------
alter table public.poker_tables
  add column if not exists share_token uuid not null default gen_random_uuid();

alter table public.poker_tables
  add column if not exists allow_guest_payments boolean not null default true;

create unique index if not exists poker_tables_share_token_idx
  on public.poker_tables (share_token);

-- As duas funções abaixo são `security definer`: rodam com os privilégios do
-- dono e por isso enxergam além do RLS. É de propósito — é o único jeito de o
-- visitante anônimo ler UMA mesa (a do token) sem que a política precise
-- liberar a tabela inteira para o papel `anon`.

create or replace function public.get_shared_settlement(p_token uuid)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    'table', jsonb_build_object(
      'id', t.id,
      'name', t.name,
      'buy_in', t.buy_in,
      'status', t.status,
      'created_at', t.created_at,
      'finished_at', t.finished_at,
      'allow_guest_payments', t.allow_guest_payments
    ),
    'players', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', tp.id, 'name', tp.name, 'cacifes', tp.cacifes,
        'adjustment', tp.adjustment, 'position', tp.position
      ) order by tp.position)
      from table_players tp where tp.table_id = t.id
    ), '[]'::jsonb),
    'settlements', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id,
        'from_table_player_id', s.from_table_player_id,
        'to_table_player_id', s.to_table_player_id,
        'amount', s.amount, 'paid', s.paid, 'paid_at', s.paid_at
      ) order by s.created_at)
      from settlements s where s.table_id = t.id
    ), '[]'::jsonb)
  )
  from poker_tables t
  where t.share_token = p_token;
$$;

-- Só grava se a mesa permitir pagamento por convidado e o pagamento for dela.
create or replace function public.set_shared_payment(
  p_token uuid,
  p_settlement_id uuid,
  p_paid boolean
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_table_id uuid;
begin
  select t.id into v_table_id
  from poker_tables t
  where t.share_token = p_token
    and t.allow_guest_payments
    and t.status = 'finished';

  if v_table_id is null then
    return false;
  end if;

  update settlements
  set paid = p_paid,
      paid_at = case when p_paid then now() else null end
  where id = p_settlement_id
    and table_id = v_table_id;

  return found;
end;
$$;

revoke all on function public.get_shared_settlement(uuid) from public;
revoke all on function public.set_shared_payment(uuid, uuid, boolean) from public;
grant execute on function public.get_shared_settlement(uuid) to anon, authenticated;
grant execute on function public.set_shared_payment(uuid, uuid, boolean) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 7. Mesa ao vivo por link (somente leitura)
--    O timer de blinds vivia só no navegador do host; para o convidado ver o
--    nível e o tempo restante, o estado passa a ficar aqui. Guardamos o
--    instante em que o nível acaba (`endsAt`), não o contador — assim cada
--    aparelho calcula os segundos sozinho e não há escrita a cada segundo.
-- ---------------------------------------------------------------------------
alter table public.poker_tables
  add column if not exists timer_state jsonb;

create or replace function public.get_shared_settlement(p_token uuid)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    'table', jsonb_build_object(
      'id', t.id,
      'name', t.name,
      'buy_in', t.buy_in,
      'status', t.status,
      'created_at', t.created_at,
      'finished_at', t.finished_at,
      'allow_guest_payments', t.allow_guest_payments,
      'timer_state', t.timer_state
    ),
    'players', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', tp.id, 'name', tp.name, 'cacifes', tp.cacifes,
        'adjustment', tp.adjustment, 'position', tp.position
      ) order by tp.position)
      from table_players tp where tp.table_id = t.id
    ), '[]'::jsonb),
    'settlements', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id,
        'from_table_player_id', s.from_table_player_id,
        'to_table_player_id', s.to_table_player_id,
        'amount', s.amount, 'paid', s.paid, 'paid_at', s.paid_at
      ) order by s.created_at)
      from settlements s where s.table_id = t.id
    ), '[]'::jsonb)
  )
  from poker_tables t
  where t.share_token = p_token;
$$;

grant execute on function public.get_shared_settlement(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 8. Rebuy com valor proprio
--    O primeiro cacife custa `buy_in`; os seguintes custam `rebuy_value`.
--    Nulo = rebuy pelo mesmo valor da entrada (comportamento antigo, entao as
--    mesas ja existentes continuam calculando igual).
-- ---------------------------------------------------------------------------
alter table public.poker_tables
  add column if not exists rebuy_value numeric(10,2) check (rebuy_value >= 0);

create or replace function public.get_shared_settlement(p_token uuid)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    'table', jsonb_build_object(
      'id', t.id,
      'name', t.name,
      'buy_in', t.buy_in,
      'rebuy_value', t.rebuy_value,
      'status', t.status,
      'created_at', t.created_at,
      'finished_at', t.finished_at,
      'allow_guest_payments', t.allow_guest_payments,
      'timer_state', t.timer_state
    ),
    'players', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', tp.id, 'name', tp.name, 'cacifes', tp.cacifes,
        'adjustment', tp.adjustment, 'position', tp.position
      ) order by tp.position)
      from table_players tp where tp.table_id = t.id
    ), '[]'::jsonb),
    'settlements', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id,
        'from_table_player_id', s.from_table_player_id,
        'to_table_player_id', s.to_table_player_id,
        'amount', s.amount, 'paid', s.paid, 'paid_at', s.paid_at
      ) order by s.created_at)
      from settlements s where s.table_id = t.id
    ), '[]'::jsonb)
  )
  from poker_tables t
  where t.share_token = p_token;
$$;

grant execute on function public.get_shared_settlement(uuid) to anon, authenticated;
