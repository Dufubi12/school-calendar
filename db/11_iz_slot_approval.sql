-- =====================================================================
-- IZ slot approval workflow
-- =====================================================================
--
-- Когда педагог отмечает свой слот в «Инд. занятиях» — запись попадает
-- в статус 'pending'. Админ либо подтверждает её ('approved'), либо
-- отклоняет ('rejected'), возможно с комментарием.
--
-- Бейджи в навигации:
--   admin   — кол-во pending-слотов
--   teacher — кол-во approved/rejected ответов за последние 24ч
-- =====================================================================

alter table individual_slots add column if not exists approval_status text default 'pending';
alter table individual_slots add column if not exists approval_note text;
alter table individual_slots add column if not exists approved_at timestamptz;
alter table individual_slots add column if not exists approved_by uuid references auth.users(id);

alter table individual_slots drop constraint if exists individual_slots_approval_status_check;
alter table individual_slots add constraint individual_slots_approval_status_check check (
    approval_status in ('pending', 'approved', 'rejected')
);

create index if not exists individual_slots_approval_idx on individual_slots(approval_status);

-- Бэкфилл: все существующие записи считаем approved (созданы до workflow)
update individual_slots set approval_status = 'approved' where approval_status is null or approval_status = 'pending';
