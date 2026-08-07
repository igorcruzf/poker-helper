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

-- O "um Igor só" é por GRUPO, e o índice que garante isso está na seção 9.2 —
-- aqui a coluna group_id ainda nem existe. Não recrie o antigo
-- `players_owner_name_idx (owner_id, name)`: depois dos grupos a mesma conta
-- pode ter um "André" em cada grupo, e recriá-lo faz o script inteiro falhar
-- no segundo run com "could not create unique index".
drop index if exists public.players_owner_name_idx;

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

-- ---------------------------------------------------------------------------
-- 9. Grupos
--    A conta deixa de ser a dona dos dados: quem manda agora é o grupo. Um
--    host cria o grupo, cadastra os jogadores, e outras pessoas pedem entrada
--    com o código de convite — representando um jogador que já existe ou um
--    nome novo. O dono do grupo aprova e pode promover alguém a host. Elenco,
--    mesas, histórico e estatísticas passam a ser do grupo, não de uma pessoa.
-- ---------------------------------------------------------------------------

-- Código curto de convite. Sem O/0/I/1 para ninguém errar ao ditar por voz.
create or replace function public.new_invite_code()
returns text
language plpgsql
volatile
set search_path = public
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.groups g where upper(g.invite_code) = code);
  end loop;
  return code;
end;
$$;

create table if not exists public.groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(trim(name)) > 0),
  invite_code text not null default public.new_invite_code(),
  created_by  uuid not null references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now()
);

create unique index if not exists groups_invite_code_idx
  on public.groups (upper(invite_code));

