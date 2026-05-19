import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSchedule } from '../context/ScheduleContext';
import { loadLessonTypes, saveLessonType } from '../lib/api';
import { Tag } from 'lucide-react';

const WEEKDAYS = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница'];
const LESSON_TYPES = ['Групповой', 'Индивидуальный', 'ОГЭ', 'ЕГЭ', 'Тьюторский'];
const DEFAULT_TYPE = 'Групповой';

// Цветовая схема для типов уроков
const TYPE_COLORS = {
    'Групповой': { bg: 'var(--color-moss-soft)', text: 'var(--color-primary-deep)' },
    'Индивидуальный': { bg: '#fef3c7', text: '#92400e' },
    'ОГЭ': { bg: '#ede9fe', text: '#6b21a8' },
    'ЕГЭ': { bg: '#ffe4e6', text: '#9f1239' },
    'Тьюторский': { bg: '#d1fae5', text: '#065f46' },
};

// Уникальный ключ для урока
const buildLessonKey = (className, dayName, time, teacher) =>
    `${className}_${dayName}_${time}_${teacher}`;

const LessonTypesPage = () => {
    const { isAdmin } = useAuth();
    const { realSchedule } = useSchedule();
    const [lessonTypes, setLessonTypes] = useState({});
    const [loading, setLoading] = useState(true);
    const [filterClass, setFilterClass] = useState('all');
    const [filterTeacher, setFilterTeacher] = useState('all');
    const [filterType, setFilterType] = useState('all');

    // Загружаем типы уроков из Supabase при монтировании
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const data = await loadLessonTypes();
                if (!cancelled) setLessonTypes(data || {});
            } catch (err) {
                console.error('Не удалось загрузить типы уроков:', err);
                if (!cancelled) setLessonTypes({});
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    // Собираем все уроки из расписания (Supabase + fallback)
    const allLessons = useMemo(() => {
        const rows = [];
        Object.entries(realSchedule).forEach(([className, days]) => {
            Object.entries(days).forEach(([dayName, lessons]) => {
                if (!WEEKDAYS.includes(dayName)) return;
                lessons.forEach((lesson) => {
                    rows.push({
                        className,
                        dayName,
                        time: lesson.time,
                        subject: lesson.subject,
                        teacher: lesson.teacher,
                        key: buildLessonKey(className, dayName, lesson.time, lesson.teacher),
                    });
                });
            });
        });
        return rows;
    }, [realSchedule]);

    // Списки для фильтров
    const classOptions = useMemo(() => {
        const set = new Set(allLessons.map((l) => l.className));
        return Array.from(set).sort();
    }, [allLessons]);

    const teacherOptions = useMemo(() => {
        const set = new Set(allLessons.map((l) => l.teacher));
        return Array.from(set).sort((a, b) => a.localeCompare(b, 'ru'));
    }, [allLessons]);

    // Применяем фильтры и сортировку
    const filteredLessons = useMemo(() => {
        const dayOrder = WEEKDAYS.reduce((acc, d, i) => ({ ...acc, [d]: i }), {});
        return allLessons
            .filter((l) => filterClass === 'all' || l.className === filterClass)
            .filter((l) => filterTeacher === 'all' || l.teacher === filterTeacher)
            .filter((l) => {
                if (filterType === 'all') return true;
                const currentType = lessonTypes[l.key] || DEFAULT_TYPE;
                return currentType === filterType;
            })
            .sort((a, b) => {
                if (a.className !== b.className) return a.className.localeCompare(b.className, 'ru');
                if (a.dayName !== b.dayName) return dayOrder[a.dayName] - dayOrder[b.dayName];
                return a.time.localeCompare(b.time);
            });
    }, [allLessons, filterClass, filterTeacher, filterType, lessonTypes]);

    // Подсчёт по типам (для информации)
    const typeCounts = useMemo(() => {
        const counts = {};
        LESSON_TYPES.forEach((t) => (counts[t] = 0));
        allLessons.forEach((l) => {
            const t = lessonTypes[l.key] || DEFAULT_TYPE;
            counts[t] = (counts[t] || 0) + 1;
        });
        return counts;
    }, [allLessons, lessonTypes]);

    const updateLessonType = useCallback(
        async (lesson, type) => {
            const { className, dayName, time, teacher, key } = lesson;
            const previous = lessonTypes;
            // Optimistic UI update
            setLessonTypes((prev) => {
                const next = { ...prev };
                if (type === DEFAULT_TYPE) {
                    delete next[key];
                } else {
                    next[key] = type;
                }
                return next;
            });
            try {
                await saveLessonType(className, dayName, time, teacher, type);
            } catch (err) {
                console.error('Не удалось сохранить тип урока:', err);
                // Revert
                setLessonTypes(previous);
            }
        },
        [lessonTypes]
    );

    const resetAll = useCallback(async () => {
        if (!window.confirm('Сбросить все типы уроков к значению "Групповой"?')) return;
        const previous = lessonTypes;
        const entries = Object.entries(previous);
        // Optimistic clear
        setLessonTypes({});
        try {
            await Promise.all(
                entries.map(([key]) => {
                    // key = `${className}_${dayName}_${time}_${teacher}`
                    // Splitting on '_' is unsafe (time has '-' but no '_'); we know parts:
                    // [className, dayName, time, teacher]
                    const parts = key.split('_');
                    if (parts.length < 4) return Promise.resolve();
                    const [className, dayName, time, ...rest] = parts;
                    const teacher = rest.join('_');
                    return saveLessonType(className, dayName, time, teacher, DEFAULT_TYPE);
                })
            );
        } catch (err) {
            console.error('Не удалось сбросить типы уроков:', err);
            setLessonTypes(previous);
        }
    }, [lessonTypes]);

    if (!isAdmin) {
        return (
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                    <Tag size={32} style={{ marginBottom: '0.5rem' }} />
                    <h2 style={{ margin: '0 0 0.5rem 0' }}>Доступ ограничен</h2>
                    <p style={{ margin: 0 }}>Эта страница доступна только методисту (администратору).</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                    <Tag size={32} style={{ marginBottom: '0.5rem' }} />
                    <p style={{ margin: 0 }}>Загрузка…</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ marginBottom: '1.5rem' }}>
                <h1 style={{ margin: 0, fontSize: '1.8rem' }}>Типы уроков</h1>
                <p style={{ margin: '0.5rem 0 0', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                    Назначьте каждому уроку тип: групповой, индивидуальный, ОГЭ, ЕГЭ или тьюторский
                </p>
            </div>

            {/* Фильтры и краткая статистика */}
            <div
                className="card"
                style={{
                    marginBottom: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    flexWrap: 'wrap',
                }}
            >
                <Tag size={20} />

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <label htmlFor="class-filter" style={{ fontWeight: 500, fontSize: '0.9rem' }}>
                        Класс:
                    </label>
                    <select
                        id="class-filter"
                        value={filterClass}
                        onChange={(e) => setFilterClass(e.target.value)}
                        style={{
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: '1px solid #e5e7eb',
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            minWidth: '120px',
                        }}
                    >
                        <option value="all">Все классы</option>
                        {classOptions.map((c) => (
                            <option key={c} value={c}>
                                {c}
                            </option>
                        ))}
                    </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <label htmlFor="teacher-filter" style={{ fontWeight: 500, fontSize: '0.9rem' }}>
                        Учитель:
                    </label>
                    <select
                        id="teacher-filter"
                        value={filterTeacher}
                        onChange={(e) => setFilterTeacher(e.target.value)}
                        style={{
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: '1px solid #e5e7eb',
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            minWidth: '160px',
                        }}
                    >
                        <option value="all">Все учителя</option>
                        {teacherOptions.map((t) => (
                            <option key={t} value={t}>
                                {t}
                            </option>
                        ))}
                    </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <label htmlFor="type-filter" style={{ fontWeight: 500, fontSize: '0.9rem' }}>
                        Тип:
                    </label>
                    <select
                        id="type-filter"
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        style={{
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: '1px solid #e5e7eb',
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            minWidth: '150px',
                        }}
                    >
                        <option value="all">Все типы</option>
                        {LESSON_TYPES.map((t) => (
                            <option key={t} value={t}>
                                {t}
                            </option>
                        ))}
                    </select>
                </div>

                <span
                    style={{
                        marginLeft: 'auto',
                        fontSize: '0.85rem',
                        color: 'var(--color-text-muted)',
                    }}
                >
                    Найдено уроков: <strong>{filteredLessons.length}</strong> из {allLessons.length}
                </span>

                <button
                    onClick={resetAll}
                    style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: '1px solid #e5e7eb',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        backgroundColor: '#f8fafc',
                        fontWeight: 500,
                    }}
                >
                    Сбросить
                </button>
            </div>

            {/* Сводка по типам */}
            <div
                className="card"
                style={{
                    marginBottom: '1.5rem',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                    alignItems: 'center',
                }}
            >
                <span style={{ fontWeight: 500, fontSize: '0.9rem', marginRight: '0.5rem' }}>Сводка:</span>
                {LESSON_TYPES.map((t) => {
                    const colors = TYPE_COLORS[t];
                    return (
                        <span
                            key={t}
                            style={{
                                padding: '4px 10px',
                                borderRadius: '6px',
                                fontSize: '0.85rem',
                                backgroundColor: colors.bg,
                                color: colors.text,
                                fontWeight: 500,
                            }}
                        >
                            {t}: {typeCounts[t] || 0}
                        </span>
                    );
                })}
            </div>

            {/* Таблица уроков */}
            <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f8fafc' }}>
                            <th
                                style={{
                                    padding: '10px 12px',
                                    textAlign: 'left',
                                    borderBottom: '2px solid #e2e8f0',
                                    minWidth: '70px',
                                }}
                            >
                                Класс
                            </th>
                            <th
                                style={{
                                    padding: '10px 12px',
                                    textAlign: 'left',
                                    borderBottom: '2px solid #e2e8f0',
                                    minWidth: '110px',
                                }}
                            >
                                День
                            </th>
                            <th
                                style={{
                                    padding: '10px 12px',
                                    textAlign: 'left',
                                    borderBottom: '2px solid #e2e8f0',
                                    minWidth: '110px',
                                }}
                            >
                                Время
                            </th>
                            <th
                                style={{
                                    padding: '10px 12px',
                                    textAlign: 'left',
                                    borderBottom: '2px solid #e2e8f0',
                                    minWidth: '180px',
                                }}
                            >
                                Предмет
                            </th>
                            <th
                                style={{
                                    padding: '10px 12px',
                                    textAlign: 'left',
                                    borderBottom: '2px solid #e2e8f0',
                                    minWidth: '140px',
                                }}
                            >
                                Учитель
                            </th>
                            <th
                                style={{
                                    padding: '10px 12px',
                                    textAlign: 'center',
                                    borderBottom: '2px solid #e2e8f0',
                                    minWidth: '170px',
                                }}
                            >
                                Тип урока
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredLessons.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={6}
                                    style={{
                                        padding: '2rem',
                                        textAlign: 'center',
                                        color: 'var(--color-text-muted)',
                                    }}
                                >
                                    Нет уроков, соответствующих фильтрам
                                </td>
                            </tr>
                        ) : (
                            filteredLessons.map((lesson, idx) => {
                                const currentType = lessonTypes[lesson.key] || DEFAULT_TYPE;
                                const colors = TYPE_COLORS[currentType] || TYPE_COLORS[DEFAULT_TYPE];
                                return (
                                    <tr
                                        key={lesson.key + '_' + idx}
                                        style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#f9fafb' }}
                                    >
                                        <td
                                            style={{
                                                padding: '8px 12px',
                                                borderBottom: '1px solid #f1f5f9',
                                                fontWeight: 500,
                                            }}
                                        >
                                            {lesson.className}
                                        </td>
                                        <td
                                            style={{
                                                padding: '8px 12px',
                                                borderBottom: '1px solid #f1f5f9',
                                                color: 'var(--color-text-muted)',
                                            }}
                                        >
                                            {lesson.dayName}
                                        </td>
                                        <td
                                            style={{
                                                padding: '8px 12px',
                                                borderBottom: '1px solid #f1f5f9',
                                                whiteSpace: 'nowrap',
                                                fontFamily: 'monospace',
                                                fontSize: '0.85rem',
                                            }}
                                        >
                                            {lesson.time}
                                        </td>
                                        <td
                                            style={{
                                                padding: '8px 12px',
                                                borderBottom: '1px solid #f1f5f9',
                                            }}
                                        >
                                            {lesson.subject}
                                        </td>
                                        <td
                                            style={{
                                                padding: '8px 12px',
                                                borderBottom: '1px solid #f1f5f9',
                                                fontWeight: 500,
                                            }}
                                        >
                                            {lesson.teacher}
                                        </td>
                                        <td
                                            style={{
                                                padding: '8px 12px',
                                                borderBottom: '1px solid #f1f5f9',
                                                textAlign: 'center',
                                            }}
                                        >
                                            <select
                                                value={currentType}
                                                onChange={(e) => updateLessonType(lesson, e.target.value)}
                                                style={{
                                                    padding: '6px 10px',
                                                    borderRadius: '6px',
                                                    border: '1px solid transparent',
                                                    fontSize: '0.85rem',
                                                    cursor: 'pointer',
                                                    backgroundColor: colors.bg,
                                                    color: colors.text,
                                                    fontWeight: 500,
                                                    outline: 'none',
                                                    minWidth: '150px',
                                                }}
                                                onFocus={(e) => {
                                                    e.target.style.borderColor = colors.text;
                                                }}
                                                onBlur={(e) => {
                                                    e.target.style.borderColor = 'transparent';
                                                }}
                                            >
                                                {LESSON_TYPES.map((t) => (
                                                    <option key={t} value={t}>
                                                        {t}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default LessonTypesPage;
