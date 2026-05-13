-- =====================================================================
-- School Calendar — DB Schema
-- Run this in Supabase SQL Editor (Project → SQL Editor → New query)
-- =====================================================================

-- =====================================================================
-- 1. PROFILES — extends auth.users with role + teacher binding
-- =====================================================================
create table if not exists profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    email text unique not null,
    role text not null check (role in ('admin', 'teacher')) default 'teacher',
    teacher_id integer,                    -- null until linked to a teacher record
    full_name text,
    created_at timestamptz default now()
);

create index if not exists profiles_teacher_id_idx on profiles(teacher_id);

-- Auto-create profile row on user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
    insert into public.profiles (id, email, role)
    values (new.id, new.email, 'teacher');
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();

-- =====================================================================
-- 2. TEACHERS — list of teachers (seeded from mockData)
-- =====================================================================
create table if not exists teachers (
    id integer primary key,
    name text not null,
    subject text,
    grades jsonb default '[]'::jsonb
);

-- =====================================================================
-- 3. BELL SCHEDULE — lesson time slots
-- =====================================================================
create table if not exists bell_schedule (
    lesson_number integer primary key,
    start_time text not null,
    end_time text not null,
    label text not null
);

-- =====================================================================
-- 4. LESSONS — fixed weekly schedule (REAL_SCHEDULE from mockData)
-- =====================================================================
create table if not exists lessons (
    id bigserial primary key,
    class_name text not null,
    day_name text not null,                -- Понедельник, Вторник, ...
    time_slot text not null,               -- "09:00-09:45"
    subject text not null,
    teacher_last_name text,
    unique (class_name, day_name, time_slot, subject, teacher_last_name)
);

create index if not exists lessons_teacher_idx on lessons(teacher_last_name);
create index if not exists lessons_class_idx on lessons(class_name);

-- =====================================================================
-- 5. TEACHER RATES — payment per lesson, per teacher
-- =====================================================================
create table if not exists teacher_rates (
    teacher_id integer primary key references teachers(id) on delete cascade,
    rate integer not null default 500,
    updated_at timestamptz default now()
);

-- =====================================================================
-- 6. HOMEWORK CHECKS — daily counts of homework checked per teacher
-- =====================================================================
create table if not exists homework_checks (
    teacher_id integer not null references teachers(id) on delete cascade,
    check_date date not null,
    count integer not null check (count >= 0),
    updated_at timestamptz default now(),
    primary key (teacher_id, check_date)
);

create index if not exists homework_checks_date_idx on homework_checks(check_date);

-- =====================================================================
-- 7. HOMEWORK RATES — per-teacher rate for homework checks
-- =====================================================================
create table if not exists homework_rates (
    teacher_id integer primary key references teachers(id) on delete cascade,
    rate integer not null default 0,
    updated_at timestamptz default now()
);

-- =====================================================================
-- 8. LESSON TYPES — methodologist marks each lesson with type
-- =====================================================================
create table if not exists lesson_types (
    id bigserial primary key,
    class_name text not null,
    day_name text not null,
    time_slot text not null,
    teacher_last_name text not null,
    type text not null check (type in ('Групповой', 'Индивидуальный', 'ОГЭ', 'ЕГЭ', 'Тьюторский')),
    updated_at timestamptz default now(),
    unique (class_name, day_name, time_slot, teacher_last_name)
);

-- =====================================================================
-- 9. AVAILABILITY — teachers mark free / busy slots
-- =====================================================================
create table if not exists availability (
    teacher_id integer not null references teachers(id) on delete cascade,
    day_name text not null,
    time_slot text not null,
    status text not null check (status in ('free', 'busy')),
    updated_at timestamptz default now(),
    primary key (teacher_id, day_name, time_slot)
);

-- =====================================================================
-- 10. INVITATIONS — methodologist sends, teacher accepts/declines
-- =====================================================================
create table if not exists invitations (
    id bigserial primary key,
    teacher_id integer not null references teachers(id) on delete cascade,
    teacher_name text not null,
    invite_date date not null,
    time_slot text not null,
    subject text not null,
    grade text not null,
    note text,
    status text not null check (status in ('pending', 'accepted', 'declined')) default 'pending',
    created_at timestamptz default now(),
    responded_at timestamptz
);

create index if not exists invitations_teacher_idx on invitations(teacher_id);
create index if not exists invitations_status_idx on invitations(status);

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================

-- Helper: is current user admin?
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
    select coalesce(
        (select role = 'admin' from public.profiles where id = auth.uid()),
        false
    );
$$;

-- Helper: get current user's teacher_id
create or replace function public.my_teacher_id()
returns integer
language sql
security definer
stable
as $$
    select teacher_id from public.profiles where id = auth.uid();
$$;

-- Enable RLS
alter table profiles enable row level security;
alter table teachers enable row level security;
alter table bell_schedule enable row level security;
alter table lessons enable row level security;
alter table teacher_rates enable row level security;
alter table homework_checks enable row level security;
alter table homework_rates enable row level security;
alter table lesson_types enable row level security;
alter table availability enable row level security;
alter table invitations enable row level security;

