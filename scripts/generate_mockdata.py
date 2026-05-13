import json

# Read parsed schedule
with open('data/json/schedule_parsed_final.json', 'r', encoding='utf-8') as f:
    schedule = json.load(f)

# Teacher full names and subjects mapping
TEACHER_DATA = {
    'Абдуллаева':    {'full': 'Абдуллаева Джамиля',     'subject': 'Русский язык, Литература',         'grade': 'Начальная школа (1-4)'},
    'Аношко':        {'full': 'Аношко Лиана',           'subject': 'Тьютор',                           'grade': 'Начальная школа (1-4)'},
    'Барышникова':   {'full': 'Барышникова Дарья',       'subject': 'Физика',                           'grade': 'Средняя школа (5-9)'},
    'Бондарь':       {'full': 'Бондарь Ольга',           'subject': 'Технология, ИЗО',                  'grade': 'Начальная школа (1-4)'},
    'Вайнула':       {'full': 'Вайнула Анастасия',       'subject': 'Русский язык, Литература',         'grade': 'Средняя школа (5-9)'},
    'Гайденко':      {'full': 'Гайденко Елена',          'subject': 'География',                        'grade': 'Средняя школа (5-9)'},
    'Голубева':      {'full': 'Голубева Елизавета',       'subject': 'Тьютор',                           'grade': 'Средняя школа (5-9)'},
    'Ерохина':       {'full': 'Ерохина Анастасия',       'subject': 'Английский язык',                  'grade': 'Начальная школа (1-4)'},
    'Карнаушенко':   {'full': 'Карнаушенко Оксана',      'subject': 'Математика',                       'grade': 'Средняя школа (5-9)'},
    'Карпова':       {'full': 'Карпова',                  'subject': 'Музыка',                           'grade': 'Начальная школа (1-4)'},
    'Козлова':       {'full': 'Козлова Галина',           'subject': 'Русский язык, Литература',         'grade': 'Начальная школа (1-4)'},
    'Коновалова':    {'full': 'Коновалова Евгения',       'subject': 'Тьютор',                           'grade': 'Начальная школа (1-4)'},
    'Лалетина':      {'full': 'Лалетина Елизавета',       'subject': 'Тьютор',                           'grade': 'Средняя школа (5-9)'},
    'Ларшина':       {'full': 'Ларшина Анастасия',       'subject': 'Алгебра, Геометрия, Информатика',  'grade': 'Средняя школа (5-9)'},
    'Латышева':      {'full': 'Латышева Ирина',          'subject': 'Английский язык',                  'grade': 'Средняя школа (5-9)'},
    'Лукина':        {'full': 'Лукина Юлия',              'subject': 'Тьютор',                           'grade': 'Средняя школа (5-9)'},
    'Малкова':       {'full': 'Малкова Полина',           'subject': 'Английский язык',                  'grade': 'Начальная школа (1-4)'},
    'Матвеева':      {'full': 'Матвеева Валерия',         'subject': 'Английский язык',                  'grade': 'Средняя школа (5-9)'},
    'Михайлова':     {'full': 'Михайлова Марина',         'subject': 'Математика',                       'grade': 'Средняя школа (5-9)'},
    'Мишина':        {'full': 'Мишина Валерия',           'subject': 'Русский язык, Литература',         'grade': 'Средняя школа (5-9)'},
    'Павленко':      {'full': 'Павленко Ольга',           'subject': 'Биология',                         'grade': 'Средняя школа (5-9)'},
    'Павликов':      {'full': 'Павликов Дмитрий',         'subject': 'История, Обществознание',          'grade': 'Средняя школа (5-9)'},
    'Пашкова':       {'full': 'Пашкова Анна',             'subject': 'Начальная школа',                  'grade': 'Начальная школа (1-4)'},
    'Петрова':       {'full': 'Петрова Елизавета',        'subject': 'Русский язык, Литература',         'grade': 'Начальная школа (1-4)'},
    'Рассолова':     {'full': 'Рассолова Екатерина',      'subject': 'Тьютор',                           'grade': 'Начальная школа (1-4)'},
    'Савина':        {'full': 'Савина Ксения',            'subject': 'Математика, Окружающий мир',       'grade': 'Начальная школа (1-4)'},
    'Силосьева':     {'full': 'Силосьева Алла',           'subject': 'Тьютор',                           'grade': 'Начальная школа (1-4)'},
    'Созонов':       {'full': 'Созонов',                   'subject': 'Химия',                            'grade': 'Средняя школа (5-9)'},
    'Тронина':       {'full': 'Тронина',                   'subject': 'Музыка',                           'grade': 'Начальная школа (1-4)'},
    'Цуркан':        {'full': 'Цуркан Юлия',              'subject': 'Тьютор',                           'grade': 'Начальная школа (1-4)'},
    'Чеченкова':     {'full': 'Чеченкова Светлана',       'subject': 'Математика, Окружающий мир',       'grade': 'Начальная школа (1-4)'},
}

