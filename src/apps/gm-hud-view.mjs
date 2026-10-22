import { esc } from './journal-hud-data.mjs';
import { GM_TABS, clampNumber, displayName, schemaFor, subtitleFor } from './gm-hud-data.mjs';

export const GM_CSS = `
.tgo-gm .tgo-hud-nav {
    grid-template-columns: repeat(var(--tgo-gm-tabs, 6), minmax(0, 1fr)) 56px;
}
.tgo-gm .tgo-hud-list {
    flex: 0 0 340px;
}
.tgo-gm-listhead {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding-bottom: 2px;
}
.tgo-gm-count {
    font-family: var(--tgo-font-mono, 'Share Tech Mono', monospace);
    font-size: 11px;
    letter-spacing: 0.16em;
    color: var(--tgo-hud-dim);
}
.tgo-gm-row {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 14px 16px;
}
.tgo-gm-rowtitle {
    font-size: 16px;
    font-weight: 700;
    letter-spacing: 0.05em;
    color: var(--tgo-hud-ink);
}
.tgo-gm-rowsub {
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--tgo-hud-dim);
}
.tgo-gm-empty {
    margin: 0;
    padding: 18px 4px;
    font-size: 13px;
    letter-spacing: 0.06em;
    color: var(--tgo-hud-dim);
}
.tgo-gm-form {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px 18px;
    align-content: start;
}
.tgo-gm-field {
    display: flex;
    flex-direction: column;
    gap: 7px;
    min-width: 0;
}
.tgo-gm-field.is-wide {
    grid-column: 1 / -1;
}
.tgo-gm-field.is-check {
    flex-direction: row;
    align-items: center;
    gap: 10px;
}
.tgo-gm-field > span {
    font-family: var(--tgo-font-mono, 'Share Tech Mono', monospace);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.16em;
    color: var(--tgo-hud-dim);
}
.tgo-gm-field input,
.tgo-gm-field textarea,
.tgo-gm-field select {
    box-sizing: border-box;
    width: 100%;
    min-width: 0;
    padding: 10px 12px;
    border: 1px solid rgba(95, 216, 240, 0.28);
    border-radius: 6px;
    background: rgba(4, 10, 17, 0.78);
    color: var(--tgo-hud-ink);
    font-family: inherit;
    font-size: 15px;
    line-height: 1.4;
}
.tgo-gm-field textarea {
    min-height: 120px;
    resize: vertical;
}
.tgo-gm-field input[type='checkbox'] {
    width: 18px;
    height: 18px;
    accent-color: var(--tgo-hud-cyan);
}
.tgo-gm-field input:focus,
.tgo-gm-field textarea:focus,
.tgo-gm-field select:focus {
    outline: none;
    border-color: var(--tgo-hud-cyan);
    box-shadow: 0 0 0 2px rgba(95, 216, 240, 0.18);
}
.tgo-gm-field option {
    color: var(--tgo-hud-ink);
    background: #040a11;
}
.tgo-gm-actions {
    grid-column: 1 / -1;
    display: flex;
    align-items: center;
    gap: 12px;
    padding-top: 10px;
}
.tgo-gm-btn {
    padding: 11px 18px;
    border: 1px solid rgba(95, 216, 240, 0.32);
    border-radius: 7px;
    background: rgba(4, 10, 17, 0.7);
    color: var(--tgo-hud-ink);
    font-family: inherit;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.14em;
    cursor: pointer;
}
.tgo-gm-btn:hover:not(:disabled) {
    border-color: var(--tgo-hud-cyan);
    color: var(--tgo-hud-cyan);
}
.tgo-gm-btn.is-primary {
    border-color: var(--tgo-hud-cyan);
    background: rgba(95, 216, 240, 0.14);
    color: var(--tgo-hud-cyan);
}
.tgo-gm-btn.is-danger:hover:not(:disabled) {
    border-color: #ff7b7b;
    color: #ff7b7b;
}
.tgo-gm-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
}
.tgo-gm-hint {
    font-family: var(--tgo-font-mono, 'Share Tech Mono', monospace);
    font-size: 11px;
    letter-spacing: 0.12em;
    color: var(--tgo-hud-dim);
}
.tgo-gm-mapbox {
    grid-column: 1 / -1;
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding-bottom: 14px;
    border-bottom: 1px solid rgba(95, 216, 240, 0.18);
}
.tgo-gm-mappreview {
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 9;
    overflow: hidden;
    border: 1px solid rgba(95, 216, 240, 0.28);
    border-radius: 8px;
    background: rgba(4, 10, 17, 0.7);
    cursor: crosshair;
}
.tgo-gm-mappreview img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
}
.tgo-gm-mappreview .tgo-gm-empty {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    padding: 0;
}
.tgo-gm-mappin {
    position: absolute;
    width: 12px;
    height: 12px;
    margin: -6px 0 0 -6px;
    border: 1px solid #040a11;
    border-radius: 50%;
    background: var(--tgo-hud-gold);
    box-shadow: 0 0 8px rgba(240, 192, 80, 0.7);
    pointer-events: none;
}
.tgo-gm-mappin.is-draft {
    background: var(--tgo-hud-cyan);
    box-shadow: 0 0 0 2px rgba(95, 216, 240, 0.35);
}
@media (max-width: 1100px) {
    .tgo-gm-form {
        grid-template-columns: 1fr;
    }
    .tgo-gm-field {
        grid-column: 1 / -1;
    }
}
@media (max-width: 900px) {
    .tgo-gm .tgo-hud-list {
        flex: 0 0 auto;
        max-height: 42%;
    }
}
`;
export function buildGmRoot(tab) {
    const tabs = GM_TABS.map((entry) => {
        const active = entry.id === tab ? ' is-active' : '';
        return `<button type="button" class="tgo-hud-tab${active}" data-gm-tab="${entry.id}">${entry.label}</button>`;
    }).join('');
    return `
        <div class="tgo-hud tgo-gm" style="--tgo-gm-tabs:${GM_TABS.length}">
            <header class="tgo-hud-nav">${tabs}<button type="button" class="tgo-hud-close" data-gm-close aria-label="Fechar">×</button></header>
            <div class="tgo-hud-body" id="tgo-gm-body"></div>
        </div>`;
}
export function renderGmPage(tab, { records = [], draft = null, mapImage = '' } = {}) {
    const rows = Array.isArray(records) ? records : [];
    const inList = Boolean(draft && rows.some((entry) => entry.id === draft.id));
    const list = rows.length
        ? rows.map((record) => rowMarkup(tab, record, record.id === draft?.id)).join('')
        : `<p class="tgo-gm-empty">Nenhum registro. Use NOVO.</p>`;
    return `
        <div class="tgo-hud-split tgo-gm-split">
            <aside class="tgo-hud-list tgo-gm-list">
                <div class="tgo-gm-listhead">
                    <span class="tgo-gm-count">${rows.length} REGISTRO${rows.length === 1 ? '' : 'S'}</span>
                    <button type="button" class="tgo-gm-btn" data-gm-new>NOVO</button>
                </div>
                ${list}
            </aside>
            <section class="tgo-hud-detail tgo-gm-editor">
                ${editorMarkup(tab, draft, inList, mapImage, rows)}
            </section>
        </div>`;
}
function rowMarkup(tab, record, active) {
    const subtitle = subtitleFor(tab, record);
    return `<button type="button" class="tgo-hud-card tgo-gm-row${active ? ' is-active' : ''}" data-gm-select="${esc(record.id)}">
        <span class="tgo-gm-rowtitle">${esc(displayName(record))}</span>
        ${subtitle ? `<span class="tgo-gm-rowsub">${esc(subtitle)}</span>` : ''}
    </button>`;
}
function editorMarkup(tab, draft, inList, mapImage, rows) {
    const record = draft ?? {};
    const fields = schemaFor(tab).map((field) => fieldMarkup(field, record[field.key])).join('');
    const mapBox = tab === 'map' ? mapBoxMarkup(mapImage, rows) : '';
    return `
        <form class="tgo-gm-form" data-gm-form="${tab}">
            ${mapBox}
            ${fields}
            <div class="tgo-gm-actions">
                <button type="button" class="tgo-gm-btn is-primary" data-gm-save>SALVAR</button>
                <button type="button" class="tgo-gm-btn is-danger" data-gm-delete${inList ? '' : ' disabled'}>EXCLUIR</button>
                <span class="tgo-gm-hint">${inList ? 'EDITANDO' : 'NOVO — AINDA NÃO SALVO'}</span>
            </div>
        </form>`;
}
function mapBoxMarkup(mapImage, rows) {
    const pins = rows.map((pin) => {
        const x = clampNumber(pin.x, 0, 100, 50);
        const y = clampNumber(pin.y, 0, 100, 50);
        return `<span class="tgo-gm-mappin" style="left:${x}%;top:${y}%" title="${esc(displayName(pin))}"></span>`;
    }).join('');
    return `
        <div class="tgo-gm-mapbox">
            <label class="tgo-gm-field is-wide"><span>IMAGEM DO MAPA</span><input type="text" name="mapImage" value="${esc(mapImage)}" placeholder="systems/the-glory-online/assets/mapa.webp"></label>
            <div class="tgo-gm-mappreview" data-gm-mapclick title="Clique para posicionar o pin selecionado">
                ${mapImage ? `<img src="${esc(mapImage)}" alt="">` : '<span class="tgo-gm-empty">Defina a imagem para posicionar pins.</span>'}
                ${pins}
            </div>
        </div>`;
}
function fieldMarkup(field, value) {
    const label = `${field.label}${field.required ? ' *' : ''}`;
    const id = `tgo-gm-field-${field.key}`;
    if (field.type === 'textarea') {
        return `<label class="tgo-gm-field is-wide" for="${id}"><span>${esc(label)}</span><textarea id="${id}" name="${field.key}" rows="6">${esc(value ?? '')}</textarea></label>`;
    }
    if (field.type === 'number') {
        const min = field.min == null ? '' : ` min="${field.min}"`;
        const max = field.max == null ? '' : ` max="${field.max}"`;
        return `<label class="tgo-gm-field" for="${id}"><span>${esc(label)}</span><input id="${id}" name="${field.key}" type="number" step="1"${min}${max} value="${esc(value ?? '')}"></label>`;
    }
    if (field.type === 'select') {
        const options = (field.options ?? []).map(([option, text]) => {
            const selected = option === value ? ' selected' : '';
            return `<option value="${esc(option)}"${selected}>${esc(text)}</option>`;
        }).join('');
        return `<label class="tgo-gm-field" for="${id}"><span>${esc(label)}</span><select id="${id}" name="${field.key}">${options}</select></label>`;
    }
    if (field.type === 'checkbox') {
        return `<label class="tgo-gm-field is-check"><input id="${id}" name="${field.key}" type="checkbox"${value ? ' checked' : ''}><span>${esc(label)}</span></label>`;
    }
    const wide = field.key === 'title' || field.key === 'name' ? ' is-wide' : '';
    return `<label class="tgo-gm-field${wide}" for="${id}"><span>${esc(label)}</span><input id="${id}" name="${field.key}" type="text" value="${esc(value ?? '')}"></label>`;
}
