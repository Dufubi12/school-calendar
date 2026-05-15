-- =====================================================================
-- Доп. оплата педагогов: ставки + ежемесячные данные
-- =====================================================================

-- 1. Defaults (singleton row, id=1)
create table if not exists extra_pay_defaults (
    id integer primary key default 1 check (id = 1),
    schedule_ns integer not null default 375,
    schedule_ss integer not null default 500,
    lesson_assembly integer not null default 125,
    other_hourly integer not null default 250,
    updated_at timestamptz default now()
);
insert into extra_pay_defaults (id) values (1) on conflict do nothing;

-- 2. Per-teacher rate overrides (sparse — only filled when teacher has custom rate)
create table if not exists extra_pay_rates (
    teacher_id integer primary key references teachers(id) on delete cascade,
    schedule_ns integer,
    schedule_ss integer,
    lesson_assembly integer,
    other_hourly integer,
    updated_at timestamptz default now()
);

-- 3. Per-month entries
create table if not exists extra_pay_entries (
    teacher_id integer not null references teachers(id) on delete cascade,
    period text not null,
    schedule_cycles integer not null default 0,
    lesson_assembly_count integer not null default 0,
    other_hours numeric(5,1) not null default 0,
    note text,
    updated_at timestamptz default now(),
    primary key (teacher_id, period)
);
create index if not exists extra_pay_entries_period_idx on extra_pay_entries(period);

-- =====================================================================
-- RLS
-- =====================================================================

alter table extra_pay_defaults enable row level security;
alter table extra_pay_rates enable row level security;
alter table extra_pay_entries enable row level security;

-- Defaults: read by any authenticated user, write only admin
drop policy if exists "extra_pay_defaults_read" on extra_pay_defaults;
create policy "extra_pay_defaults_read" on extra_pay_defaults
    for select using (auth.role() = 'authenticated');

drop policy if exists "extra_pay_defaults_admin_write" on extra_pay_defaults;
create policy "extra_pay_defaults_admin_write" on extra_pay_defaults
    for all using (is_admin()) with check (is_admin());

-- Rates: read by any authenticated, write by admin OR by the teacher themselves
drop policy if exists "extra_pay_rates_read" on extra_pay_rates;
create policy "extra_pay_rates_read" on extra_pay_rates
    for select using (auth.role() = 'authenticated');

drop policy if exists "extra_pay_rates_admin_write" on extra_pay_rates;
create policy "extra_pay_rates_admin_write" on extra_pay_rates
    for all using (is_admin()) with check (is_admin());

drop policy if exists "extra_pay_rates_own_write" on extra_pay_rates;
create policy "extra_pay_rates_own_write" on extra_pay_rates
    for all using (teacher_id = my_teacher_id())
    with check (teacher_id = my_teacher_id());

-- Entries: teacher reads/writes own, admin reads/writes all
drop policy if exists "extra_pay_entries_read" on extra_pay_entries;
create policy "extra_pay_entries_read" on extra_pay_entries
    for select using (is_admin() or teacher_id = my_teacher_id());

drop policy if exists "extra_pay_entries_admin_write" on extra_pay_entries;
create policy "extra_pay_entries_admin_write" on extra_pay_entries
    for all using (is_admin()) with check (is_admin());

drop policy if exists "extra_pay_entries_own_write" on extra_pay_entries;
create policy "extra_pay_entries_own_write" on extra_pay_entries
    for all using (teacher_id = my_teacher_id())
    with check (teacher_id = my_teacher_id());
