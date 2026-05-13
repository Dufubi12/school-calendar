// =====================================================================
// Парсер CSV с индивидуальными слотами педагогов
// Source: "Слоты педагогов для инд.занятий (+ОГЭ_ЕГЭ).csv"
// Output: src/data/individualSlots.json
// =====================================================================

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const INPUT = join(ROOT, 'Слоты педагогов для инд.занятий (+ОГЭ_ЕГЭ).csv');
const OUTPUT = join(ROOT, 'src', 'data', 'individualSlots.json');

const DAYS = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];

const STATUS_MAP = {
    'свободно': 'free',
    'занят': 'busy',
    'занято': 'busy',
};

// Minimal CSV parser that handles quoted multiline fields with `;` delimiter
function parseCsv(content) {
    const rows = [];
    let row = [];
    let cell = '';
    let inQuotes = false;

    for (let i = 0; i < content.length; i++) {
        const c = content[i];

        if (inQuotes) {
            if (c === '"') {
                if (content[i + 1] === '"') {
                    cell += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                cell += c;
            }
            continue;
        }

        if (c === '"') {
            inQuotes = true;
            continue;
        }

        if (c === ';') {
            row.push(cell);
            cell = '';
            continue;
        }

        if (c === '\n') {
            row.push(cell);
            rows.push(row);
            row = [];
            cell = '';
            continue;
        }

        if (c === '\r') continue;

        cell += c;
    }

    if (cell.length > 0 || row.length > 0) {
        row.push(cell);
        rows.push(row);
    }

    return rows;
}

// Time slot format: "08.00 - 09.00" -> "08:00-09:00"
function normalizeTime(raw) {
    const m = raw.match(/(\d{1,2})[.:](\d{2})\s*-\s*(\d{1,2})[.:](\d{2})/);
    if (!m) return null;
    return `${m[1].padStart(2, '0')}:${m[2]}-${m[3].padStart(2, '0')}:${m[4]}`;
}

// Extract teacher name (first non-empty line of the block) + the rest as description
function extractTeacherInfo(raw) {
    const cleaned = raw.replace(/ /g, ' ').trim();
    if (!cleaned) return null;

    // Split by newline, take first as name, rest as description
    const lines = cleaned.split(/\n+/).map(s => s.trim()).filter(Boolean);
    if (lines.length === 0) return null;

    // Name = first two-three words (looking for Russian "Surname Name" pattern)
    const firstLine = lines[0];
    const words = firstLine.split(/\s+/);
    // Try to find "Surname Name" — first two capitalized words
    let nameWords = [];
    for (const w of words) {
        if (w.length === 0) continue;
        if (/^[А-ЯЁ][а-яё]+/.test(w)) {
            nameWords.push(w);
            if (nameWords.length === 2) break;
        } else if (nameWords.length >= 1) {
            break;
        } else {
            break;
        }
    }
    const name = nameWords.join(' ') || firstLine;

    // Description = everything after the name
    const descParts = [];
    if (firstLine.length > name.length) {
        descParts.push(firstLine.slice(name.length).trim());
    }
    descParts.push(...lines.slice(1));
    const description = descParts
        .map(s => s.trim().replace(/\s+/g, ' '))
        .filter(Boolean)
        .join('; ');

    return { name, description };
}

function main() {
    const content = readFileSync(INPUT, 'utf-8').replace(/^﻿/, '');
    const rows = parseCsv(content);

    const teachers = [];
    let current = null;

    for (const row of rows) {
        if (row.length === 0) continue;

        const firstCell = (row[0] || '').trim();
        const secondCell = (row[1] || '').trim();

        // New teacher block: row[0] empty, row[1] contains name (often multiline)
        if (!firstCell && secondCell && /[А-ЯЁ]/.test(secondCell)) {
            const info = extractTeacherInfo(secondCell);
            if (info) {
                current = {
                    name: info.name,
                    description: info.description,
                    slots: {},
                };
                teachers.push(current);
            }
            continue;
        }

        // Time slot row: row[0] has time like "08.00 - 09.00"
        const timeKey = normalizeTime(firstCell);
        if (timeKey && current) {
            for (let i = 0; i < DAYS.length; i++) {
                const day = DAYS[i];
                const cellValue = (row[i + 1] || '').trim().toLowerCase();
                const status = STATUS_MAP[cellValue];
                if (status) {
                    if (!current.slots[day]) current.slots[day] = {};
                    current.slots[day][timeKey] = status;
                }
            }
        }
    }

    const totalSlots = teachers.reduce(
        (sum, t) => sum + Object.values(t.slots).reduce((s, day) => s + Object.keys(day).length, 0),
        0
    );

    console.log(`Parsed ${teachers.length} teachers, ${totalSlots} marked slots`);
    teachers.forEach(t => {
        const count = Object.values(t.slots).reduce((s, day) => s + Object.keys(day).length, 0);
        console.log(`  ${t.name.padEnd(28)} ${count} slots`);
    });

    writeFileSync(OUTPUT, JSON.stringify({ teachers }, null, 2), 'utf-8');
    console.log(`\nSaved to ${OUTPUT}`);
}

main();
