-- Execute in Supabase SQL Editor. Admin emails below are the two previously authorized accounts.
create extension if not exists pgcrypto;
create table if not exists public.club_admin_emails (email text primary key check (email=lower(email)));
create or replace function public.is_club_admin() returns boolean language sql stable security definer set search_path = '' as $$
 select exists (
  select 1 from auth.users u join public.club_admin_emails e on lower(u.email)=e.email
  where u.id=(select auth.uid()) and u.email_confirmed_at is not null
 );
$$;
revoke all on function public.is_club_admin() from public;
grant execute on function public.is_club_admin() to anon, authenticated;
alter table public.club_admin_emails enable row level security;
create policy "Admins see approved emails" on public.club_admin_emails for select to authenticated using (public.is_club_admin());
create or replace function public.grant_club_admin(p_email text) returns void language plpgsql security definer set search_path = '' as $$
begin
 if not public.is_club_admin() then raise exception 'Unauthorized'; end if;
 if p_email is null or length(p_email)>254 or p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Invalid email';end if;
 insert into public.club_admin_emails(email) values(lower(trim(p_email))) on conflict do nothing;
end;
$$;
revoke all on function public.grant_club_admin(text) from public, anon;
grant execute on function public.grant_club_admin(text) to authenticated;

create table if not exists public.site_records (
 id text primary key, kind text not null check (kind in ('group','lesson','notice','poll','club','site','page','registration')),
 data jsonb not null, created timestamptz not null default now()
);
create index if not exists site_records_kind_created on public.site_records(kind,created desc);
alter table public.site_records enable row level security;
create policy "Public content" on public.site_records for select to anon,authenticated
 using (kind in ('group','lesson','notice','poll','club','site','page') or public.is_club_admin());
create policy "Admin inserts" on public.site_records for insert to authenticated with check(public.is_club_admin());
create policy "Admin edits" on public.site_records for update to authenticated using(public.is_club_admin()) with check(public.is_club_admin());
create policy "Admin deletes" on public.site_records for delete to authenticated using(public.is_club_admin());

create table if not exists public.votes (
 id uuid primary key default gen_random_uuid(), poll_id text not null, voter uuid not null, answer integer not null,
 unique (poll_id,voter)
);
alter table public.votes enable row level security;
create policy "Admin poll results" on public.votes for select to authenticated using(public.is_club_admin());

create or replace function public.register_dancer(p_name text,p_email text,p_phone text,p_group_id text,p_note text,p_consent boolean)
 returns void language plpgsql security definer set search_path = '' as $$
begin
 if p_consent is distinct from true or length(trim(coalesce(p_name,''))) not between 2 and 150
    or length(coalesce(p_email,''))>200 or p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or length(coalesce(p_phone,'')) not between 6 and 40 or length(coalesce(p_note,''))>2000 then raise exception 'Invalid registration'; end if;
 if p_group_id is null or p_group_id not in ('gaitani','rozeta','formation','advanced','teen','children','modern','singing')
    and not exists(select 1 from public.site_records where id=p_group_id and kind='group' and coalesce(data->>'hidden','false')<>'true') then raise exception 'Invalid group';end if;
 if exists(select 1 from public.site_records where id=p_group_id and kind='group' and data->>'hidden'='true') then raise exception 'Invalid group';end if;
 insert into public.site_records(id,kind,data) values(gen_random_uuid()::text,'registration',pg_catalog.jsonb_build_object('name',trim(p_name),'email',p_email,'phone',p_phone,'group',p_group_id,'note',coalesce(p_note,''),'status','Нова'));
end;
$$;
revoke all on function public.register_dancer(text,text,text,text,text,boolean) from public;
grant execute on function public.register_dancer(text,text,text,text,text,boolean) to anon,authenticated;

create or replace function public.submit_vote(p_poll_id text,p_answer integer,p_voter uuid)
 returns void language plpgsql security definer set search_path = '' as $$
declare choices jsonb;
begin
 select data->'options' into choices from public.site_records where id=p_poll_id and kind='poll' and data->>'active'='true';
 if choices is null or p_voter is null or p_answer is null or p_answer<0 or p_answer>=jsonb_array_length(choices) then raise exception 'Invalid vote';end if;
 insert into public.votes(poll_id,voter,answer) values(p_poll_id,p_voter,p_answer)
 on conflict(poll_id,voter) do update set answer=excluded.answer;
end;
$$;
revoke all on function public.submit_vote(text,integer,uuid) from public;
grant execute on function public.submit_vote(text,integer,uuid) to anon,authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values ('club-media','club-media',true,52428800,array['image/jpeg','image/png','image/webp','video/mp4','video/webm','video/quicktime'])
 on conflict (id) do nothing;
create policy "Administrators upload club media" on storage.objects for insert to authenticated
 with check(bucket_id='club-media' and public.is_club_admin());
create policy "Administrators remove club media" on storage.objects for delete to authenticated
 using(bucket_id='club-media' and public.is_club_admin());
