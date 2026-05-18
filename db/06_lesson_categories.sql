-- =====================================================================
-- Расширение teacher_rates: ставки по категориям + новые типы уроков
-- =====================================================================

-- 1. Добавить колонки в teacher_rates (все nullable — если null, используем базовую rate)
alter table teacher_rates add column if not exists rate_sonastroyka integer;
alter table teacher_rates add column if not exists rate_individual integer;
alter table teacher_rates add column if not exists rate_diagnostika integer;
alter table teacher_rates add column if not exists rate_podgotovka integer;
alter table teacher_rates add column if not exists rate_prodlenka integer;
alter table teacher_rates add column if not exists rate_kruzhki integer;
alter table teacher_rates add column if not exists rate_stazhirovka integer;

-- 2. Расширить список типов в lesson_types
alter table lesson_types drop constraint if exists lesson_types_type_check;
alter table lesson_types add constraint lesson_types_type_check check (
    type in (
        'Групповой',
        'Индивидуальный',
        'ОГЭ',
        'ЕГЭ',
        'Тьюторский',
        'Сонастройка',
        'Диагностика',
        'Подготовка к школе',
        'Продлёнка',
        'Кружки',
        'Стажировка'
    )
);
