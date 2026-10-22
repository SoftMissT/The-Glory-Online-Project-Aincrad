// Dados puros do HUD J: sem API do Foundry, para poder testar no Node.
export const HUD_TABS = Object.freeze([
    {
        id: 'lore',
        label: 'LORE',
    },
    {
        id: 'quests',
        label: 'QUESTS',
    },
    {
        id: 'events',
        label: 'EVENTOS',
    },
    {
        id: 'map',
        label: 'MAPA',
    },
    {
        id: 'npcs',
        label: 'NPCs',
    },
    {
        id: 'system',
        label: 'SISTEMA',
    },
    {
        id: 'shortcuts',
        label: 'ATALHOS',
    },
]);
export const MAP_TYPES = Object.freeze([
    {
        id: 'local',
        label: 'LOCAIS',
    },
    {
        id: 'exploration',
        label: 'EXPLORAÇÃO',
    },
    {
        id: 'pin',
        label: 'PINS',
    },
]);
export function esc(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}
export function clamp(value, min, max) {
    const number = Number(value);
    if (!Number.isFinite(number)) return min;
    return Math.min(max, Math.max(min, number));
}
export function splitParagraphs(text) {
    return String(text ?? '')
        .split(/\n{2,}/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean);
}
export function textSummary(text, max = 120) {
    const clean = String(text ?? '')
        .replace(/\s+/g, ' ')
        .trim();
    if (clean.length <= max) return clean;
    return `${clean.slice(0, max - 1).trimEnd()}…`;
}
export function progressValue(value) {
    return clamp(value, 0, 100);
}
export function questState(quest) {
    const state = String(quest?.state ?? 'active').toLowerCase();
    if (['done', 'complete', 'completed', 'concluida', 'concluída'].includes(state)) {
        return {
            id: 'done',
            label: 'CONCLUÍDA',
        };
    }
    if (['new', 'nova'].includes(state))
        return {
            id: 'new',
            label: 'NOVA',
        };
    return {
        id: 'active',
        label: 'ATIVA',
    };
}
export function normalizeRecords(value) {
    return Array.isArray(value) ? value.filter((entry) => entry && typeof entry === 'object') : [];
}
export function normalizePins(value) {
    if (!Array.isArray(value)) return [];
    const types = new Set(MAP_TYPES.map((type) => type.id));
    return value
        .map((pin, index) => {
            const name = String(pin?.name ?? '').trim();
            if (!name) return null;
            return {
                id: String(pin?.id ?? `pin-${index}`),
                name,
                x: clamp(pin?.x ?? 50, 0, 100),
                y: clamp(pin?.y ?? 50, 0, 100),
                type: types.has(pin?.type) ? pin.type : 'local',
                status: String(pin?.status ?? '').trim(),
                favorite: Boolean(pin?.favorite),
            };
        })
        .filter(Boolean);
}