-- ============= profiles =============
drop policy if exists "profiles_select_own_or_admin" on profiles;
create policy "profiles_select_own_or_admin" on profiles
    for select using (id = auth.uid() or is_admin());

drop policy if exists "profiles_update_own" on profiles;
create policy "profiles_update_own" on profiles
    for update using (id = auth.uid()) with check (id = auth.uid() and role = (select role from profiles where id = auth.uid()));

drop policy if exists "profiles_admin_all" on profiles;
create policy "profiles_admin_all" on profiles
    for all using (is_admin()) with check (is_admin());

-- ============= teachers (read for everyone authenticated, write admin) =============
drop policy if exists "teachers_read_auth" on teachers;
create policy "teachers_read_auth" on teachers
    for select using (auth.role() = 'authenticated');

drop policy if exists "teachers_admin_write" on teachers;
create policy "teachers_admin_write" on teachers
    for all using (is_admin()) with check (is_admin());

-- ============= bell_schedule (read auth, write admin) =============
drop policy if exists "bell_read_auth" on bell_schedule;
create policy "bell_read_auth" on bell_schedule
    for select using (auth.role() = 'authenticated');

drop policy if exists "bell_admin_write" on bell_schedule;
create policy "bell_admin_write" on bell_schedule
    for all using (is_admin()) with check (is_admin());

-- ============= lessons (read auth, write admin) =============
drop policy if exists "lessons_read_auth" on lessons;
create policy "lessons_read_auth" on lessons
    for select using (auth.role() = 'authenticated');

drop policy if exists "lessons_admin_write" on lessons;
create policy "lessons_admin_write" on lessons
    for all using (is_admin()) with check (is_admin());

-- ============= teacher_rates (admin only — teachers shouldn't see other rates) =============
drop policy if exists "rates_select_own_or_admin" on teacher_rates;
create policy "rates_select_own_or_admin" on teacher_rates
    for select using (is_admin() or teacher_id = my_teacher_id());

drop policy if exists "rates_admin_write" on teacher_rates;
create policy "rates_admin_write" on teacher_rates
    for all using (is_admin()) with check (is_admin());

-- ============= homework_checks (teacher own, admin all) =============
drop policy if exists "hw_checks_select" on homework_checks;
create policy "hw_checks_select" on homework_checks
    for select using (is_admin() or teacher_id = my_teacher_id());

drop policy if exists "hw_checks_insert" on homework_checks;
create policy "hw_checks_insert" on homework_checks
    for insert with check (is_admin() or teacher_id = my_teacher_id());

drop policy if exists "hw_checks_update" on homework_checks;
create policy "hw_checks_update" on homework_checks
    for update using (is_admin() or teacher_id = my_teacher_id());

drop policy if exists "hw_checks_delete" on homework_checks;
create policy "hw_checks_delete" on homework_checks
    for delete using (is_admin() or teacher_id = my_teacher_id());

-- ============= homework_rates (teacher read own, admin write all) =============
drop policy if exists "hw_rates_select" on homework_rates;
create policy "hw_rates_select" on homework_rates
    for select using (is_admin() or teacher_id = my_teacher_id());

drop policy if exists "hw_rates_admin_write" on homework_rates;
create policy "hw_rates_admin_write" on homework_rates
    for all using (is_admin()) with check (is_admin());

-- ============= lesson_types (read auth, write admin) =============
drop policy if exists "lesson_types_read" on lesson_types;
create policy "lesson_types_read" on lesson_types
    for select using (auth.role() = 'authenticated');

drop policy if exists "lesson_types_admin_write" on lesson_types;
create policy "lesson_types_admin_write" on lesson_types
    for all using (is_admin()) with check (is_admin());

-- ============= availability (teacher own, admin read all) =============
drop policy if exists "avail_select" on availability;
create policy "avail_select" on availability
    for select using (is_admin() or teacher_id = my_teacher_id());

drop policy if exists "avail_teacher_write_own" on availability;
create policy "avail_teacher_write_own" on availability
    for all using (teacher_id = my_teacher_id()) with check (teacher_id = my_teacher_id());

drop policy if exists "avail_admin_all" on availability;
create policy "avail_admin_all" on availability
    for all using (is_admin()) with check (is_admin());

-- ============= invitations (teacher own, admin all) =============
drop policy if exists "invites_select" on invitations;
create policy "invites_select" on invitations
    for select using (is_admin() or teacher_id = my_teacher_id());

drop policy if exists "invites_admin_insert" on invitations;
create policy "invites_admin_insert" on invitations
    for insert with check (is_admin());

drop policy if exists "invites_admin_delete" on invitations;
create policy "invites_admin_delete" on invitations
    for delete using (is_admin());

drop policy if exists "invites_teacher_respond" on invitations;
create policy "invites_teacher_respond" on invitations
    for update using (is_admin() or teacher_id = my_teacher_id())
    with check (is_admin() or teacher_id = my_teacher_id());
