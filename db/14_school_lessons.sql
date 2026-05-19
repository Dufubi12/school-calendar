-- =====================================================================
-- school_lessons — школьное расписание (групповые уроки)
-- =====================================================================
--
-- Раньше расписание жило статикой в src/data/mockData.js (REAL_SCHEDULE).
-- Теперь — в Supabase, с привязкой к датам и версионированием:
--
--   recurrence_pattern: 'weekly' | 'biweekly' | 'once'
--   effective_from:    дата начала действия записи
--   effective_to:      дата окончания (NULL = действует до сих пор)
--   single_date:       только для recurrence_pattern='once' (одиночный урок)
--
-- На дату X запись действует если:
--   effective_from <= X AND (effective_to IS NULL OR X <= effective_to)
--
-- Для weekly/biweekly расширение идёт от effective_from с шагом 7/14 дней
-- до effective_to. Для 'once' учитывается только single_date.
-- =====================================================================

create table if not exists school_lessons (
    id bigserial primary key,
    teacher_id integer references teachers(id) on delete set null,
    class_name text not null,                -- '7А', '8Б', и т.д.
    subject text not null,                   -- 'Математика', 'Русский язык', и т.д.
    day_of_week text not null,               -- 'Понедельник'..'Воскресенье'
    time_slot text not null,                 -- '09:00-09:45'
    recurrence_pattern text not null default 'weekly',
    single_date date,                        -- only for recurrence='once'
    effective_from date not null default current_date,
    effective_to date,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

alter table school_lessons drop constraint if exists school_lessons_recurrence_check;
alter table school_lessons add constraint school_lessons_recurrence_check check (
    recurrence_pattern in ('once', 'weekly', 'biweekly')
);

alter table school_lessons drop constraint if exists school_lessons_dow_check;
alter table school_lessons add constraint school_lessons_dow_check check (
    day_of_week in ('Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье')
);

create index if not exists school_lessons_class_idx on school_lessons(class_name);
create index if not exists school_lessons_teacher_idx on school_lessons(teacher_id);
create index if not exists school_lessons_dow_idx on school_lessons(day_of_week);
create index if not exists school_lessons_effective_idx on school_lessons(effective_from, effective_to);

-- RLS
alter table school_lessons enable row level security;

drop policy if exists "school_lessons_read" on school_lessons;
create policy "school_lessons_read" on school_lessons
    for select using (auth.role() = 'authenticated');

drop policy if exists "school_lessons_admin_write" on school_lessons;
create policy "school_lessons_admin_write" on school_lessons
    for all using (is_admin()) with check (is_admin());
