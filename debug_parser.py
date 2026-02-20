# -*- coding: utf-8 -*-
import openpyxl

wb = openpyxl.load_workbook('РАСПИСАНИЕ 2025-2026.xlsx')
ws = wb['7А']

rows = list(ws.iter_rows(values_only=True))

# Ищем строку с днями
day_row_idx = None
for idx, row in enumerate(rows):
    if row and 'Понедельник' in str(row):
        day_row_idx = idx
        break

if day_row_idx:
    print(f"Строка с днями: {day_row_idx}")
    print("\nСледующие 15 строк после заголовка:\n")

    for i in range(day_row_idx + 1, min(day_row_idx + 16, len(rows))):
        row = rows[i]
        if row and row[0]:
            print(f"Строка {i}: [{repr(row[0])}] | {repr(row[1])} | {repr(row[2])}")
            # Проверяем наличие символов
            first_cell = str(row[0])
            print(f"  -> Длина: {len(first_cell)}, Содержит ':': {':' in first_cell}, Содержит '-': {'-' in first_cell}")
        else:
            print(f"Строка {i}: пустая или None")