# Collect all unique subjects from schedule
all_subjects = set()
for cls_data in schedule.values():
    for day_lessons in cls_data.values():
        for l in day_lessons:
            all_subjects.add(l['subject'])

# Sort classes properly
def class_sort_key(c):
    num = int(c[:-1])
    letter = c[-1]
    return (num, letter)

sorted_classes = sorted(schedule.keys(), key=class_sort_key)

# Generate JS
lines = []
lines.append('// Mock Data for School Calendar - Из Excel расписания 2025-2026')
lines.append('')

# SUBJECTS
lines.append('export const SUBJECTS = [')
for s in sorted(all_subjects):
    lines.append(f'    "{s}",')
lines.append('];')
lines.append('')

# AVAILABILITY_PRESETS
lines.append('export const AVAILABILITY_PRESETS = [')
presets = [
    ('Сонастройка', '08:45', '09:00'),
    ('1 урок', '09:00', '09:45'),
    ('2 урок', '09:55', '10:40'),
    ('3 урок', '10:50', '11:35'),
    ('Сонастройка (2 смена)', '11:30', '11:45'),
    ('4 урок', '11:45', '12:30'),
    ('5 урок', '12:40', '13:25'),
    ('6 урок', '13:35', '14:20'),
    ('7 урок', '14:30', '15:15'),
    ('8 урок', '15:25', '16:10'),
]
for label, start, end in presets:
    lines.append(f'    {{ "label": "{label} ({start} - {end})", "start": "{start}", "end": "{end}" }},')
lines.append('];')
lines.append('')

# DEFAULT_WORKING_HOURS
lines.append("export const DEFAULT_WORKING_HOURS = {")
lines.append("    start: '2025-09-01',")
lines.append("    end: '2026-06-30',")
lines.append("    slots: []")
lines.append("};")
lines.append('')

# GRADES
lines.append("export const GRADES = [")
lines.append("    'Начальная школа (1-4)',")
lines.append("    'Средняя школа (5-9)',")
lines.append("    'Старшая школа (10-11)'")
lines.append("];")
lines.append('')

# TEACHERS
lines.append('export const TEACHERS = [')
teacher_list = sorted(TEACHER_DATA.keys())
for i, last_name in enumerate(teacher_list, 1):
    t = TEACHER_DATA[last_name]
    lines.append(f'    {{ "id": {i}, "name": "{t["full"]}", "subject": "{t["subject"]}", "grades": ["{t["grade"]}"] }},')
lines.append('];')
lines.append('')

# REAL_SCHEDULE
lines.append('// Расписание из Excel (1-9 классы)')
lines.append('export const REAL_SCHEDULE = {')
for cls in sorted_classes:
    days = schedule[cls]
    lines.append(f'    "{cls}": {{')
    for day_name in ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница']:
        lessons = days.get(day_name, [])
        if lessons:
            lines.append(f'        "{day_name}": [')
            for l in lessons:
                lines.append(f'            {{"time": "{l["time"]}", "subject": "{l["subject"]}", "teacher": "{l["teacher"]}"}},')
            lines.append('        ],')
    lines.append('    },')
lines.append('};')
lines.append('')
lines.append('export const INITIAL_SUBSTITUTIONS = [];')
lines.append('')

output = '\n'.join(lines)
with open('src/data/mockData.js', 'w', encoding='utf-8') as f:
    f.write(output)

print(f'Generated mockData.js: {len(sorted_classes)} classes, {len(teacher_list)} teachers, {len(all_subjects)} subjects')
