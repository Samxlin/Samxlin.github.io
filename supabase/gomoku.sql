create extension if not exists pgcrypto;

create table if not exists public.gomoku_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  black_id uuid not null references auth.users(id) on delete cascade,
  white_id uuid references auth.users(id) on delete set null,
  moves jsonb not null default '[]'::jsonb,
  turn smallint not null default 1 check (turn in (1, 2)),
  winner smallint not null default 0 check (winner in (0, 1, 2, 3)),
  undo_requested_by uuid references auth.users(id) on delete set null,
  round integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.gomoku_rooms add column if not exists undo_requested_by uuid references auth.users(id) on delete set null;

alter table public.gomoku_rooms enable row level security;

drop policy if exists "players can read their rooms" on public.gomoku_rooms;
create policy "players can read their rooms"
on public.gomoku_rooms for select
to authenticated
using (auth.uid() = black_id or auth.uid() = white_id);

create or replace function public.gomoku_has_won(p_moves jsonb, p_row integer, p_col integer, p_player integer)
returns boolean
language plpgsql
immutable
set search_path = public
as $$
declare
  direction integer[];
  sign integer;
  step integer;
  count integer;
  target_row integer;
  target_col integer;
begin
  foreach direction slice 1 in array array[[1,0],[0,1],[1,1],[1,-1]]
  loop
    count := 1;
    foreach sign in array array[-1,1]
    loop
      step := 1;
      loop
        target_row := p_row + direction[1] * sign * step;
        target_col := p_col + direction[2] * sign * step;
        exit when not exists (
          select 1 from jsonb_array_elements(p_moves) move
          where (move->>'row')::integer = target_row
            and (move->>'col')::integer = target_col
            and (move->>'player')::integer = p_player
        );
        count := count + 1;
        step := step + 1;
      end loop;
    end loop;
    if count >= 5 then return true; end if;
  end loop;
  return false;
end;
$$;

create or replace function public.create_gomoku_room()
returns public.gomoku_rooms
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.gomoku_rooms;
  room_code text;
begin
  if auth.uid() is null then raise exception '请先登录'; end if;
  loop
    room_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    exit when not exists (select 1 from public.gomoku_rooms where code = room_code);
  end loop;
  insert into public.gomoku_rooms (code, black_id)
  values (room_code, auth.uid())
  returning * into result;
  return result;
end;
$$;

create or replace function public.join_gomoku_room(p_code text)
returns public.gomoku_rooms
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.gomoku_rooms;
begin
  if auth.uid() is null then raise exception '请先登录'; end if;
  select * into result
  from public.gomoku_rooms
  where code = upper(trim(p_code))
    and (white_id is null or white_id = auth.uid() or black_id = auth.uid())
  for update;
  if result.id is null then raise exception '房间不存在或已满'; end if;
  if result.black_id <> auth.uid() and result.white_id is null then
    update public.gomoku_rooms
    set white_id = auth.uid(), updated_at = now()
    where id = result.id
    returning * into result;
  end if;
  return result;
end;
$$;

create or replace function public.play_gomoku_move(p_room_id uuid, p_row integer, p_col integer)
returns public.gomoku_rooms
language plpgsql
security definer
set search_path = public
as $$
declare
  room public.gomoku_rooms;
  player smallint;
  next_moves jsonb;
  next_winner smallint := 0;
begin
  select * into room from public.gomoku_rooms where id = p_room_id for update;
  if room.id is null then raise exception '房间不存在'; end if;
  if room.white_id is null then raise exception '请等待对手加入'; end if;
  if room.winner <> 0 then raise exception '本局已经结束'; end if;
  if p_row not between 0 and 14 or p_col not between 0 and 14 then raise exception '无效坐标'; end if;
  player := case when auth.uid() = room.black_id then 1 when auth.uid() = room.white_id then 2 else 0 end;
  if player = 0 then raise exception '你不是该房间的玩家'; end if;
  if player <> room.turn then raise exception '还没轮到你'; end if;
  if exists (
    select 1 from jsonb_array_elements(room.moves) move
    where (move->>'row')::integer = p_row and (move->>'col')::integer = p_col
  ) then raise exception '这里已经有棋子'; end if;

  next_moves := room.moves || jsonb_build_array(jsonb_build_object('row', p_row, 'col', p_col, 'player', player));
  if public.gomoku_has_won(next_moves, p_row, p_col, player) then
    next_winner := player;
  elsif jsonb_array_length(next_moves) = 225 then
    next_winner := 3;
  end if;

  update public.gomoku_rooms
  set moves = next_moves,
      turn = case when player = 1 then 2 else 1 end,
      winner = next_winner,
      undo_requested_by = null,
      updated_at = now()
  where id = room.id
  returning * into room;
  return room;
