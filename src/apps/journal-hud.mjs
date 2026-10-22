import { getQuests } from './system-menu.mjs';
import { HUD_TABS, clamp, normalizePins, normalizeRecords } from './journal-hud-data.mjs';
import { HUD_CSS, buildRoot, renderPage } from './journal-hud-view.mjs';
const NS = 'sao-system-menu';
const STYLE_ID = 'tgo-journal-style';
let hud = null;

function readSetting(key, fallback) {
    try {
        return game.settings.get(NS, key) ?? fallback;
    } catch {
        return fallback;
    }
}

function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = HUD_CSS;
    document.head.append(style);
}
export class JournalHUD extends foundry.applications.api.ApplicationV2 {
    static DEFAULT_OPTIONS = {
        id: 'tgo-journal-hud',
        classes: ['tgo-journal'],
        window: {
            frame: false,
            positioned: false,
            resizable: false,
        },
        position: {
            width: 1280,
            height: 800,
        },
    };
    _tab = 'lore';
    _selected = {
        lore: 0,
        quests: 0,
        events: 0,
        npcs: 0,
        system: 0,
        map: null,
    };
    _map = {
        type: 'local',
        labels: true,
        favoritesOnly: false,
    };
    _mapView = {
        z: 1,
        x: 0,
        y: 0,
    };
    _mapSize = null;
    _data = null;
    _suppressMapClick = false;
    _onResize = null;
    _onKeyDown = null;
    _renderHTML() {
        return buildRoot(this._tab);
    }
    _replaceHTML(result, content) {
        content.replaceChildren(result);
    }
    async _onRender() {
        injectStyle();
        this.element.addEventListener('click', (event) => this._onClick(event));
        this._onKeyDown = (event) => this._handleKey(event);
        document.addEventListener('keydown', this._onKeyDown);
        await this._mount();
    }
    async _mount() {
        const body = this.element.querySelector('#tgo-hud-body');
        if (!body) return;
        const previousList = body.querySelector('.tgo-hud-list');
        const scrollTop = previousList?.scrollTop ?? 0;
        this._data ??= await this._load();
        body.innerHTML = renderPage(this._tab, this._data, {
            selected: this._selected,
            map: this._map,
        });
        const nextList = body.querySelector('.tgo-hud-list');
        if (nextList) nextList.scrollTop = scrollTop;
        if (this._tab === 'map') this._bindMap();
        else this._unbindResize();
    }
    async _load() {
        const quests = await getQuests();
        return {
            story: normalizeRecords(readSetting('story', [])),
            quests: Array.isArray(quests) ? quests : [],
            events: normalizeRecords(readSetting('events', [])),
            npcs: normalizeRecords(readSetting('npcs', [])),
            rules: normalizeRecords(readSetting('rules', [])),
            mapImage: String(readSetting('mapImage', '') ?? ''),
            pins: normalizePins(readSetting('mapPins', [])),
        };
    }
    _onClick(event) {
        const target = event.target;
        if (!(target instanceof Element)) return;
        if (target.closest('[data-hud-close]')) {
            this.close();
            return;
        }
        const tab = target.closest('[data-hud-tab]');
        if (tab) {
            this._openTab(tab.dataset.hudTab);
            return;
        }
        const item = target.closest('[data-hud-item]');
        if (item) {
            this._selectItem(Number(item.dataset.hudItem));
            return;
        }
        const mapType = target.closest('[data-map-type]');
        if (mapType) {
            this._map.type = mapType.dataset.mapType;
            this._selected.map = null;
            this._mount();
            return;
        }
        if (target.closest('[data-map-center]')) {
            this._centerMap();
            return;
        }
        if (target.closest('[data-map-layers]')) {
            this._toggleLayers();
            return;
        }
        if (target.closest('[data-map-filter]')) {
            this._map.favoritesOnly = !this._map.favoritesOnly;
            this._selected.map = null;
            this._mount();
            return;
        }
        const pin = target.closest('[data-map-pin]');
        if (pin) {
            if (this._suppressMapClick) return;
            this._selectMapPin(pin.dataset.mapPin);
        }
    }
    _openTab(id) {
        if (!HUD_TABS.some((tab) => tab.id === id) || id === this._tab) return;
        this._tab = id;
        this.element.querySelectorAll('[data-hud-tab]').forEach((button) => {
            const active = button.dataset.hudTab === id;
            button.classList.toggle('is-active', active);
            button.setAttribute('aria-selected', String(active));
        });
        this._mount();
    }
    _selectItem(index) {
        if (!Number.isInteger(index) || index < 0) return;
        this._selected[this._tab] = index;
        this._mount();
    }
    _handleKey(event) {
        if (!this.rendered) return;
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        const target = event.target;
        if (
            target instanceof HTMLElement &&
            target.closest('input, textarea, select, [contenteditable="true"]')
        )
            return;
        if (event.key === 'Escape') {
            event.preventDefault();
            this.close();
            return;
        }
        if (event.key === '?') {
            event.preventDefault();
            this._openTab('shortcuts');
            return;
        }
        if (/^[1-7]$/.test(event.key)) {
            event.preventDefault();
            this._openTab(HUD_TABS[Number(event.key) - 1].id);
            return;
        }
        if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
            event.preventDefault();
            const current = HUD_TABS.findIndex((tab) => tab.id === this._tab);
            const offset = event.key === 'ArrowRight' ? 1 : -1;
            this._openTab(HUD_TABS[(current + offset + HUD_TABS.length) % HUD_TABS.length].id);
            return;
        }
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            const focusables = [
                ...this.element.querySelectorAll(
                    '.tgo-hud-list .tgo-hud-card, .tgo-hud-mappanel [data-map-pin]'
                ),
            ];
            const current = focusables.indexOf(document.activeElement);
            if (current < 0) return;
            event.preventDefault();
            const offset = event.key === 'ArrowDown' ? 1 : -1;
            focusables[(current + offset + focusables.length) % focusables.length].focus();
        }
    }
    _bindMap() {
        const root = this.element.querySelector('.tgo-hud-map');
        const view = root?.querySelector('[data-map-view]');
        const layer = root?.querySelector('[data-map-layer]');
        const img = root?.querySelector('[data-map-img]');
        if (!root || !view || !layer || !img) {
            this._unbindResize();
            return;
        }
        if (img.complete && img.naturalWidth) this._fitMap();
        else
            img.addEventListener('load', () => this._fitMap(), {
                once: true,
            });
        view.addEventListener(
            'wheel',
            (event) => {
                if (!this._mapSize) return;
                event.preventDefault();
                this._mapView.z = clamp(this._mapView.z * (event.deltaY < 0 ? 1.15 : 0.87), 1, 4);
                this._clampMap();
                this._applyMap();
            },
            {
                passive: false,
            }
        );
        let drag = null;
        view.addEventListener('pointerdown', (event) => {
            if (event.button !== 0) return;
            drag = {
                id: event.pointerId,
                x: event.clientX,
                y: event.clientY,
                px: this._mapView.x,
                py: this._mapView.y,
                moved: false,
            };
            this._suppressMapClick = false;
            view.setPointerCapture(event.pointerId);
        });
        view.addEventListener('pointermove', (event) => {
            if (!drag || event.pointerId !== drag.id) return;
            const dx = event.clientX - drag.x;
            const dy = event.clientY - drag.y;
            if (Math.abs(dx) + Math.abs(dy) > 3) {
                drag.moved = true;
                this._suppressMapClick = true;
                view.classList.add('is-dragging');
            }
            this._mapView.x = drag.px + dx;
            this._mapView.y = drag.py + dy;
            this._clampMap();
            this._applyMap();
        });
        const end = (event) => {
            if (!drag || event.pointerId !== drag.id) return;
            const moved = drag.moved;
            drag = null;
            view.classList.remove('is-dragging');
            if (moved)
                setTimeout(() => {
                    this._suppressMapClick = false;
                }, 0);
        };
        view.addEventListener('pointerup', end);
        view.addEventListener('pointercancel', end);
        if (this._onResize) window.removeEventListener('resize', this._onResize);
        this._onResize = () => this._fitMap();
        window.addEventListener('resize', this._onResize);
        this._applyMap();
    }
    _unbindResize() {
        if (!this._onResize) return;
        window.removeEventListener('resize', this._onResize);
        this._onResize = null;
    }
    _fitMap() {
        const view = this.element.querySelector('[data-map-view]');
        const layer = this.element.querySelector('[data-map-layer]');
        const img = this.element.querySelector('[data-map-img]');
        if (!view || !layer || !img) return;
        const width = view.clientWidth;
        const height = view.clientHeight;
        if (!width || !height || !img.naturalWidth || !img.naturalHeight) return;
        const fit = Math.min(width / img.naturalWidth, height / img.naturalHeight);
        const layerWidth = img.naturalWidth * fit;
        const layerHeight = img.naturalHeight * fit;
        this._mapSize = {
            w: layerWidth,
            h: layerHeight,
            vw: width,
            vh: height,
        };
        layer.style.width = `${layerWidth}px`;
        layer.style.height = `${layerHeight}px`;
        layer.style.marginLeft = `${-layerWidth / 2}px`;
        layer.style.marginTop = `${-layerHeight / 2}px`;
        this._clampMap();
        this._applyMap();
    }
    _applyMap() {
        const layer = this.element.querySelector('[data-map-layer]');
        if (!layer) return;
        layer.style.transform = `translate(${this._mapView.x}px, ${this._mapView.y}px) scale(${this._mapView.z})`;
    }
    _clampMap() {
        this._mapView.z = clamp(this._mapView.z, 1, 4);
        if (!this._mapSize) return;
        const maxX = Math.max(0, (this._mapSize.w * this._mapView.z - this._mapSize.vw) / 2);
        const maxY = Math.max(0, (this._mapSize.h * this._mapView.z - this._mapSize.vh) / 2);
        this._mapView.x = clamp(this._mapView.x, -maxX, maxX);
        this._mapView.y = clamp(this._mapView.y, -maxY, maxY);
    }
    _centerMap() {
        this._mapView = {
            z: 1,
            x: 0,
            y: 0,
        };
        this._applyMap();
    }
    _toggleLayers() {
        this._map.labels = !this._map.labels;
        this.element.querySelector('.tgo-hud-map')?.classList.toggle('is-labels', this._map.labels);
        this.element
            .querySelector('[data-map-layers]')
            ?.setAttribute('aria-pressed', String(this._map.labels));
    }
    _selectMapPin(id) {
        this._selected.map = id;
        this.element.querySelectorAll('[data-map-pin]').forEach((element) => {
            element.classList.toggle('is-active', element.dataset.mapPin === id);
        });
        const pin = this._data?.pins.find((entry) => entry.id === id);
        if (!pin || !this._mapSize) return;
        this._mapView.z = 1.8;
        this._mapView.x = -(pin.x / 100 - 0.5) * this._mapSize.w * this._mapView.z;
        this._mapView.y = -(pin.y / 100 - 0.5) * this._mapSize.h * this._mapView.z;
        this._clampMap();
        this._applyMap();
    }
    _onClose() {
        document.removeEventListener('keydown', this._onKeyDown);
        this._unbindResize();
        this._onKeyDown = null;
        if (hud === this) hud = null;
    }
}
export function toggleJournal() {
    if (hud?.rendered) {
        hud.close();
        return;
    }
    hud = new JournalHUD();
    hud.render({
        force: true,
    });
}
Hooks.on('init', () => {
    game.keybindings.register('the-glory-online', 'openJournal', {
        name: 'Abrir diário',
        hint: 'História, quests, eventos, mapa, NPCs, regras e atalhos',
        editable: [
            {
                key: 'KeyJ',
            },
        ],
        onDown: () => {
            toggleJournal();
            return true;
        },
    });
    game.theGloryOnline ??= {};
    game.theGloryOnline.openJournal = () => toggleJournal();
});
