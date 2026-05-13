-- =====================================================================
-- Привязка профилей тьюторов к teacher_id (после регистрации аккаунтов)
--
-- Выполнять ПОСЛЕ того как тьюторы зарегистрировались (через UI или
-- через scripts/create_tutor_accounts.mjs).
--
-- Этот скрипт сопоставляет email → teacher_id и устанавливает роль = 'teacher'.
-- =====================================================================

-- Альтернатива скрипту: после ручной регистрации каждого тьютора (через UI),
-- выполнить вручную UPDATE для привязки.

update profiles set role = 'teacher', teacher_id = 2,  full_name = 'Аношко Лиана'        where email = 'tutor-anoshko@school.local';
update profiles set role = 'teacher', teacher_id = 7,  full_name = 'Голубева Елизавета'  where email = 'tutor-golubeva@school.local';
update profiles set role = 'teacher', teacher_id = 12, full_name = 'Коновалова Евгения'  where email = 'tutor-konovalova@school.local';
update profiles set role = 'teacher', teacher_id = 13, full_name = 'Лалетина Елизавета'  where email = 'tutor-laletina@school.local';
update profiles set role = 'teacher', teacher_id = 16, full_name = 'Лукина Юлия'          where email = 'tutor-lukina@school.local';
update profiles set role = 'teacher', teacher_id = 25, full_name = 'Рассолова Екатерина'  where email = 'tutor-rassolova@school.local';
update profiles set role = 'teacher', teacher_id = 27, full_name = 'Силосьева Алла'       where email = 'tutor-silosyeva@school.local';
update profiles set role = 'teacher', teacher_id = 30, full_name = 'Цуркан Юлия'          where email = 'tutor-tsurkan@school.local';

-- Проверка результата
select email, role, teacher_id, full_name from profiles where email like 'tutor-%@school.local' order by teacher_id;