end;
$$;

create or replace function public.request_gomoku_undo(p_room_id uuid)
returns public.gomoku_rooms
language plpgsql
security definer
set search_path = public
as $$
declare
  room public.gomoku_rooms;
  last_player smallint;
begin
  select * into room from public.gomoku_rooms where id = p_room_id for update;
  if room.id is null or auth.uid() not in (room.black_id, room.white_id) then raise exception '无法申请悔棋'; end if;
  if room.winner <> 0 or jsonb_array_length(room.moves) = 0 then raise exception '当前不能悔棋'; end if;
  if room.undo_requested_by is not null then raise exception '已有待处理的悔棋申请'; end if;
  last_player := (room.moves -> (jsonb_array_length(room.moves) - 1) ->> 'player')::smallint;
  if (last_player = 1 and auth.uid() <> room.black_id) or (last_player = 2 and auth.uid() <> room.white_id) then
    raise exception '只能撤回自己刚落下的一子';
  end if;
  update public.gomoku_rooms set undo_requested_by = auth.uid(), updated_at = now()
  where id = room.id returning * into room;
  return room;
end;
$$;

create or replace function public.respond_gomoku_undo(p_room_id uuid, p_accept boolean)
returns public.gomoku_rooms
language plpgsql
security definer
set search_path = public
as $$
declare
  room public.gomoku_rooms;
  last_player smallint;
begin
  select * into room from public.gomoku_rooms where id = p_room_id for update;
  if room.id is null or auth.uid() not in (room.black_id, room.white_id) then raise exception '无法处理悔棋'; end if;
  if room.undo_requested_by is null or room.undo_requested_by = auth.uid() then raise exception '没有需要你处理的申请'; end if;
  if p_accept then
    last_player := (room.moves -> (jsonb_array_length(room.moves) - 1) ->> 'player')::smallint;
    update public.gomoku_rooms
    set moves = room.moves - (jsonb_array_length(room.moves) - 1),
        turn = last_player,
        winner = 0,
        undo_requested_by = null,
        updated_at = now()
    where id = room.id returning * into room;
  else
    update public.gomoku_rooms set undo_requested_by = null, updated_at = now()
    where id = room.id returning * into room;
  end if;
  return room;
end;
$$;

create or replace function public.restart_gomoku_room(p_room_id uuid)
returns public.gomoku_rooms
language plpgsql
security definer
set search_path = public
as $$
declare
  room public.gomoku_rooms;
begin
  update public.gomoku_rooms
  set black_id = case
        when winner = 1 then white_id
        when winner = 2 then black_id
        when winner = 3 then white_id
        else black_id
      end,
      white_id = case
        when winner = 1 then black_id
        when winner = 2 then white_id
        when winner = 3 then black_id
        else white_id
      end,
      moves = '[]'::jsonb,
      turn = 1,
      winner = 0,
      undo_requested_by = null,
      round = round + 1,
      updated_at = now()
  where id = p_room_id and auth.uid() in (black_id, white_id)
  returning * into room;
  if room.id is null then raise exception '无法重新开始'; end if;
  return room;
end;
$$;

revoke all on public.gomoku_rooms from anon, authenticated;
grant select on public.gomoku_rooms to authenticated;
grant execute on function public.create_gomoku_room() to authenticated;
grant execute on function public.join_gomoku_room(text) to authenticated;
grant execute on function public.play_gomoku_move(uuid, integer, integer) to authenticated;
grant execute on function public.request_gomoku_undo(uuid) to authenticated;
grant execute on function public.respond_gomoku_undo(uuid, boolean) to authenticated;
grant execute on function public.restart_gomoku_room(uuid) to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.gomoku_rooms;
exception
  when duplicate_object then null;
end $$;
