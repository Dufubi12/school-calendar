# -*- coding: utf-8 -*-
import json
import re

# Load extracted teachers
with open('teachers_extracted.json', 'r', encoding='utf-8') as f:
    teachers = json.load(f)

# Simplify teacher data for mockData.js (remove classes and hours fields)
simplified_teachers = []
for t in teachers:
    simplified_teachers.append({
        'id': t['id'],
        'name': t['name'],
        'subject': t['subject'],
        'grades': t['grades']
    })

# Read current mockData.js
with open('src/data/mockData.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the TEACHERS array and replace it
# Pattern: export const TEACHERS = [...]; (including multiline)
pattern = r'export const TEACHERS = \[[\s\S]*?\];'

# Create new TEACHERS export
new_teachers_export = 'export const TEACHERS = ' + json.dumps(simplified_teachers, ensure_ascii=False, indent=4) + ';'

# Replace
new_content = re.sub(pattern, new_teachers_export, content)

# Save updated file
with open('src/data/mockData.js', 'w', encoding='utf-8') as f:
    f.write(new_content)

print(f'Updated mockData.js with {len(simplified_teachers)} teachers')
print('\nSample of updated teachers:')
for t in simplified_teachers[:5]:
    print(f"  {t['id']}. {t['name']} - {t['subject']}")
