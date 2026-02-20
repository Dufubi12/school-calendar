# -*- coding: utf-8 -*-
import json
from collections import defaultdict

# Читаем распарсенное расписание
with open('schedules_final.json', 'r', encoding='utf-8') as f:
    schedules = json.load(f)

# Собираем уникальных учителей и предметы
teachers_map = {}
subjects_set = set()
teacher_id = 1

# Временные слоты из расписания
time_slots = set()

# Обрабатываем каждый класс
for class_name, days in schedules.items():
    for day_name, lessons in days.items():
        for lesson in lessons:
            subject = lesson['subject']
            teacher_name = lesson['teacher']
            time = lesson['time']

            # Добавляем предмет
            subjects_set.add(subject)

            # Добавляем временной слот
            time_slots.add(time)

            # Добавляем учителя
            if teacher_name and teacher_name not in teachers_map:
                teachers_map[teacher_name] = {
                    'id': teacher_id,
                    'name': teacher_name,
                    'subject': subject,
                    'grades': ['Средняя школа (5-9)']  # Так как это 7-9 классы
                }
                teacher_id += 1

# Сортируем временные слоты
time_slots_sorted = sorted(list(time_slots))

# Создаем AVAILABILITY_PRESETS
availability_presets = []
for idx, time_slot in enumerate(time_slots_sorted, 1):
    if '-' in time_slot:
        start, end = time_slot.split('-')
        availability_presets.append({
            'label': f'{idx} урок ({start} - {end})',
            'start': start,
            'end': end
        })

# Создаем список учителей для экспорта
teachers_list = list(teachers_map.values())

# Создаем JS файл
js_content = f'''// Mock Data for School Calendar - Обновлено из расписания 2025-2026

export const SUBJECTS = {json.dumps(sorted(list(subjects_set)), ensure_ascii=False, indent=4)};

export const AVAILABILITY_PRESETS = {json.dumps(availability_presets, ensure_ascii=False, indent=4)};

export const DEFAULT_WORKING_HOURS = {{
    start: '2025-09-01',
    end: '2026-06-30',
    slots: []
}};

export const GRADES = [
    'Начальная школа (1-4)',
    'Средняя школа (5-9)',
    'Старшая школа (10-11)'
];

export const TEACHERS = {json.dumps(teachers_list, ensure_ascii=False, indent=4)};

// Расписание из Excel (7-9 классы)
export const REAL_SCHEDULE = {json.dumps(schedules, ensure_ascii=False, indent=4)};

// Mock Schedule для системы замен
export const MOCK_SCHEDULE = {{
    'DEFAULT': {{
        // Будет заполняться динамически из REAL_SCHEDULE
    }}
}};

export const getTeacherAvailability = (teacherId, date, lessonNumber) => {{
    const dateKey = typeof date === 'string' ? date : 'DEFAULT';
    const daySchedule = MOCK_SCHEDULE[dateKey] || MOCK_SCHEDULE['DEFAULT'];

    if (!daySchedule) return true;

    const busyLessons = daySchedule[teacherId] || [];
    return !busyLessons.includes(parseInt(lessonNumber));
}};

export const getTeacherWorkload = (teacherId, date) => {{
    const dateKey = typeof date === 'string' ? date : 'DEFAULT';
    const daySchedule = MOCK_SCHEDULE[dateKey] || MOCK_SCHEDULE['DEFAULT'];

    if (!daySchedule) return 0;

    const busyLessons = daySchedule[teacherId] || [];
    return busyLessons.length;
}};

export const INITIAL_SUBSTITUTIONS = [];
'''

# Сохраняем
with open('src/data/mockData.js', 'w', encoding='utf-8') as f:
    f.write(js_content)

print('✅ Файл mockData.js обновлен!')
print(f'   - Предметов: {len(subjects_set)}')
print(f'   - Учителей: {len(teachers_list)}')
print(f'   - Временных слотов: {len(availability_presets)}')
print(f'   - Классов в расписании: {len(schedules)}')

print('\nПример учителей:')
for teacher in teachers_list[:5]:
    print(f'  {teacher["id"]}. {teacher["name"]} - {teacher["subject"]}')

print('\nПример предметов:')
for subject in sorted(list(subjects_set))[:10]:
    print(f'  - {subject}')
