-- =====================================================================
-- Индивидуальные слоты педагогов (ИЗ) — миграция из localStorage в БД
-- =====================================================================
--
-- Модель:
--   individual_slots — почасовая сетка доступности по дням недели
--                       (Пн-Вс × 08:00-22:00 × free/busy)
--   individual_slot_descriptions — описание педагога (предметы, ОГЭ/ЕГЭ)
-- =====================================================================

-- 1. Описание педагога (что преподаёт в индивидуальном формате)
create table if not exists individual_slot_descriptions (
    teacher_id integer primary key references teachers(id) on delete cascade,
    description text,
    updated_at timestamptz default now()
);

-- 2. Слоты (повторяемые по дням недели)
create table if not exists individual_slots (
    teacher_id integer not null references teachers(id) on delete cascade,
    day text not null,         -- 'пн' | 'вт' | 'ср' | 'чт' | 'пт' | 'сб' | 'вс'
    time_slot text not null,   -- 'HH:00-HH:00'
    status text not null check (status in ('free', 'busy')),
    updated_at timestamptz default now(),
    primary key (teacher_id, day, time_slot)
);

create index if not exists individual_slots_teacher_idx on individual_slots(teacher_id);
create index if not exists individual_slots_day_idx on individual_slots(day);

-- =====================================================================
-- RLS
-- =====================================================================

alter table individual_slot_descriptions enable row level security;
alter table individual_slots enable row level security;

-- Descriptions: read all auth; write admin or own teacher_id
drop policy if exists "iz_desc_read" on individual_slot_descriptions;
create policy "iz_desc_read" on individual_slot_descriptions
    for select using (auth.role() = 'authenticated');

drop policy if exists "iz_desc_admin_write" on individual_slot_descriptions;
create policy "iz_desc_admin_write" on individual_slot_descriptions
    for all using (is_admin()) with check (is_admin());

drop policy if exists "iz_desc_own_write" on individual_slot_descriptions;
create policy "iz_desc_own_write" on individual_slot_descriptions
    for all using (teacher_id = my_teacher_id())
    with check (teacher_id = my_teacher_id());

-- Slots: read all auth; write admin or own teacher_id
drop policy if exists "iz_slots_read" on individual_slots;
create policy "iz_slots_read" on individual_slots
    for select using (auth.role() = 'authenticated');

drop policy if exists "iz_slots_admin_write" on individual_slots;
create policy "iz_slots_admin_write" on individual_slots
    for all using (is_admin()) with check (is_admin());

drop policy if exists "iz_slots_own_write" on individual_slots;
create policy "iz_slots_own_write" on individual_slots
    for all using (teacher_id = my_teacher_id())
    with check (teacher_id = my_teacher_id());
