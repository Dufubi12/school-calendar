-- =====================================================================
-- IZ slot versioning — историческая точность статистики
-- =====================================================================
--
-- Проблема: если педагог в мае меняет recurring-слот «Пн 09:00 → 10:00»,
-- то статистика за апрель показывает 10:00, что неверно — на прошлой
-- неделе урок был в 9.
--
-- Решение: добавить колонки effective_from / effective_to. При смене
-- времени старая запись получает effective_to = (вчера), а новая
-- создаётся с effective_from = (сегодня).
--
-- Logic для запросов:
--   "слот действует на дату X" = effective_from <= X AND (effective_to IS NULL OR X <= effective_to)
--
-- single_date слоты используют effective_from = effective_to = single_date.
-- =====================================================================

alter table individual_slots add column if not exists effective_from date;
alter table individual_slots add column if not exists effective_to date;

-- Бэкфилл: все существующие записи получают «открытый» диапазон с прошлого года
-- (можно интерпретировать как «было так всегда сколько помнит система»)
update individual_slots
    set effective_from = coalesce(effective_from, '2025-09-01')
    where effective_from is null;

-- single_date записи: явно ограничим диапазон одной датой
update individual_slots
    set effective_from = single_date,
        effective_to = single_date
    where single_date is not null and (effective_from is null or effective_to is null);

-- Индексы для быстрых date-range запросов
create index if not exists individual_slots_effective_from_idx on individual_slots(effective_from);
create index if not exists individual_slots_effective_to_idx on individual_slots(effective_to);

-- Для recurring (single_date IS NULL) — больше нет «одного слота на teacher+day+time»;
-- теперь может быть несколько версий с разными диапазонами. Поэтому старый
-- partial unique index для recurring заменяем на (teacher_id, day, time_slot, effective_from)
drop index if exists individual_slots_recur_uniq;
create unique index if not exists individual_slots_recur_versioned_uniq
    on individual_slots (teacher_id, day, time_slot, effective_from)
    where single_date is null;
