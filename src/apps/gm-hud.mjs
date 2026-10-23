// HUD do Mestre: autoria das mesmas settings que o HUD do jogador lê.
import { HUD_CSS } from './journal-hud-view.mjs';
import { GM_CSS, buildGmRoot, renderGmPage } from './gm-hud-view.mjs';
import {
    GM_TABS,
    blankRecord,
    clampNumber,
    displayName,
    normalizeList,
    normalizeRecord,
    removeRecord,
    upsertRecord,
    validateRecord,
} from './gm-hud-data.mjs';
import { SETTINGS, getWorldFlag, setWorldFlag } from './system-menu.mjs';
const HUD_STYLE_ID = 'tgo-journal-style';
const GM_STYLE_ID = 'tgo-gm-style';
let gmHud = null;

function ensureStyle(id, css) {
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = css;
    document.head.appendChild(style);
}
export class GmHUD extends foundry.applications.api.ApplicationV2 {
    static DEFAULT_OPTIONS = {
        id: 'tgo-gm-hud',
        classes: ['tgo-journal', 'tgo-gm'],
        window: {
            frame: false,
            positioned: false,
            resizable: false,
        },
    };
    _tab = 'story';
    _data = null;
    _draft = null;
    _mapImage = '';
    _boundClick = null;
    _boundSubmit = null;
    _onKeyDown = null;
    _renderHTML() {
        ensureStyle(HUD_STYLE_ID, HUD_CSS);
        ensureStyle(GM_STYLE_ID, GM_CSS);
        return buildGmRoot(this._tab);
    }
    _replaceHTML(result, content) {
        content.innerHTML = result;
    }
    async _onRender() {
        if (!game.user?.isGM) {
            this.close();
            return;
        }
        if (!this._boundClick) {
            this._boundClick = (event) => this._onClick(event);
            this.element.addEventListener('click', this._boundClick);
        }
        if (!this._boundSubmit) {
            this._boundSubmit = (event) => {
                event.preventDefault();
                this._save();
            };
            this.element.addEventListener('submit', this._boundSubmit);
        }
        if (this._onKeyDown) document.removeEventListener('keydown', this._onKeyDown);
        this._onKeyDown = (event) => {
            if (event.key !== 'Escape') return;
            const active = document.activeElement;
            if (active && ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName)) return;
            this.close();
        };
        document.addEventListener('keydown', this._onKeyDown);
        if (!this._data) await this._load();
        await this._mount();
    }
    async _load() {
        const read = async (key, fallback) => {
            try {
                return await getWorldFlag(SETTINGS[key], fallback);
            } catch {
                return fallback;
            }
        };
        this._data = {
            story: normalizeList('story', await read('story', [])),
            quests: normalizeList('quests', await read('quests', [])),
            events: normalizeList('events', await read('events', [])),
            map: normalizeList('map', await read('mapPins', [])),
            npcs: normalizeList('npcs', await read('npcs', [])),
            rules: normalizeList('rules', await read('rules', [])),
        };
        this._mapImage = String((await read('mapImage', '')) ?? '');
        this._draft = this._data[this._tab]?.[0] ?? blankRecord(this._tab);
    }
    async _mount() {
        if (!this._data) return;
        if (!this._draft) this._draft = this._data[this._tab]?.[0] ?? blankRecord(this._tab);
        const body = this.element?.querySelector('#tgo-gm-body');
        if (body) {
            body.innerHTML = renderGmPage(this._tab, {
                records: this._data[this._tab] ?? [],
                draft: this._draft,
                mapImage: this._mapImage,
            });
        }
        this.element?.querySelectorAll('[data-gm-tab]').forEach((button) => {
            button.classList.toggle('is-active', button.dataset.gmTab === this._tab);
        });
    }
    _onClick(event) {
        const target =
            event.target instanceof Element
                ? event.target.closest(
                      '[data-gm-tab],[data-gm-close],[data-gm-select],[data-gm-new],[data-gm-save],[data-gm-delete]'
                  )
                : null;
        if (target) {
            if ('gmClose' in target.dataset) {
                this.close();
                return;
            }
            if (target.dataset.gmTab) {
                this._selectTab(target.dataset.gmTab);
                return;
            }
            if (target.dataset.gmSelect) {
                this._selectRecord(target.dataset.gmSelect);
                return;
            }
            if ('gmNew' in target.dataset) {
                this._newRecord();
                return;
            }
            if ('gmSave' in target.dataset) {
                this._save();
                return;
            }
            if ('gmDelete' in target.dataset) {
                this._delete();
                return;
            }
        }
        const preview =
            event.target instanceof Element ? event.target.closest('[data-gm-mapclick]') : null;
        if (preview && this._tab === 'map') this._placePin(event, preview);
    }
    _selectTab(id) {
        if (!GM_TABS.some((entry) => entry.id === id)) return;
        this._tab = id;
        this._draft = this._data?.[id]?.[0] ?? blankRecord(id);
        this._mount();
    }
    _selectRecord(id) {
        const record = (this._data?.[this._tab] ?? []).find((entry) => entry.id === id);
        if (!record) return;
        this._draft = {
            ...record,
        };
        this._mount();
    }
    _newRecord() {
        this._draft = blankRecord(this._tab);
        this._mount();
    }
    async _save() {
        if (!game.user?.isGM) return;
        const form = this.element?.querySelector('[data-gm-form]');
        if (!form) return;
        const payload = Object.fromEntries(new FormData(form).entries());
        let mapImage = null;
        if (this._tab === 'map') {
            mapImage = String(payload.mapImage ?? '').trim();
            delete payload.mapImage;
        }
        const record = normalizeRecord(this._tab, {
            ...payload,
            id: this._draft?.id,
        });
        const errors = validateRecord(this._tab, record);
        if (errors.length) {
            ui.notifications.warn(`Preencha: ${errors.map((entry) => entry.label).join(', ')}`);
            return;
        }
        const tab = GM_TABS.find((entry) => entry.id === this._tab);
        if (!tab) return;
        const rows = upsertRecord(this._data[this._tab] ?? [], record);
        const saved = await setWorldFlag(SETTINGS[tab.setting], rows);
        if (saved === false) return;
        if (mapImage !== null) {
            const savedImage = await setWorldFlag(SETTINGS.mapImage, mapImage);
            if (savedImage === false) return;
            this._mapImage = mapImage;
        }
        this._data[this._tab] = rows;
        this._draft = record;
        await this._mount();
        ui.notifications.info('Salvo.');
        this._notifyPlayers();
    }
    async _delete() {
        if (!game.user?.isGM) return;
        const record = this._draft;
        const rows = this._data?.[this._tab] ?? [];
        const exists = Boolean(record && rows.some((entry) => entry.id === record.id));
        if (!exists) {
            this._draft = blankRecord(this._tab);
            await this._mount();
            return;
        }
        if (!window.confirm(`Excluir "${displayName(record)}"?`)) return;
        const tab = GM_TABS.find((entry) => entry.id === this._tab);
        if (!tab) return;
        const next = removeRecord(rows, record.id);
        const saved = await setWorldFlag(SETTINGS[tab.setting], next);
        if (saved === false) return;
        this._data[this._tab] = next;
        this._draft = next[0] ?? blankRecord(this._tab);
        await this._mount();
        ui.notifications.info('Excluído.');
        this._notifyPlayers();
    }
    _placePin(event, preview) {
        const rect = preview.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const x = Math.round(
            clampNumber(((event.clientX - rect.left) / rect.width) * 100, 0, 100, 50)
        );
        const y = Math.round(
            clampNumber(((event.clientY - rect.top) / rect.height) * 100, 0, 100, 50)
        );
        const inputX = this.element?.querySelector('[data-gm-form] input[name="x"]');
        const inputY = this.element?.querySelector('[data-gm-form] input[name="y"]');
        if (inputX) inputX.value = String(x);
        if (inputY) inputY.value = String(y);
        let marker = preview.querySelector('.tgo-gm-mappin.is-draft');
        if (!marker) {
            marker = document.createElement('span');
            marker.className = 'tgo-gm-mappin is-draft';
            preview.appendChild(marker);
        }
        marker.style.left = `${x}%`;
        marker.style.top = `${y}%`;
    }
    _notifyPlayers() {
        game.socket?.emit('system.the-glory-online', {
            type: 'hud-refresh',
        });
    }
    _onClose() {
        if (this._onKeyDown) document.removeEventListener('keydown', this._onKeyDown);
        this._onKeyDown = null;
        gmHud = null;
    }
}
export function toggleGmHud() {
    if (!game.user?.isGM) {
        ui.notifications.warn('Somente o mestre pode abrir o HUD do Mestre.');
        return;
    }
    if (gmHud?.rendered) {
        gmHud.close();
        return;
    }
    gmHud = new GmHUD();
    gmHud.render({
        force: true,
    });
}
Hooks.once('init', () => {
    game.keybindings.register('the-glory-online', 'openGmHud', {
        name: 'Abrir HUD do Mestre',
        hint: 'Autoria de história, quests, eventos, mapa, NPCs e regras.',
        editable: [
            {
                key: 'KeyG',
            },
        ],
        onDown: () => {
            toggleGmHud();
            return true;
        },
    });
    game.theGloryOnline ??= {};
    game.theGloryOnline.openGmHud = () => toggleGmHud();
});