-- Quem participa do grupo e qual jogador do elenco essa pessoa representa.
-- `owner` é quem criou (só ele mexe em permissões), `host` roda as mesas,
-- `member` acompanha.
create table if not exists public.group_members (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references public.groups (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  player_id  uuid references public.players (id) on delete set null,
  role       text not null default 'member' check (role in ('owner', 'host', 'member')),
  created_at timestamptz not null default now(),
  unique (group_id, user_id)
);

create index if not exists group_members_user_idx on public.group_members (user_id);

create table if not exists public.group_join_requests (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references public.groups (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  email       text,
  -- Um dos dois: o jogador do elenco que a pessoa diz ser, ou um nome novo.
  player_id   uuid references public.players (id) on delete set null,
  player_name text,
  status      text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at  timestamptz not null default now(),
  decided_at  timestamptz,
  decided_by  uuid references auth.users (id) on delete set null
);

-- Um pedido em aberto por pessoa e grupo; os já decididos ficam de histórico.
create unique index if not exists group_join_requests_pending_idx
  on public.group_join_requests (group_id, user_id)
  where status = 'pending';

create index if not exists group_join_requests_group_idx
  on public.group_join_requests (group_id, status);

-- O vínculo dos dados com o grupo.
alter table public.players
  add column if not exists group_id uuid references public.groups (id) on delete cascade;

alter table public.poker_tables
  add column if not exists group_id uuid references public.groups (id) on delete cascade;

create index if not exists players_group_idx on public.players (group_id);
create index if not exists poker_tables_group_idx
  on public.poker_tables (group_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 9.1 Quem é o quê num grupo
--     São `security definer` de propósito: uma política de group_members que
--     consultasse group_members entraria em recursão infinita. Rodando fora do
--     RLS, a pergunta "essa pessoa é do grupo?" se responde de uma vez só.
-- ---------------------------------------------------------------------------
create or replace function public.is_group_member(p_group uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select p_group is not null and exists (
    select 1 from group_members m
    where m.group_id = p_group and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_group_host(p_group uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select p_group is not null and exists (
    select 1 from group_members m
    where m.group_id = p_group and m.user_id = auth.uid()
      and m.role in ('owner', 'host')
  );
$$;

create or replace function public.is_group_owner(p_group uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select p_group is not null and exists (
    select 1 from group_members m
    where m.group_id = p_group and m.user_id = auth.uid() and m.role = 'owner'
  );
$$;

-- ---------------------------------------------------------------------------
-- 9.2 Migração: cada dono atual vira dono de um grupo com o que já é dele
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
  gid uuid;
begin
  for r in
    select owner_id from public.players
    union
    select owner_id from public.poker_tables
  loop
    select g.id into gid
    from public.groups g
    where g.created_by = r.owner_id
    order by g.created_at
    limit 1;

    if gid is null then
      insert into public.groups (name, created_by)
      values ('Meu grupo', r.owner_id)
      returning id into gid;
    end if;

    insert into public.group_members (group_id, user_id, role)
    values (gid, r.owner_id, 'owner')
    on conflict (group_id, user_id) do nothing;

    update public.players
       set group_id = gid
     where owner_id = r.owner_id and group_id is null;

    update public.poker_tables
       set group_id = gid
     where owner_id = r.owner_id and group_id is null;
  end loop;
end $$;

-- O mesmo nome não se repete dentro do grupo (antes era dentro da conta).
drop index if exists public.players_owner_name_idx;
create unique index if not exists players_group_name_idx
  on public.players (group_id, lower(trim(name)));

-- ---------------------------------------------------------------------------
-- 9.3 RLS por grupo
-- ---------------------------------------------------------------------------
alter table public.groups              enable row level security;
alter table public.group_members       enable row level security;
alter table public.group_join_requests enable row level security;

drop policy if exists groups_member_read on public.groups;
create policy groups_member_read on public.groups
  for select to authenticated
  using (public.is_group_member(id));

drop policy if exists groups_host_update on public.groups;
create policy groups_host_update on public.groups
  for update to authenticated
  using (public.is_group_host(id))
  with check (public.is_group_host(id));

drop policy if exists groups_owner_delete on public.groups;
create policy groups_owner_delete on public.groups
  for delete to authenticated
  using (public.is_group_owner(id));

-- Sem política de insert: grupo nasce pela função create_group, que já cria a
-- linha de dono junto — senão o criador ficaria de fora do próprio grupo.

drop policy if exists group_members_read on public.group_members;
create policy group_members_read on public.group_members
  for select to authenticated
  using (public.is_group_member(group_id));

drop policy if exists group_members_owner_update on public.group_members;
create policy group_members_owner_update on public.group_members
  for update to authenticated
  using (public.is_group_owner(group_id))
  with check (public.is_group_owner(group_id));

-- O dono tira quem quiser; qualquer um pode sair sozinho.
drop policy if exists group_members_delete on public.group_members;
create policy group_members_delete on public.group_members
  for delete to authenticated
  using (public.is_group_owner(group_id) or user_id = (select auth.uid()));

drop policy if exists group_join_requests_read on public.group_join_requests;
create policy group_join_requests_read on public.group_join_requests
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_group_host(group_id));

drop policy if exists group_join_requests_delete on public.group_join_requests;
create policy group_join_requests_delete on public.group_join_requests
  for delete to authenticated
  using (user_id = (select auth.uid()) or public.is_group_host(group_id));

-- Elenco: todo mundo do grupo enxerga, host mexe.
drop policy if exists players_owner_all on public.players;
drop policy if exists players_group_read on public.players;
create policy players_group_read on public.players
  for select to authenticated
  using (public.is_group_member(group_id));

drop policy if exists players_group_insert on public.players;
create policy players_group_insert on public.players
  for insert to authenticated
  with check (public.is_group_host(group_id));

drop policy if exists players_group_update on public.players;
create policy players_group_update on public.players
  for update to authenticated
  using (public.is_group_host(group_id))
  with check (public.is_group_host(group_id));

drop policy if exists players_group_delete on public.players;
create policy players_group_delete on public.players
  for delete to authenticated
  using (public.is_group_host(group_id));

-- Mesas: idem — membro acompanha, host conduz.
drop policy if exists poker_tables_owner_all on public.poker_tables;
drop policy if exists poker_tables_group_read on public.poker_tables;
create policy poker_tables_group_read on public.poker_tables
  for select to authenticated
  using (public.is_group_member(group_id));

drop policy if exists poker_tables_group_insert on public.poker_tables;
create policy poker_tables_group_insert on public.poker_tables
  for insert to authenticated
  with check (public.is_group_host(group_id));

drop policy if exists poker_tables_group_update on public.poker_tables;
create policy poker_tables_group_update on public.poker_tables
  for update to authenticated
  using (public.is_group_host(group_id))
  with check (public.is_group_host(group_id));

drop policy if exists poker_tables_group_delete on public.poker_tables;
create policy poker_tables_group_delete on public.poker_tables
  for delete to authenticated
  using (public.is_group_host(group_id));

-- As filhas continuam herdando pela mesa, só que agora pelo grupo dela.
drop policy if exists table_players_owner_all on public.table_players;
drop policy if exists table_players_group_read on public.table_players;
create policy table_players_group_read on public.table_players
  for select to authenticated
  using (exists (
    select 1 from public.poker_tables t
    where t.id = table_players.table_id and public.is_group_member(t.group_id)
  ));

drop policy if exists table_players_group_write on public.table_players;
create policy table_players_group_write on public.table_players
  for all to authenticated
  using (exists (
    select 1 from public.poker_tables t
    where t.id = table_players.table_id and public.is_group_host(t.group_id)
  ))
  with check (exists (
    select 1 from public.poker_tables t
    where t.id = table_players.table_id and public.is_group_host(t.group_id)
  ));

drop policy if exists settlements_owner_all on public.settlements;
drop policy if exists settlements_group_read on public.settlements;
create policy settlements_group_read on public.settlements
  for select to authenticated
  using (exists (
    select 1 from public.poker_tables t
    where t.id = settlements.table_id and public.is_group_member(t.group_id)
  ));

drop policy if exists settlements_group_write on public.settlements;
create policy settlements_group_write on public.settlements
  for all to authenticated
  using (exists (
    select 1 from public.poker_tables t
    where t.id = settlements.table_id and public.is_group_host(t.group_id)
  ))
  with check (exists (
    select 1 from public.poker_tables t
    where t.id = settlements.table_id and public.is_group_host(t.group_id)
  ));

-- ---------------------------------------------------------------------------
-- 9.4 Criar grupo, pedir entrada, aprovar
--     Tudo `security definer` porque quem pede entrada ainda não é do grupo e,
--     pelo RLS, não enxerga nem o nome dele.
-- ---------------------------------------------------------------------------
create or replace function public.create_group(p_name text)
returns public.groups
language plpgsql
security definer
set search_path = public
as $$
declare
  g public.groups;
begin
  if auth.uid() is null then
    raise exception 'sem sessão';
  end if;

  insert into groups (name, created_by)
  values (coalesce(nullif(trim(p_name), ''), 'Meu grupo'), auth.uid())
  returning * into g;

  insert into group_members (group_id, user_id, role)
  values (g.id, auth.uid(), 'owner');

  return g;
end;
$$;

-- Com o código na mão dá para ver o nome do grupo e os jogadores ainda sem
-- dono, para escolher quem se representa. Nada de saldo, mesa ou histórico.
create or replace function public.find_group_by_code(p_code text)
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', g.id,
    'name', g.name,
    'players', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name) order by p.name)
      from players p
      where p.group_id = g.id
        and not exists (
          select 1 from group_members m
          where m.group_id = g.id and m.player_id = p.id
        )
    ), '[]'::jsonb),
    'already_member', exists (
      select 1 from group_members m where m.group_id = g.id and m.user_id = auth.uid()
    ),
    'pending', exists (
      select 1 from group_join_requests r
      where r.group_id = g.id and r.user_id = auth.uid() and r.status = 'pending'
    )
  )
  from groups g
  where upper(g.invite_code) = upper(trim(p_code));
$$;

create or replace function public.request_group_join(
  p_code text,
  p_player_id uuid,
  p_player_name text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  g groups;
begin
  if auth.uid() is null then
    raise exception 'sem sessão';
  end if;

  select * into g from groups where upper(invite_code) = upper(trim(p_code));
  if g.id is null then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  if exists (select 1 from group_members m where m.group_id = g.id and m.user_id = auth.uid()) then
    return jsonb_build_object('ok', false, 'reason', 'already_member');
  end if;

  if p_player_id is not null and not exists (
    select 1 from players p where p.id = p_player_id and p.group_id = g.id
  ) then
    return jsonb_build_object('ok', false, 'reason', 'bad_player');
  end if;

  if p_player_id is null and nullif(trim(coalesce(p_player_name, '')), '') is null then
    return jsonb_build_object('ok', false, 'reason', 'no_player');
  end if;

  insert into group_join_requests (group_id, user_id, email, player_id, player_name)
  values (
    g.id, auth.uid(),
    (select u.email from auth.users u where u.id = auth.uid()),
    p_player_id, nullif(trim(coalesce(p_player_name, '')), '')
  )
  on conflict (group_id, user_id) where status = 'pending'
  do update set
    player_id = excluded.player_id,
    player_name = excluded.player_name,
    created_at = now();

  return jsonb_build_object('ok', true, 'group_name', g.name);
end;
$$;

create or replace function public.approve_join_request(p_request uuid, p_role text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r group_join_requests;
  pid uuid;
  wanted text;
begin
  select * into r from group_join_requests where id = p_request;
  if r.id is null then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  if not is_group_host(r.group_id) then
    raise exception 'sem permissão';
  end if;
  if r.status <> 'pending' then
    return jsonb_build_object('ok', false, 'reason', 'decided');
  end if;

  -- Só o dono do grupo entrega o crachá de host.
  wanted := case
    when p_role = 'host' and is_group_owner(r.group_id) then 'host'
    else 'member'
  end;

  pid := r.player_id;
  if pid is null and r.player_name is not null then
    select p.id into pid
    from players p
    where p.group_id = r.group_id and lower(trim(p.name)) = lower(trim(r.player_name));

    if pid is null then
      insert into players (owner_id, group_id, name)
      values (auth.uid(), r.group_id, trim(r.player_name))
      returning id into pid;
    end if;
  end if;

  insert into group_members (group_id, user_id, player_id, role)
  values (r.group_id, r.user_id, pid, wanted)
  on conflict (group_id, user_id) do update set player_id = excluded.player_id;

  update group_join_requests
     set status = 'approved', decided_at = now(), decided_by = auth.uid()
   where id = p_request;

  return jsonb_build_object('ok', true, 'role', wanted);
end;
$$;

create or replace function public.reject_join_request(p_request uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  r group_join_requests;
begin
  select * into r from group_join_requests where id = p_request;
  if r.id is null then
    return false;
  end if;
  if not is_group_host(r.group_id) then
    raise exception 'sem permissão';
  end if;

  update group_join_requests
     set status = 'rejected', decided_at = now(), decided_by = auth.uid()
   where id = p_request;
  return true;
end;
$$;

-- Promover a host / voltar a membro. O dono não se rebaixa nem é rebaixado.
create or replace function public.set_member_role(p_member uuid, p_role text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  m group_members;
begin
  select * into m from group_members where id = p_member;
  if m.id is null then
    return false;
  end if;
  if not is_group_owner(m.group_id) then
    raise exception 'só o dono do grupo muda permissões';
  end if;
  if m.role = 'owner' or p_role not in ('host', 'member') then
    return false;
  end if;

  update group_members set role = p_role where id = p_member;
  return true;
end;
$$;

revoke all on function public.create_group(text) from public;
revoke all on function public.find_group_by_code(text) from public;
revoke all on function public.request_group_join(text, uuid, text) from public;
revoke all on function public.approve_join_request(uuid, text) from public;
revoke all on function public.reject_join_request(uuid) from public;
revoke all on function public.set_member_role(uuid, text) from public;

grant execute on function public.create_group(text) to authenticated;
grant execute on function public.find_group_by_code(text) to authenticated;
grant execute on function public.request_group_join(text, uuid, text) to authenticated;
grant execute on function public.approve_join_request(uuid, text) to authenticated;
grant execute on function public.reject_join_request(uuid) to authenticated;
grant execute on function public.set_member_role(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 9.5 Foto do grupo e "quem sou eu aqui"
--     Duas faltas que apareceram no uso: o grupo não tinha cara nenhuma na
--     lista, e quem criou o grupo ficava sem jogador vinculado — dava para ver
--     o elenco todo, mas não para dizer qual daqueles nomes é você.
-- ---------------------------------------------------------------------------
-- A foto vem embutida aqui mesmo, como data URI (`data:image/jpeg;base64,…`),
-- e não como link para fora: link quebra quando o site sai do ar e obriga a
-- pessoa a hospedar a imagem antes. O navegador reduz e recomprime para ~150 KB
-- em `lib/groupPhoto.js`; o CHECK abaixo é a rede de proteção do banco, com
-- folga sobre esse alvo, para nenhuma linha virar um monstro de vários MB.
alter table public.groups
  add column if not exists image_url text;

alter table public.groups
  drop constraint if exists groups_image_size;

alter table public.groups
  add constraint groups_image_size
  check (image_url is null or length(image_url) <= 300000);

-- Cada um diz qual jogador do elenco é; host arruma o de qualquer um (útil
-- quando alguém entrou representando a pessoa errada). Precisa ser
-- `security definer` porque group_members só aceita update do dono do grupo.
create or replace function public.set_member_player(p_member uuid, p_player uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  m group_members;
begin
  select * into m from group_members where id = p_member;
  if m.id is null then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  if m.user_id <> auth.uid() and not is_group_host(m.group_id) then
    raise exception 'sem permissão';
  end if;

  if p_player is not null then
    if not exists (
      select 1 from players p where p.id = p_player and p.group_id = m.group_id
    ) then
      return jsonb_build_object('ok', false, 'reason', 'bad_player');
    end if;

    -- Dois membros não podem ser o mesmo jogador: o histórico deixaria de bater.
    if exists (
      select 1 from group_members o
      where o.group_id = m.group_id and o.player_id = p_player and o.id <> m.id
    ) then
      return jsonb_build_object('ok', false, 'reason', 'taken');
    end if;
  end if;

  update group_members set player_id = p_player where id = p_member;
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.set_member_player(uuid, uuid) from public;
grant execute on function public.set_member_player(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 10. Perfis
--     Até aqui uma conta era só um e-mail. O perfil dá nome, sobrenome e foto
--     a quem joga, e é o que permite abrir "a página" de alguém do grupo.
--     Uma linha por conta; quem está no elenco mas nunca criou conta continua
--     sem perfil, e a tela mostra isso como "(sem perfil)".
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  first_name  text,
  last_name   text,
  -- Mesma ideia da foto do grupo: data URI na própria linha, reduzida no
  -- navegador. O CHECK é a rede de proteção.
  photo       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.profiles
  drop constraint if exists profiles_photo_size;

alter table public.profiles
  add constraint profiles_photo_size
  check (photo is null or length(photo) <= 300000);

-- Quem enxerga o perfil de quem: você mesmo e quem divide algum grupo com você.
-- `security definer` de novo, para a política não depender do RLS de
-- group_members ao consultar group_members.
create or replace function public.shares_group_with(p_user uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select p_user = auth.uid() or exists (
    select 1
    from group_members me
    join group_members them on them.group_id = me.group_id
    where me.user_id = auth.uid() and them.user_id = p_user
  );
$$;

alter table public.profiles enable row level security;

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles
  for select to authenticated
  using (public.shares_group_with(id));

drop policy if exists profiles_self_insert on public.profiles;
create policy profiles_self_insert on public.profiles
  for insert to authenticated
  with check (id = (select auth.uid()));

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- O perfil nasce junto com a conta. Feito por gatilho, e não pelo app, porque
-- o login com Google não passa pela tela de cadastro — ali o nome e a foto vêm
-- nos metadados que o próprio Google manda.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  full_name text := coalesce(meta ->> 'full_name', meta ->> 'name', '');
  first text := nullif(trim(meta ->> 'first_name'), '');
  last text := nullif(trim(meta ->> 'last_name'), '');
begin
  -- Sem nome separado (caso do Google), quebra o nome completo no primeiro
  -- espaço: o que vem antes é o nome, o resto é sobrenome.
  if first is null and full_name <> '' then
    first := nullif(trim(split_part(full_name, ' ', 1)), '');
    last := nullif(trim(substr(full_name, length(split_part(full_name, ' ', 1)) + 2)), '');
  end if;

  insert into public.profiles (id, first_name, last_name, photo)
  values (new.id, first, last, nullif(trim(meta ->> 'avatar_url'), ''))
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Contas que já existiam antes dos perfis.
insert into public.profiles (id, first_name, last_name)
select
  u.id,
  nullif(trim(split_part(coalesce(u.raw_user_meta_data ->> 'full_name',
                                  u.raw_user_meta_data ->> 'name', ''), ' ', 1)), ''),
  nullif(trim(substr(coalesce(u.raw_user_meta_data ->> 'full_name',
                              u.raw_user_meta_data ->> 'name', ''),
              length(split_part(coalesce(u.raw_user_meta_data ->> 'full_name',
                                         u.raw_user_meta_data ->> 'name', ''), ' ', 1)) + 2)), '')
from auth.users u
on conflict (id) do nothing;

revoke all on function public.shares_group_with(uuid) from public;
grant execute on function public.shares_group_with(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 11. Chave pix no perfil
--     Quem perdeu abre o acerto e precisa da chave de quem vai receber. Sem
--     isso o acerto acabava no WhatsApp, com alguém ditando a chave. Fica no
--     perfil (não na mesa) porque é da pessoa, não da noite.
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists pix_key text;

alter table public.profiles
  drop constraint if exists profiles_pix_size;

-- Chave aleatória tem 36, e-mail vai até 77. 140 dá folga sem virar campo livre.
alter table public.profiles
  add constraint profiles_pix_size
  check (pix_key is null or length(pix_key) <= 140);

-- A tela pública do acerto passa a receber a chave de cada jogador junto com a
-- mesa. É `security definer`, então enxerga o perfil que o convidado anônimo
-- não enxergaria — de propósito: quem tem o link do acerto é justamente quem
-- precisa pagar. A chave só sai para jogador daquela mesa que tenha conta no
-- grupo e tenha cadastrado uma.
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
        'adjustment', tp.adjustment, 'position', tp.position,
        'pix_key', (
          select pr.pix_key
          from group_members gm
          join profiles pr on pr.id = gm.user_id
          where gm.group_id = t.group_id
            and gm.player_id = tp.player_id
          limit 1
        )
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
-- 12. Dois jogadores com o mesmo nome
--     Todo grupo tem dois Andrés. Até aqui o segundo simplesmente não entrava:
--     o índice único por (grupo, nome) recusava, e as estatísticas — que somam
--     por nome — juntariam as noites dos dois numa linha só.
--     O apelido resolve os dois problemas de uma vez, porque ele entra no nome
--     que fica gravado na mesa: "André (Careca)".
-- ---------------------------------------------------------------------------
alter table public.players
  add column if not exists nickname text;

-- A unicidade passa a ser do par nome+apelido: dois Andrés convivem desde que
-- pelo menos um tenha apelido, e continua impossível cadastrar o mesmo duas
-- vezes por engano.
drop index if exists public.players_group_name_idx;
create unique index if not exists players_group_name_nick_idx
  on public.players (
    group_id,
    lower(trim(name)),
    lower(trim(coalesce(nickname, '')))
  );

-- Quem chega pelo código de convite precisa ver o apelido também, senão escolhe
-- o André errado na hora de dizer quem é.
create or replace function public.find_group_by_code(p_code text)
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', g.id,
    'name', g.name,
    'players', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'name', p.name || case
          when nullif(trim(coalesce(p.nickname, '')), '') is null then ''
          else ' (' || trim(p.nickname) || ')'
        end
      ) order by p.name)
      from players p
      where p.group_id = g.id
        and not exists (
          select 1 from group_members m
          where m.group_id = g.id and m.player_id = p.id
        )
    ), '[]'::jsonb),
    'already_member', exists (
      select 1 from group_members m where m.group_id = g.id and m.user_id = auth.uid()
    ),
    'pending', exists (
      select 1 from group_join_requests r
      where r.group_id = g.id and r.user_id = auth.uid() and r.status = 'pending'
    )
  )
  from groups g
  where upper(g.invite_code) = upper(trim(p_code));
$$;

grant execute on function public.find_group_by_code(text) to authenticated;
