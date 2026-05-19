-- =====================================================================
-- Добавляем повторяемость в invitations
-- =====================================================================
--
-- recurrence_pattern: 'once' (default) | 'weekly' | 'biweekly'
-- recurrence_end_date: дата последнего повторения (NULL для 'once')
--
-- Логика рендеринга в календаре:
--   once     — событие только на invite_date
--   weekly   — каждый invite_date + 7n до recurrence_end_date
--   biweekly — каждый invite_date + 14n до recurrence_end_date
-- =====================================================================

alter table invitations add column if not exists recurrence_pattern text default 'once';
alter table invitations add column if not exists recurrence_end_date date;

alter table invitations drop constraint if exists invitations_recurrence_pattern_check;
alter table invitations add constraint invitations_recurrence_pattern_check check (
    recurrence_pattern in ('once', 'weekly', 'biweekly')
);

-- Не должно быть end_date если паттерн = once
-- (CHECK не зависит от значения — будем проверять только наличие)
