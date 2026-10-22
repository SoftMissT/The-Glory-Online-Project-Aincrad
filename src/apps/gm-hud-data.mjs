const STATE_LABELS = {
    active: 'ATIVA',
    new: 'NOVA',
    done: 'CONCLUÍDA',
};
const TYPE_LABELS = {
    local: 'LOCAL',
    exploration: 'EXPLORAÇÃO',
    pin: 'PIN',
};
const MAP_TYPES = [
    ['local', 'LOCAL'],
    ['exploration', 'EXPLORAÇÃO'],
    ['pin', 'PIN'],
];
const QUEST_STATES = [
    ['active', 'ATIVA'],
    ['new', 'NOVA'],
    ['done', 'CONCLUÍDA'],
];
const SCHEMAS = {
    story: [
        { key: 'title', label: 'TÍTULO', type: 'text', required: true },
        { key: 'category', label: 'CATEGORIA', type: 'text' },
        { key: 'date', label: 'DATA', type: 'text' },
        { key: 'summary', label: 'RESUMO', type: 'text' },
        { key: 'text', label: 'TEXTO', type: 'textarea' },
    ],
    quests: [
        { key: 'title', label: 'TÍTULO', type: 'text', required: true },
        { key: 'description', label: 'DESCRIÇÃO', type: 'textarea' },
        { key: 'objective', label: 'OBJETIVO', type: 'text' },
        { key: 'reward', label: 'RECOMPENSA', type: 'text' },
        { key: 'progress', label: 'PROGRESSO (%)', type: 'number', min: 0, max: 100, fallback: 0 },
        { key: 'state', label: 'ESTADO', type: 'select', options: QUEST_STATES, fallback: 'active' },
    ],
    events: [
        { key: 'title', label: 'TÍTULO', type: 'text', required: true },
        { key: 'status', label: 'STATUS', type: 'text' },
        { key: 'date', label: 'DATA', type: 'text' },
        { key: 'place', label: 'LOCAL', type: 'text' },
        { key: 'text', label: 'TEXTO', type: 'textarea' },
    ],
    map: [
        { key: 'name', label: 'NOME', type: 'text', required: true },
        { key: 'type', label: 'TIPO', type: 'select', options: MAP_TYPES, fallback: 'local' },
        { key: 'status', label: 'STATUS', type: 'text' },
        { key: 'favorite', label: 'FAVORITO', type: 'checkbox' },
        { key: 'x', label: 'X (%)', type: 'number', min: 0, max: 100, fallback: 50 },
        { key: 'y', label: 'Y (%)', type: 'number', min: 0, max: 100, fallback: 50 },
    ],
    npcs: [
        { key: 'name', label: 'NOME', type: 'text', required: true },
        { key: 'role', label: 'PAPEL', type: 'text' },
        { key: 'status', label: 'STATUS', type: 'text' },
        { key: 'img', label: 'IMAGEM (URL)', type: 'text' },
        { key: 'note', label: 'NOTA', type: 'textarea' },
    ],
    rules: [
        { key: 'title', label: 'TÍTULO', type: 'text', required: true },
        { key: 'summary', label: 'RESUMO', type: 'text' },
        { key: 'text', label: 'TEXTO', type: 'textarea' },
    ],
};
export const GM_TABS = [
    { id: 'story', label: 'HISTÓRIA', setting: 'story' },
    { id: 'quests', label: 'QUESTS', setting: 'quests' },
    { id: 'events', label: 'EVENTOS', setting: 'events' },
    { id: 'map', label: 'MAPA', setting: 'mapPins' },
    { id: 'npcs', label: 'NPCs', setting: 'npcs' },
    { id: 'rules', label: 'SISTEMA', setting: 'rules' },
];
let sequence = 0;
export function newId() {
    const uuid = globalThis.crypto?.randomUUID?.();
    if (uuid) return uuid;
    sequence += 1;
    return `gm-${Date.now().toString(36)}-${sequence}`;
}
export function clampNumber(value, min, max, fallback = 0) {
    if (value === '' || value == null) return fallback;
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    if (min != null && number < min) return min;
    if (max != null && number > max) return max;
    return number;
}
export function schemaFor(tab) {
    return SCHEMAS[tab] ?? [];
}
export function blankRecord(tab) {
    const record = { id: newId() };
    for (const field of schemaFor(tab)) {
        if (field.type === 'number') record[field.key] = field.fallback ?? 0;
        else if (field.type === 'checkbox') record[field.key] = Boolean(field.fallback);
        else if (field.type === 'select') record[field.key] = field.fallback ?? field.options?.[0]?.[0] ?? '';
        else record[field.key] = '';
    }
    return record;
}
export function normalizeRecord(tab, raw) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const record = { ...source, id: source.id ? String(source.id) : newId() };
    for (const field of schemaFor(tab)) {
        const value = source[field.key];
        if (field.type === 'number') record[field.key] = clampNumber(value, field.min, field.max, field.fallback ?? 0);
        else if (field.type === 'checkbox') record[field.key] = value === true || value === 'on' || value === 'true' || value === 1 || value === '1';
        else if (field.type === 'select') {
            const options = field.options ?? [];
            record[field.key] = options.some(([option]) => option === value) ? value : field.fallback ?? options[0]?.[0] ?? '';
        } else record[field.key] = String(value ?? '').trim();
    }
    if (tab === 'npcs' && !record.name && source.title) record.name = String(source.title).trim();
    return record;
}
export function normalizeList(tab, value) {
    return Array.isArray(value)
        ? value.filter((entry) => entry && typeof entry === 'object').map((entry) => normalizeRecord(tab, entry))
        : [];
}
export function upsertRecord(list, record) {
    const rows = Array.isArray(list) ? list : [];
    const index = rows.findIndex((entry) => entry.id === record.id);
    if (index === -1) return [...rows, record];
    const next = rows.slice();
    next[index] = record;
    return next;
}
export function removeRecord(list, id) {
    return (Array.isArray(list) ? list : []).filter((entry) => entry.id !== id);
}
export function validateRecord(tab, record) {
    const errors = [];
    for (const field of schemaFor(tab)) {
        if (!field.required) continue;
        if (String(record?.[field.key] ?? '').trim() === '') errors.push({ key: field.key, label: field.label });
    }
    return errors;
}
export function displayName(record) {
    const value = String(record?.name || record?.title || '').trim();
    return value || 'Sem título';
}
export function subtitleFor(tab, record) {
    const item = record ?? {};
    if (tab === 'story') return [item.category, item.date].filter(Boolean).join(' · ');
    if (tab === 'quests') return [STATE_LABELS[item.state] ?? 'ATIVA', `${clampNumber(item.progress, 0, 100, 0)}%`].join(' · ');
    if (tab === 'events') return [item.status, item.date, item.place].filter(Boolean).join(' · ');
    if (tab === 'npcs') return [item.role, item.status].filter(Boolean).join(' · ');
    if (tab === 'rules') return String(item.summary ?? '').trim();
    if (tab === 'map') return [TYPE_LABELS[item.type] ?? 'LOCAL', item.status].filter(Boolean).join(' · ');
    return '';
}
