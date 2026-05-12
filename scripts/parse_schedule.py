import pandas as pd
import json
from datetime import datetime

# Читаем Excel файл
excel_file = 'РАСПИСАНИЕ 2025-2026.xlsx'

# Классы для обработки
classes = ['7А', '7Б', '8А', '9А']

schedule_data = {}

for class_name in classes:
    print(f'\nОбработка класса {class_name}...')

    # Читаем лист класса
    df = pd.read_excel(excel_file, sheet_name=class_name)

    # Структура для хранения расписания класса
    class_schedule = {
        'className': class_name,
        'days': []
    }

    # Ищем строки с днями недели
    days_of_week = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота']

    current_day = None
    lessons = []

    for index, row in df.iterrows():
        # Проверяем первую колонку на день недели
        first_col = str(row.iloc[0]).strip()

        # Если это день недели
        if any(day in first_col for day in days_of_week):
            # Сохраняем предыдущий день если есть
            if current_day and lessons:
                class_schedule['days'].append({
                    'day': current_day,
                    'lessons': lessons.copy()
                })
                lessons = []

            # Определяем новый день
            for day in days_of_week:
                if day in first_col:
                    current_day = day
                    break

        # Если это время урока (формат XX:XX-XX:XX)
        elif ':' in first_col and '-' in first_col:
            time = first_col

            # Собираем предметы из всех колонок
            lesson_subjects = []
            for col_idx in range(1, min(6, len(row))):  # Первые 5 колонок после времени
                subject = row.iloc[col_idx]
                if pd.notna(subject) and str(subject).strip() and str(subject) != 'nan':
                    lesson_subjects.append(str(subject).strip())

            if lesson_subjects:
                lessons.append({
                    'time': time,
                    'subjects': ' / '.join(lesson_subjects) if len(lesson_subjects) > 1 else lesson_subjects[0]
                })

    # Сохраняем последний день
    if current_day and lessons:
        class_schedule['days'].append({
            'day': current_day,
            'lessons': lessons.copy()
        })

    schedule_data[class_name] = class_schedule

# Сохраняем в JSON
output_file = 'schedule_data.json'
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(schedule_data, f, ensure_ascii=False, indent=2)

print(f'\n✅ Данные сохранены в {output_file}')
print(f'Обработано классов: {len(schedule_data)}')

# Выводим пример для первого класса
first_class = list(schedule_data.keys())[0]
print(f'\nПример данных для класса {first_class}:')
print(json.dumps(schedule_data[first_class], ensure_ascii=False, indent=2))
