# -*- coding: utf-8 -*-
import openpyxl
import json

def parse_class(wb, sheet_name):
    """Парсит расписание одного класса"""
    ws = wb[sheet_name]
    rows = list(ws.iter_rows(values_only=True))

    schedule = {
        'Понедельник': [],
        'Вторник': [],
        'Среда': [],
        'Четверг': [],
        'Пятница': []
    }

    # Ищем строку с днями недели
    day_row_idx = None
    for idx, row in enumerate(rows):
        if row and 'Понедельник' in str(row):
            day_row_idx = idx
            break

    if day_row_idx is None:
        return schedule

    # Получаем индексы колонок для дней
    day_row = rows[day_row_idx]
    day_cols = {}
    for col_idx, cell in enumerate(day_row):
        if cell in schedule.keys():
            day_cols[col_idx] = cell

    # Парсим уроки
    for row_idx in range(day_row_idx + 1, min(day_row_idx + 20, len(rows))):
        row = rows[row_idx]

        if not row or not row[0]:
            continue

        time_cell = str(row[0]).strip()

        # Проверяем что это время (формат XX.XX-XX.XX)
        if '.' not in time_cell or '-' not in time_cell:
            continue

        # Пропускаем обед и перемены
        if 'обед' in time_cell.lower() or 'перемена' in time_cell.lower():
            continue

        # Пропускаем строки которые не похожи на время уроков
        if not any(char.isdigit() for char in time_cell[:2]):
            continue

        # Для каждого дня недели
        for col_idx, day_name in day_cols.items():
            if col_idx < len(row):
                subject_cell = row[col_idx]

                if subject_cell and str(subject_cell).strip() and str(subject_cell) != 'None':
                    subject_str = str(subject_cell).strip()

                    # Пропускаем пустые и служебные записи
                    if subject_str.lower() in ['обед', 'нет']:
                        continue

                    # Разделяем предмет и учителя (обычно разделены несколькими пробелами)
                    parts = [p.strip() for p in subject_str.split('  ') if p.strip()]

                    lesson = {
                        'time': time_cell.replace('.', ':'),  # Конвертируем в стандартный формат
                        'subject': parts[0] if parts else subject_str,
                        'teacher': parts[-1] if len(parts) > 1 else ''
                    }

                    schedule[day_name].append(lesson)

    return schedule

# Основная программа
wb = openpyxl.load_workbook('РАСПИСАНИЕ 2025-2026.xlsx')

classes = {
    '7А': '7А',
    '7Б': '7Б',
    '8А': '8А',
    '9А': '9А'
}

all_data = {}

for sheet_name, class_name in classes.items():
    print(f'Парсинг {class_name}...')
    schedule = parse_class(wb, sheet_name)

    # Подсчет уроков
    total_lessons = sum(len(lessons) for lessons in schedule.values())
    print(f'  Найдено уроков: {total_lessons}')

    all_data[class_name] = schedule

# Сохраняем
with open('schedules_final.json', 'w', encoding='utf-8') as f:
    json.dump(all_data, f, ensure_ascii=False, indent=2)

print('\n✅ Готово! Данные сохранены в schedules_final.json')
print(f'Обработано классов: {len(all_data)}')

# Показываем пример
if '7А' in all_data:
    print('\nПример (7А класс, Понедельник):')
    for i, lesson in enumerate(all_data['7А']['Понедельник'][:3], 1):
        print(f"{i}. {lesson['time']} - {lesson['subject']} ({lesson['teacher']})")
