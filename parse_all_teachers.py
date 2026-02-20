# -*- coding: utf-8 -*-
import openpyxl
import json

# Load workbook
wb = openpyxl.load_workbook('РАСПИСАНИЕ 2025-2026.xlsx')

# Get the teachers sheet
ws = wb['Классы и часы учителя ']

# Get all rows
rows = list(ws.iter_rows(values_only=True))

# Parse teachers
teachers = []
teacher_id = 1

# Skip header row (row 0)
for row in rows[1:]:
    # Skip empty rows or section headers
    if not row or not row[0] or not row[1]:
        continue

    subject = str(row[0]).strip()
    teacher_name = str(row[1]).strip()
    classes = str(row[2]).strip() if row[2] else ''
    hours = row[3] if row[3] else 0

    # Skip section headers
    if 'школа' in subject.lower() or not teacher_name or teacher_name == 'None':
        continue

    # Determine grade level from classes
    grades = []
    if classes:
        # Check which grades are mentioned
        if any(c in classes for c in ['1а', '1б', '2а', '2б', '2в', '3а', '3б', '3в', '4а', '4б', '4в']):
            if 'Начальная школа (1-4)' not in grades:
                grades.append('Начальная школа (1-4)')
        if any(c in classes for c in ['5а', '5б', '5в', '6а', '6б', '7а', '7б', '8а', '9а']):
            if 'Средняя школа (5-9)' not in grades:
                grades.append('Средняя школа (5-9)')

    if not grades:
        grades = ['Средняя школа (5-9)']  # Default

    teachers.append({
        'id': teacher_id,
        'name': teacher_name,
        'subject': subject,
        'grades': grades,
        'classes': classes,
        'hours': hours
    })
    teacher_id += 1

print(f'Extracted {len(teachers)} teachers')

# Save to JSON
with open('teachers_extracted.json', 'w', encoding='utf-8') as f:
    json.dump(teachers, f, ensure_ascii=False, indent=2)

print('\nSaved to teachers_extracted.json')

# Show sample
print('\nSample teachers:')
for t in teachers[:10]:
    print(f"  {t['id']}. {t['name']} - {t['subject']}")
