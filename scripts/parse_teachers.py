# -*- coding: utf-8 -*-
import openpyxl
import json

# Load workbook
wb = openpyxl.load_workbook('РАСПИСАНИЕ 2025-2026.xlsx')

# Get the teachers sheet
ws = wb['Классы и часы учителя ']

# Get all rows
rows = list(ws.iter_rows(values_only=True))

print(f'Total rows: {len(rows)}')
print('\nFirst 20 rows:')
for i, row in enumerate(rows[:20], 1):
    print(f'{i}. {row}')

# Save to JSON for inspection
with open('teachers_raw.json', 'w', encoding='utf-8') as f:
    json.dump([list(row) if row else [] for row in rows[:50]], f, ensure_ascii=False, indent=2)

print('\nSaved first 50 rows to teachers_raw.json')
