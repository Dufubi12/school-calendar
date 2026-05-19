-- =====================================================================
-- teacher_time_grid — кастомная сетка временных интервалов педагога
-- =====================================================================
--
-- Используется на странице «Инд. занятия» вместо захардкоженной
-- сетки 08:00-22:00 по часам. Каждый педагог может добавлять/удалять
-- свои интервалы (например 08:30-09:30, 16:30-17:30 и т.д.).
--
-- Если у педагога нет ни одной записи — фронт показывает дефолтную
-- почасовую сетку 08-22 как fallback.
-- =====================================================================

create table if not exists teacher_time_grid (
    id bigserial primary key,
    teacher_id integer not null references teachers(id) on delete cascade,
    start_time text not null, -- 'HH:MM'
    end_time text not null,   -- 'HH:MM'
    created_at timestamptz default now()
);

create unique index if not exists teacher_time_grid_uniq
    on teacher_time_grid (teacher_id, start_time, end_time);
create index if not exists teacher_time_grid_teacher_idx
    on teacher_time_grid (teacher_id);

-- RLS — те же правила что и individual_slots:
-- read: все аутентифицированные
-- write: админ — всех; учитель — только своё
alter table teacher_time_grid enable row level security;

drop policy if exists "ttg_read" on teacher_time_grid;
create policy "ttg_read" on teacher_time_grid
    for select using (auth.role() = 'authenticated');

drop policy if exists "ttg_admin_write" on teacher_time_grid;
create policy "ttg_admin_write" on teacher_time_grid
    for all using (is_admin()) with check (is_admin());

drop policy if exists "ttg_own_write" on teacher_time_grid;
create policy "ttg_own_write" on teacher_time_grid
    for all using (teacher_id = my_teacher_id())
    with check (teacher_id = my_teacher_id());
