-- =====================================================================
-- Расширение individual_slots: поддержка разовых событий и кастомного времени
-- =====================================================================
--
-- single_date: если NULL → слот повторяется каждую неделю по `day`.
--              если задана дата → слот одноразовый, на эту дату.
-- =====================================================================

-- 1. Добавляем колонку single_date (nullable — старые слоты повторяемые)
alter table individual_slots add column if not exists single_date date;

-- 2. PK более не подходит (teacher_id+day+time_slot уникален, но теперь
--    может быть и единоразовое событие на ту же неделю и день). Переключаемся
--    на surrogate id.
alter table individual_slots drop constraint if exists individual_slots_pkey;

-- Если уже есть колонка id — оставим, иначе создадим
alter table individual_slots add column if not exists id bigserial;
alter table individual_slots add primary key (id);

-- 3. Уникальный индекс для повторяемых (single_date is null) слотов
-- — чтобы (teacher, day, time) был уникальным для повторяющегося
create unique index if not exists individual_slots_recur_uniq
    on individual_slots (teacher_id, day, time_slot)
    where single_date is null;

-- 4. Уникальный индекс для разовых слотов (teacher, single_date, time_slot)
create unique index if not exists individual_slots_single_uniq
    on individual_slots (teacher_id, single_date, time_slot)
    where single_date is not null;

create index if not exists individual_slots_single_date_idx on individual_slots(single_date);
