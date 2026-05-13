import React from 'react';
import { Users, GraduationCap, UserCircle } from 'lucide-react';

const TABS = [
    { id: 'all', label: 'Все', icon: Users },
    { id: 'teachers', label: 'Учителя', icon: GraduationCap },
    { id: 'tutors', label: 'Тьюторы', icon: UserCircle },
];

export const isTutor = (teacher) => teacher?.subject === 'Тьютор';

export const filterByRole = (teachers, role) => {
    if (role === 'tutors') return teachers.filter(isTutor);
    if (role === 'teachers') return teachers.filter(t => !isTutor(t));
    return teachers;
};

const RoleFilterTabs = ({ value, onChange, counts }) => {
    return (
        <div style={{
            display: 'flex',
            gap: '0.5rem',
            marginBottom: '1.5rem',
            borderBottom: '1px solid #e5e7eb',
            paddingBottom: '0.5rem'
        }}>
            {TABS.map(tab => {
                const Icon = tab.icon;
                const isActive = value === tab.id;
                const count = counts?.[tab.id];
                return (
                    <button
                        key={tab.id}
                        onClick={() => onChange(tab.id)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            padding: '8px 14px',
                            borderRadius: '8px',
                            border: '2px solid',
                            borderColor: isActive ? 'var(--color-primary)' : 'transparent',
                            backgroundColor: isActive ? 'var(--color-moss-tint)' : 'transparent',
                            color: isActive ? 'var(--color-primary-deep)' : '#6b7280',
                            fontWeight: 500,
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        <Icon size={16} />
                        {tab.label}
                        {count !== undefined && (
                            <span style={{
                                fontSize: '0.75rem',
                                padding: '1px 7px',
                                borderRadius: '10px',
                                backgroundColor: isActive ? 'var(--color-primary)' : '#e5e7eb',
                                color: isActive ? '#fff' : '#6b7280',
                                fontWeight: 600
                            }}>
                                {count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
};

export default RoleFilterTabs;
