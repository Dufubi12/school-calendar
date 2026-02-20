# -*- coding: utf-8 -*-
import openpyxl
import json

wb = openpyxl.load_workbook('РАСПИСАНИЕ 2025-2026.xlsx')

# Парсим 7А класс
ws = wb['7А']

print("Парсинг листа 7А...")
print("=" * 80)

schedule = {
    'Понедельник': [],
    'Вторник': [],
    'Среда': [],
    'Четверг': [],
    'Пятница': []
}

# Получаем все строки
rows = list(ws.iter_rows(values_only=True))

# Ищем строку с днями недели
day_row_idx = None
for idx, row in enumerate(rows):
    if row and len(row) > 1:
        if 'Понедельник' in str(row):
            day_row_idx = idx
            print(f"Найдена строка с днями: {idx}")
            print(f"Дни: {row[:6]}")
            break

if day_row_idx is None:
    print("Не найдена строка с днями недели!")
    exit(1)

# Получаем индексы колонок для дней
day_row = rows[day_row_idx]
day_cols = {}
for col_idx, cell in enumerate(day_row):
    if cell in schedule.keys():
        day_cols[col_idx] = cell
        print(f"Колонка {col_idx}: {cell}")

print(f"\nНайдено дней: {len(day_cols)}")
print("=" * 80)

# Парсим уроки (следующие 20 строк после заголовка)
lesson_count = 0
for row_idx in range(day_row_idx + 1, min(day_row_idx + 20, len(rows))):
    row = rows[row_idx]

    if not row or not row[0]:
        continue

    time_cell = str(row[0]).strip()

    # Проверяем что это время (содержит ":" и "-")
    if ':' not in time_cell or '-' not in time_cell:
        continue

    # Пропускаем обед и другие активности
    if 'обед' in time_cell.lower():
        continue

    print(f"\nУрок: {time_cell}")

    # Для каждого дня недели
    for col_idx, day_name in day_cols.items():
        if col_idx < len(row):
            subject_cell = row[col_idx]

            if subject_cell and str(subject_cell).strip():
                subject_str = str(subject_cell).strip()

                # Разделяем предмет и учителя (обычно разделены несколькими пробелами)
                parts = [p.strip() for p in subject_str.split('  ') if p.strip()]

                lesson = {
                    'time': time_cell,
                    'subject': parts[0] if parts else subject_str
                }

                if len(parts) > 1:
                    lesson['teacher'] = parts[1]

                schedule[day_name].append(lesson)
                lesson_count += 1
                print(f"  {day_name}: {lesson['subject']}")

print(f"\n=" * 80)
print(f"Всего уроков распарсено: {lesson_count}")

# Сохраняем
output = {'7А': schedule}

with open('class_7a_schedule.json', 'w', encoding='utf-8') as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

print("Данные сохранены в class_7a_schedule.json")

# Показываем результат
print("\nПример (Понедельник):")
for lesson in schedule['Понедельник'][:3]:
    print(f"  {lesson}")
