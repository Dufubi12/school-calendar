-- =====================================================================
-- Расширение invitations: ФИ ученика + тип занятия
-- =====================================================================

-- 1. Добавляем колонки (nullable — старые приглашения остаются валидными)
alter table invitations add column if not exists student_name text;
alter table invitations add column if not exists lesson_kind text;

-- 2. CHECK для типа занятия (если задан)
-- Контракт: lesson_kind = NULL означает обычное "Групповой" занятие.
-- Только индивидуальные/специальные типы пишем явно. НЕ добавлять 'Групповой' в
-- whitelist — UI всегда отправит null для группового, чтобы default-категория
-- не перепутывалась с явно заданной.
alter table invitations drop constraint if exists invitations_lesson_kind_check;
alter table invitations add constraint invitations_lesson_kind_check check (
    lesson_kind is null or lesson_kind in ('ИЗ', 'ИМ', 'ОГЭ', 'ЕГЭ', 'Другое')
);
