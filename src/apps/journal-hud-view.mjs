// View pura do HUD J: HTML + CSS, sem API do Foundry. O controller injeta o CSS
// e troca o innerHTML do body.
import {
    HUD_TABS,
    MAP_TYPES,
    clamp,
    esc,
    normalizePins,
    normalizeRecords,
    progressValue,
    questState,
    splitParagraphs,
    textSummary,
} from './journal-hud-data.mjs';
const ICONS = {
    lore: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H12v16H6.5A2.5 2.5 0 0 0 4 21.5V5.5z"/><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H12v16h5.5a2.5 2.5 0 0 1 2.5 2.5V5.5z"/></svg>',
    quests: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4h11a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-8"/><path d="M4 6v12a2 2 0 0 0 2 2h1"/><path d="M8 8h8M8 12h6"/></svg>',
    events: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z"/></svg>',
    map: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6z"/><path d="M9 3v15M15 6v15"/></svg>',
    npcs: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0"/><circle cx="17" cy="9" r="2.5"/><path d="M15.5 20a5 5 0 0 1 5.5-4.9"/></svg>',
    system: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="5" width="14" height="14" rx="1.5"/><rect x="9" y="9" width="6" height="6"/><path d="M9 5V3M15 5V3M9 21v-2M15 21v-2M5 9H3M5 15H3M21 9h-2M21 15h-2"/></svg>',
    shortcuts:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M6 10h1M10 10h1M14 10h1M18 10h0M6 13h1M10 13h1M14 13h1M18 13h0M7 16h10"/></svg>',
};
const MAP_ICONS = {
    center: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="7"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>',
    layers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 3 8l9 5 9-5-9-5z"/><path d="M3 13l9 5 9-5M3 18l9 5 9-5"/></svg>',
    filter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5h18l-7 8v6l-4-2v-4L3 5z"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l2.5 6 6.5.5-5 4.2 1.6 6.3L12 16.5 6.4 20l1.6-6.3-5-4.2L9.5 9z"/></svg>',
    pin: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="16" cy="16" r="12"/><path d="M11 11l10 10M21 11L11 21"/></svg>',
};
export const HUD_CSS = `
.tgo-journal {
    inset: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    max-width: none !important;
    max-height: none !important;
}
.tgo-journal .window-content { padding: 0 !important; overflow: hidden !important; }
.tgo-hud {
    --tgo-hud-cyan: #5FD8F0;
    --tgo-hud-gold: #F0C050;
    --tgo-hud-green: #7FE0A8;
    --tgo-hud-ink: #DCEBF2;
    --tgo-hud-muted: #A9C0CC;
    --tgo-hud-dim: #6F95A8;
    --tgo-hud-line: #2A5F78;
    --tgo-hud-panel: rgba(12, 24, 38, .68);
    position: relative;
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    overflow: hidden;
    color: var(--tgo-hud-ink);
    font-family: var(--tgo-font-ui, 'Rajdhani', 'Bahnschrift', 'Segoe UI', sans-serif);
    background: linear-gradient(180deg, #0e2034 0%, #17344d 48%, #173225 49%, #0a1712 100%);
}
.tgo-hud::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 0;
    background: rgba(6, 14, 24, .55);
    pointer-events: none;
}
.tgo-hud-nav, .tgo-hud-body { position: relative; z-index: 1; }
.tgo-hud-nav {
    flex: 0 0 auto;
    display: flex;
    align-items: flex-start;
    gap: 34px;
    padding: 20px 110px 0 40px;
    border-bottom: 2px solid rgba(95, 216, 240, .72);
}
.tgo-hud-tab {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 0 4px 22px;
    border: 0;
    background: none;
    color: var(--tgo-hud-muted);
    font-family: inherit;
    cursor: pointer;
}
.tgo-hud-disc {
    display: grid;
    place-items: center;
    width: 60px;
    height: 60px;
    border: 1.5px solid rgba(95, 216, 240, .85);
    border-radius: 50%;
    color: var(--tgo-hud-cyan);
    background: rgba(6, 14, 24, .35);
    transition: background .15s ease, box-shadow .15s ease, border-color .15s ease;
}
.tgo-hud-disc svg { width: 28px; height: 28px; }
.tgo-hud-tablabel { font-size: 14px; font-weight: 600; letter-spacing: .16em; line-height: 1; }
.tgo-hud-tab:hover .tgo-hud-disc { background: rgba(95, 216, 240, .14); }
.tgo-hud-tab.is-active { color: var(--tgo-hud-cyan); }
.tgo-hud-tab.is-active .tgo-hud-disc {
    background: var(--tgo-hud-cyan);
    color: #06202b;
    box-shadow: 0 0 18px rgba(95, 216, 240, .55);
}
.tgo-hud-tab.is-active::after {
    content: '';
    position: absolute;
    left: 50%;
    bottom: -2px;
    transform: translateX(-50%);
    border-left: 7px solid transparent;
    border-right: 7px solid transparent;
    border-top: 8px solid var(--tgo-hud-cyan);
}
.tgo-hud-close {
    position: absolute;
    top: 24px;
    right: 40px;
    z-index: 4;
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border: 1px solid rgba(95, 216, 240, .72);
    border-radius: 8px;
    background: rgba(6, 14, 24, .72);
    color: var(--tgo-hud-cyan);
    font-family: var(--tgo-font-ui, 'Rajdhani', 'Bahnschrift', 'Segoe UI', sans-serif);
    font-size: 22px;
    font-weight: 600;
    cursor: pointer;
}
.tgo-hud-close:hover { background: rgba(95, 216, 240, .18); }
.tgo-hud-body { flex: 1 1 auto; min-height: 0; display: flex; }
.tgo-hud-split {
    display: flex;
    gap: 24px;
    width: 100%;
    min-height: 0;
    padding: 24px 40px 32px;
}
.tgo-hud-list {
    flex: 0 0 440px;
    min-height: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding-right: 6px;
}
.tgo-hud-detail {
    flex: 1 1 auto;
    min-width: 0;
    min-height: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 32px 40px;
    background: var(--tgo-hud-panel);
    backdrop-filter: blur(6px);
    border: 1px solid rgba(95, 216, 240, .35);
    border-radius: 10px;
}
.tgo-hud-card {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
    padding: 16px;
    text-align: left;
    background: var(--tgo-hud-panel);
    backdrop-filter: blur(6px);
    border: 1px solid rgba(95, 216, 240, .3);
    border-radius: 10px;
    color: inherit;
    font-family: inherit;
    cursor: pointer;
    transition: background .15s ease, border-color .15s ease;
}
.tgo-hud-card:hover { border-color: rgba(95, 216, 240, .6); }
.tgo-hud-card.is-active { background: rgba(95, 216, 240, .18); border-color: var(--tgo-hud-cyan); }
.tgo-hud-cardtop { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.tgo-hud-eyebrow {
    font-family: var(--tgo-font-mono, 'Share Tech Mono', 'Cascadia Mono', monospace);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: .14em;
}
.tgo-hud-cardmeta {
    font-family: var(--tgo-font-mono, 'Share Tech Mono', 'Cascadia Mono', monospace);
    font-size: 12px;
    color: var(--tgo-hud-muted);
}
.tgo-hud-cardtitle { font-size: 20px; font-weight: 700; line-height: 1.15; color: #E8F4F8; }
.tgo-hud-cardsum {
    font-size: 13px;
    line-height: 1.45;
    color: var(--tgo-hud-muted);
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
}
.tgo-hud-progress {
    display: block;
    width: 100%;
    height: 10px;
    border: 1px solid var(--tgo-hud-line);
    border-radius: 999px;
    background: rgba(0, 0, 0, .4);
    overflow: hidden;
}
.tgo-hud-progress > span {
    display: block;
    height: 100%;
    background: var(--tgo-hud-cyan);
    border-radius: 999px;
    transition: width .2s ease;
}
.tgo-hud-detailhead { display: flex; flex-direction: column; gap: 12px; }
.tgo-hud-detailhead h2 { margin: 0; font-size: 36px; line-height: 1.05; font-weight: 700; color: #EAF6FA; }
.tgo-hud-pill {
    align-self: flex-start;
    display: inline-flex;
    padding: 5px 12px;
    border: 1px solid currentColor;
    border-radius: 999px;
    font-family: var(--tgo-font-mono, 'Share Tech Mono', 'Cascadia Mono', monospace);
    font-size: 12px;
    letter-spacing: .14em;
}
.tgo-hud-section { display: flex; flex-direction: column; gap: 10px; }
.tgo-hud-section h3 {
    margin: 0;
    font-size: 20px;
    letter-spacing: .18em;
    color: var(--tgo-hud-gold);
    font-weight: 700;
}
.tgo-hud-section p, .tgo-hud-detail p {
    margin: 0;
    font-size: 16px;
    line-height: 1.7;
    color: #C3D5DE;
}
.tgo-hud-muted { color: var(--tgo-hud-dim) !important; }
.tgo-hud-metaline {
    display: flex;
    gap: 10px;
    align-items: baseline;
    font-size: 14px;
}
.tgo-hud-metaline span {
    font-family: var(--tgo-font-mono, 'Share Tech Mono', 'Cascadia Mono', monospace);
    font-size: 12px;
    letter-spacing: .14em;
    color: var(--tgo-hud-gold);
}
.tgo-hud-progressrow {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 14px;
    font-family: var(--tgo-font-mono, 'Share Tech Mono', 'Cascadia Mono', monospace);
    font-size: 12px;
    letter-spacing: .14em;
    color: var(--tgo-hud-muted);
}
.tgo-hud-progressrow strong { color: var(--tgo-hud-cyan); font-size: 14px; }
.tgo-hud-objective {
    display: flex;
    gap: 14px;
    align-items: flex-start;
    font-size: 16px;
    line-height: 1.6;
    color: #C3D5DE;
}
.tgo-hud-check {
    font-family: var(--tgo-font-mono, 'Share Tech Mono', 'Cascadia Mono', monospace);
    color: var(--tgo-hud-muted);
    white-space: nowrap;
}
.tgo-hud-check.is-done { color: var(--tgo-hud-green); }
.tgo-hud-rewards { display: flex; flex-wrap: wrap; gap: 10px; }
.tgo-hud-reward {
    min-width: 56px;
    min-height: 56px;
    padding: 10px 12px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    background: rgba(0, 0, 0, .35);
    border: 1px solid var(--tgo-hud-line);
    border-radius: 8px;
    font-family: var(--tgo-font-mono, 'Share Tech Mono', 'Cascadia Mono', monospace);
    font-size: 12px;
    color: var(--tgo-hud-muted);
}
.tgo-hud-detailfoot { margin-top: auto; padding-top: 8px; }
.tgo-hud-cta {
    width: 220px;
    max-width: 100%;
    height: 48px;
    border: 1px solid var(--tgo-hud-gold);
    border-radius: 6px;
    background: transparent;
    color: var(--tgo-hud-gold);
    font-family: inherit;
    font-size: 16px;
    font-weight: 700;
    letter-spacing: .3em;
    cursor: pointer;
    transition: background .15s ease, color .15s ease;
}
.tgo-hud-cta:hover { background: var(--tgo-hud-gold); color: #141006; }
.tgo-hud-eyebrow.is-cyan, .tgo-hud-pill.is-cyan { color: var(--tgo-hud-cyan); }
.tgo-hud-eyebrow.is-gold, .tgo-hud-pill.is-gold { color: var(--tgo-hud-gold); }
.tgo-hud-eyebrow.is-green, .tgo-hud-pill.is-green { color: var(--tgo-hud-green); }
.tgo-hud-eyebrow.is-muted, .tgo-hud-pill.is-muted { color: var(--tgo-hud-dim); }
.tgo-hud-pageempty { flex: 1; display: grid; place-items: center; padding: 40px; }
.tgo-hud-empty {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-width: 420px;
    padding: 24px;
    border: 1px dashed rgba(95, 216, 240, .35);
    border-radius: 10px;
    color: var(--tgo-hud-muted);
    text-align: center;
}
.tgo-hud-empty strong { font-size: 20px; color: var(--tgo-hud-ink); }
.tgo-hud-empty span { font-size: 14px; line-height: 1.5; }
.tgo-hud-npc { display: flex; align-items: center; gap: 18px; }
.tgo-hud-npc img {
    width: 96px;
    height: 96px;
    object-fit: cover;
    border: 1px solid rgba(95, 216, 240, .45);
    border-radius: 8px;
    background: rgba(0, 0, 0, .35);
}
.tgo-hud-npc h2 { margin: 8px 0 0; font-size: 32px; line-height: 1.05; color: #EAF6FA; }
.tgo-hud-list, .tgo-hud-detail, .tgo-hud-mappanel, .tgo-hud-shortcuts {
    scrollbar-width: thin;
    scrollbar-color: rgba(95, 216, 240, .45) transparent;
}
.tgo-hud-list::-webkit-scrollbar, .tgo-hud-detail::-webkit-scrollbar,
.tgo-hud-mappanel::-webkit-scrollbar, .tgo-hud-shortcuts::-webkit-scrollbar { width: 8px; }
.tgo-hud-list::-webkit-scrollbar-thumb, .tgo-hud-detail::-webkit-scrollbar-thumb,
.tgo-hud-mappanel::-webkit-scrollbar-thumb, .tgo-hud-shortcuts::-webkit-scrollbar-thumb {
    background: rgba(95, 216, 240, .35);
    border-radius: 999px;
}
.tgo-hud-map { position: relative; flex: 1 1 auto; min-height: 0; overflow: hidden; background: #0a171d; }
.tgo-hud-mapview { position: absolute; inset: 0; overflow: hidden; touch-action: none; cursor: grab; }
.tgo-hud-mapview.is-dragging { cursor: grabbing; }
.tgo-hud-maplayer { position: absolute; left: 50%; top: 50%; will-change: transform; }
.tgo-hud-mapimg { display: block; width: 100%; height: 100%; user-select: none; -webkit-user-drag: none; }
.tgo-hud-pin {
    position: absolute;
    z-index: 3;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 0;
    border: 0;
    background: none;
    color: var(--tgo-hud-cyan);
    cursor: pointer;
}
.tgo-hud-pin svg { width: 30px; height: 30px; filter: drop-shadow(0 1px 4px rgba(0, 0, 0, .8)); }
.tgo-hud-pinlabel {
    font-family: var(--tgo-font-mono, 'Share Tech Mono', 'Cascadia Mono', monospace);
    font-size: 11px;
    letter-spacing: .04em;
    color: #E8F4F8;
    text-shadow: 0 1px 3px #000, 0 0 6px #000;
    white-space: nowrap;
    opacity: 0;
    transition: opacity .15s ease;
}
.tgo-hud-map.is-labels .tgo-hud-pinlabel,
.tgo-hud-pin.is-active .tgo-hud-pinlabel,
.tgo-hud-pin:hover .tgo-hud-pinlabel { opacity: 1; }
.tgo-hud-pin.is-fav { color: var(--tgo-hud-gold); }
.tgo-hud-pin.is-active svg { filter: drop-shadow(0 0 8px rgba(95, 216, 240, .9)); }
.tgo-hud-mapempty {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    padding: 40px;
    background:
        radial-gradient(circle at 50% 45%, rgba(42, 95, 120, .35), transparent 60%),
        repeating-linear-gradient(0deg, transparent 0 39px, rgba(95, 216, 240, .07) 40px),
        repeating-linear-gradient(90deg, transparent 0 39px, rgba(95, 216, 240, .07) 40px);
}
.tgo-hud-maptabs {
    position: absolute;
    z-index: 4;
    top: 18px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 30px;
}
.tgo-hud-maptab {
    padding: 4px 2px 7px;
    border: 0;
    border-bottom: 2px solid transparent;
    background: none;
    color: var(--tgo-hud-muted);
    font-family: var(--tgo-font-mono, 'Share Tech Mono', 'Cascadia Mono', monospace);
    font-size: 13px;
    letter-spacing: .2em;
    cursor: pointer;
}
.tgo-hud-maptab.is-active { color: var(--tgo-hud-cyan); border-bottom-color: var(--tgo-hud-cyan); }
.tgo-hud-mapctrls {
    position: absolute;
    z-index: 4;
    top: 18px;
    right: 24px;
    display: flex;
    flex-direction: column;
    gap: 12px;
}
.tgo-hud-mapctrl {
    width: 78px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    border: 0;
    background: none;
    color: var(--tgo-hud-muted);
    font-family: inherit;
    font-size: 12px;
    cursor: pointer;
}
.tgo-hud-mapctrl .icon {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border: 1px solid rgba(95, 216, 240, .55);
    border-radius: 8px;
    background: rgba(6, 14, 24, .78);
    color: var(--tgo-hud-cyan);
}
.tgo-hud-mapctrl .icon svg { width: 22px; height: 22px; }
.tgo-hud-mapctrl:hover .icon,
.tgo-hud-mapctrl[aria-pressed="true"] .icon { background: var(--tgo-hud-cyan); color: #06202b; }
.tgo-hud-mapctrl:disabled { opacity: .4; cursor: not-allowed; }
.tgo-hud-mappanel {
    position: absolute;
    z-index: 3;
    top: 0;
    left: 0;
    bottom: 0;
    width: 460px;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    overflow-y: auto;
    background: linear-gradient(90deg, rgba(6, 14, 24, .97) 0%, rgba(6, 14, 24, .86) 62%, rgba(6, 14, 24, 0) 100%);
}
.tgo-hud-mapsection { display: flex; flex-direction: column; gap: 8px; }
.tgo-hud-mapsectionhead {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 12px;
    font-size: 18px;
    font-weight: 700;
    letter-spacing: .16em;
    color: var(--tgo-hud-muted);
}
.tgo-hud-mapsectionhead span:last-child {
    font-family: var(--tgo-font-mono, 'Share Tech Mono', 'Cascadia Mono', monospace);
    font-size: 12px;
    color: var(--tgo-hud-gold);
}
.tgo-hud-maprow {
    display: grid;
    grid-template-columns: 26px 1fr 22px;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 10px 8px;
    border: 0;
    border-bottom: 1px solid rgba(95, 216, 240, .16);
    background: none;
    color: inherit;
    text-align: left;
    font-family: inherit;
    cursor: pointer;
}
.tgo-hud-maprow:hover, .tgo-hud-maprow.is-active { background: rgba(95, 216, 240, .12); }
.tgo-hud-maprow .num {
    font-family: var(--tgo-font-mono, 'Share Tech Mono', 'Cascadia Mono', monospace);
    font-size: 12px;
    color: var(--tgo-hud-dim);
}
.tgo-hud-maprow strong { display: block; font-size: 16px; font-weight: 600; color: #E8F4F8; }
.tgo-hud-maprow small { display: block; margin-top: 2px; font-size: 12px; color: var(--tgo-hud-muted); }
.tgo-hud-star { width: 18px; height: 18px; color: var(--tgo-hud-dim); }
.tgo-hud-star.is-fav { color: var(--tgo-hud-gold); }
.tgo-hud-maphint { margin: 0; padding: 10px 8px; font-size: 13px; color: var(--tgo-hud-dim); }
.tgo-hud-shortcuts {
    flex: 1 1 auto;
    min-height: 0;
    width: 100%;
    overflow-y: auto;
    padding: 24px 40px 32px;
    display: flex;
    flex-direction: column;
    gap: 22px;
}
.tgo-hud-shortcutgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; }
.tgo-hud-shortcutgroup {
    padding: 20px 24px;
    background: var(--tgo-hud-panel);
    border: 1px solid rgba(95, 216, 240, .3);
    border-radius: 10px;
    backdrop-filter: blur(6px);
}
.tgo-hud-shortcutgroup h3 {
    margin: 0 0 14px;
    font-size: 18px;
    letter-spacing: .16em;
    color: var(--tgo-hud-cyan);
}
.tgo-hud-shortcutrow {
    display: grid;
    grid-template-columns: 90px 1fr;
    gap: 14px;
    padding: 7px 0;
    border-top: 1px solid rgba(95, 216, 240, .12);
    font-size: 14px;
    color: var(--tgo-hud-muted);
}
.tgo-hud-shortcutrow kbd {
    align-self: start;
    justify-self: start;
    min-width: 32px;
    padding: 3px 7px;
    border: 1px solid var(--tgo-hud-line);
    border-radius: 5px;
    background: rgba(0, 0, 0, .35);
    color: var(--tgo-hud-ink);
    font-family: var(--tgo-font-mono, 'Share Tech Mono', 'Cascadia Mono', monospace);
    font-size: 12px;
    text-align: center;
}
.tgo-hud-dsn {
    margin: 0;
    padding: 14px 18px;
    border-left: 2px solid var(--tgo-hud-gold);
    background: rgba(240, 192, 80, .06);
    font-family: var(--tgo-font-mono, 'Share Tech Mono', 'Cascadia Mono', monospace);
    font-size: 12px;
    letter-spacing: .06em;
    color: var(--tgo-hud-gold);
}
.tgo-hud :focus-visible { outline: 2px solid var(--tgo-hud-cyan); outline-offset: 2px; }
@media (max-width: 1200px) {
    .tgo-hud-nav { gap: 20px; }
    .tgo-hud-tablabel { font-size: 12px; }
    .tgo-hud-list { flex-basis: 360px; }
    .tgo-hud-split { padding: 20px 24px 24px; }
    .tgo-hud-detail { padding: 24px; }
}
@media (max-width: 900px) {
    .tgo-hud-nav { flex-wrap: wrap; padding-right: 80px; }
    .tgo-hud-tab { padding-bottom: 14px; }
    .tgo-hud-split { flex-direction: column; overflow-y: auto; }
    .tgo-hud-list { flex: 0 0 auto; max-height: 42%; }
    .tgo-hud-detail { flex: 0 0 auto; overflow: visible; }
    .tgo-hud-shortcutgrid { grid-template-columns: 1fr; }
    .tgo-hud-mappanel {
        width: 100%;
        max-height: 46%;
        top: auto;
        background: linear-gradient(0deg, rgba(6, 14, 24, .97), rgba(6, 14, 24, .82) 70%, transparent);
    }
}
@media (prefers-reduced-motion: reduce) {
    .tgo-hud *, .tgo-hud *::before, .tgo-hud *::after { transition: none !important; }
}
`;

function pill(label, tone = 'cyan') {
    return `<span class="tgo-hud-pill is-${tone}">${esc(label)}</span>`;
}

function progressBar(value) {
    const current = progressValue(value);
    return `<span class="tgo-hud-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${current}"><span style="width:${current}%"></span></span>`;
}

function card({
    index,
    eyebrow,
    tone = 'cyan',
    meta = '',
    title,
    summary = '',
    progress = null,
    active = false,
}) {
    return `<button type="button" class="tgo-hud-card${active ? ' is-active' : ''}" data-hud-item="${index}">
        <span class="tgo-hud-cardtop"><span class="tgo-hud-eyebrow is-${tone}">${esc(eyebrow)}</span>${meta ? `<span class="tgo-hud-cardmeta">${esc(meta)}</span>` : ''}</span>
        <span class="tgo-hud-cardtitle">${esc(title)}</span>
        ${summary ? `<span class="tgo-hud-cardsum">${esc(summary)}</span>` : ''}
        ${progress === null ? '' : progressBar(progress)}
    </button>`;
}

function bodyText(text) {
    const paragraphs = splitParagraphs(text);
    if (!paragraphs.length) return '<p class="tgo-hud-muted">Sem conteúdo.</p>';
    return paragraphs
        .map((paragraph) => `<p>${esc(paragraph).replaceAll('\n', '<br>')}</p>`)
        .join('');
}

function section(title, body) {
    return `<section class="tgo-hud-section"><h3>${esc(title)}</h3>${body}</section>`;
}

function detailHead(label, tone, title) {
    return `<div class="tgo-hud-detailhead">${pill(label, tone)}<h2>${esc(title)}</h2></div>`;
}

function splitPage(list, detail) {
    return `<div class="tgo-hud-split"><div class="tgo-hud-list">${list}</div><div class="tgo-hud-detail">${detail}</div></div>`;
}

function pageEmpty(title, hint) {
    return `<div class="tgo-hud-pageempty"><div class="tgo-hud-empty"><strong>${esc(title)}</strong><span>${esc(hint)}</span></div></div>`;
}

function selectedIndex(value, length) {
    return clamp(value ?? 0, 0, Math.max(0, length - 1));
}

function renderLore(value, selected) {
    const items = normalizeRecords(value);
    if (!items.length)
        return pageEmpty('Nenhum registro', 'Quando houver registros, eles aparecem aqui.');
    const index = selectedIndex(selected, items.length);
    const item = items[index];
    const list = items
        .map((entry, itemIndex) =>
            card({
                index: itemIndex,
                eyebrow: entry.category || entry.date || 'REGISTRO',
                tone: 'cyan',
                meta: entry.category ? entry.date : '',
                title: entry.title ?? 'Sem título',
                summary: entry.summary || textSummary(entry.text),
                active: itemIndex === index,
            })
        )
        .join('');
    const label = [item.category, item.date].filter(Boolean).join(' · ') || 'REGISTRO';
    const detail = `${detailHead(label, 'cyan', item.title ?? 'Sem título')}
        ${section('REGISTRO', bodyText(item.text))}`;
    return splitPage(list, detail);
}

function renderQuests(value, selected) {
    const items = Array.isArray(value) ? value : [];
    if (!items.length)
        return pageEmpty('Nenhuma quest', 'Quando houver quests, elas aparecem aqui.');
    const index = selectedIndex(selected, items.length);
    const quest = items[index];
    const state = questState(quest);
    const tone = state.id === 'done' ? 'green' : state.id === 'new' ? 'gold' : 'cyan';
    const progress = progressValue(quest.progress);
    const list = items
        .map((entry, itemIndex) => {
            const entryState = questState(entry);
            const entryTone =
                entryState.id === 'done' ? 'green' : entryState.id === 'new' ? 'gold' : 'cyan';
            return card({
                index: itemIndex,
                eyebrow: entryState.label,
                tone: entryTone,
                meta: `${progressValue(entry.progress)}%`,
                title: entry.title ?? 'Sem título',
                summary: entry.description ?? '',
                progress: progressValue(entry.progress),
                active: itemIndex === index,
            });
        })
        .join('');
    const objective = quest.objective
        ? `<div class="tgo-hud-objective"><span class="tgo-hud-check${state.id === 'done' ? ' is-done' : ''}">${state.id === 'done' ? '[x]' : '[ ]'}</span><span>${esc(quest.objective)}</span></div>`
        : bodyText('');
    const reward = quest.reward
        ? `<div class="tgo-hud-rewards"><span class="tgo-hud-reward">${esc(quest.reward)}</span></div>`
        : '';
    const detail = `${detailHead(state.label, tone, quest.title ?? 'Sem título')}
        <div class="tgo-hud-progressrow"><span>PROGRESSO</span>${progressBar(progress)}<strong>${progress}%</strong></div>
        ${section('DESCRIÇÃO', bodyText(quest.description))}
        ${quest.objective ? section('OBJETIVO', objective) : ''}
        ${quest.reward ? section('RECOMPENSA', reward) : ''}
        <div class="tgo-hud-detailfoot"><button type="button" class="tgo-hud-cta" data-hud-close>IR</button></div>`;
    return splitPage(list, detail);
}

function eventTone(status) {
    const value = String(status ?? '').toLowerCase();
    if (/encerr|closed|done|conclu/.test(value)) return 'muted';
    if (/agend|scheduled|new|nova/.test(value)) return 'gold';
    return 'cyan';
}

function renderEvents(value, selected) {
    const items = normalizeRecords(value);
    if (!items.length)
        return pageEmpty('Nenhum evento', 'Quando houver eventos, eles aparecem aqui.');
    const index = selectedIndex(selected, items.length);
    const item = items[index];
    const tone = eventTone(item.status);
    const list = items
        .map((entry, itemIndex) =>
            card({
                index: itemIndex,
                eyebrow: entry.status || entry.date || 'EVENTO',
                tone: eventTone(entry.status),
                meta: entry.status ? entry.date : entry.place || '',
                title: entry.title ?? 'Sem título',
                summary: textSummary(entry.text),
                active: itemIndex === index,
            })
        )
        .join('');
    const label = [item.status, item.date].filter(Boolean).join(' · ') || 'EVENTO';
    const place = item.place
        ? `<p class="tgo-hud-metaline"><span>LOCAL</span>${esc(item.place)}</p>`
        : '';
    const detail = `${detailHead(label, tone, item.title ?? 'Sem título')}
        ${place}
        ${section('EVENTO', bodyText(item.text))}`;
    return splitPage(list, detail);
}

function renderNpcs(value, selected) {
    const items = normalizeRecords(value);
    if (!items.length)
        return pageEmpty('Nenhum NPC descoberto', 'Quando houver NPCs, eles aparecem aqui.');
    const index = selectedIndex(selected, items.length);
    const item = items[index];
    const name = item.name ?? item.title ?? 'Sem nome';
    const role = item.role ?? item.status ?? 'NPC';
    const list = items
        .map((entry, itemIndex) =>
            card({
                index: itemIndex,
                eyebrow: entry.role || entry.status || 'NPC',
                tone: 'cyan',
                meta: entry.role ? entry.status : '',
                title: entry.name ?? entry.title ?? 'Sem nome',
                summary: textSummary(entry.note ?? entry.text),
                active: itemIndex === index,
            })
        )
        .join('');
    const image = item.img ?? item.image ?? 'icons/svg/mystery-man.svg';
    const detail = `<div class="tgo-hud-npc"><img src="${esc(image)}" alt="">${detailHead(role, 'cyan', name)}</div>
        ${section('REGISTRO', bodyText(item.note ?? item.text))}`;
    return splitPage(list, detail);
}

function renderRules(value, selected) {
    const items = normalizeRecords(value);
    if (!items.length)
        return pageEmpty('Nenhuma regra', 'Quando houver regras, elas aparecem aqui.');
    const index = selectedIndex(selected, items.length);
    const item = items[index];
    const number = (valueIndex) => String(valueIndex + 1).padStart(2, '0');
    const list = items
        .map((entry, itemIndex) =>
            card({
                index: itemIndex,
                eyebrow: `REGRA ${number(itemIndex)}`,
                tone: 'gold',
                title: entry.title ?? 'Sem título',
                summary: entry.summary || textSummary(entry.text),
                active: itemIndex === index,
            })
        )
        .join('');
    const detail = `${detailHead(`REGRA ${number(index)}`, 'gold', item.title ?? 'Sem título')}
        ${section('REGRA', bodyText(item.text ?? item.summary))}`;
    return splitPage(list, detail);
}

function renderShortcuts() {
    const groups = [
        [
            'DIÁRIO',
            [
                ['J', 'Abrir / fechar'],
                ['Esc', 'Fechar'],
                ['M', 'Menu do sistema'],
                ['?', 'Atalhos'],
            ],
        ],
        [
            'NAVEGAÇÃO',
            [
                ['1–7', 'Trocar de aba'],
                ['← →', 'Aba anterior / próxima'],
                ['Enter', 'Abrir o item focado'],
            ],
        ],
        [
            'LISTAS',
            [
                ['↑ ↓', 'Navegar'],
                ['Tab', 'Próximo item'],
            ],
        ],
        [
            'MAPA',
            [
                ['Arrastar', 'Mover'],
                ['Roda', 'Zoom'],
                ['Centralizar', 'Reenquadrar'],
                ['Camadas', 'Rótulos'],
                ['Filtros', 'Só favoritos'],
            ],
        ],
    ];
    return `<div class="tgo-hud-shortcuts">
        <div class="tgo-hud-shortcutgrid">
            ${groups.map(([title, rows]) => `<section class="tgo-hud-shortcutgroup"><h3>${esc(title)}</h3>${rows.map(([key, description]) => `<div class="tgo-hud-shortcutrow"><kbd>${esc(key)}</kbd><span>${esc(description)}</span></div>`).join('')}</section>`).join('')}
        </div>
        <p class="tgo-hud-dsn">DICE SO NICE (DSN) · as rolagens do sistema animam automaticamente.</p>
    </div>`;
}

function mapRow(pin, position, isActive) {
    return `<button type="button" class="tgo-hud-maprow${isActive ? ' is-active' : ''}" data-map-pin="${esc(pin.id)}">
        <span class="num">${String(position).padStart(2, '0')}</span>
        <span><strong>${esc(pin.name)}</strong>${pin.status ? `<small>${esc(pin.status)}</small>` : ''}</span>
        ${MAP_ICONS.star.replace('<svg ', `<svg class="tgo-hud-star${pin.favorite ? ' is-fav' : ''}" `)}
    </button>`;
}

function renderMap(data, ui) {
    const pins = normalizePins(data.pins);
    const image = String(data.mapImage ?? '').trim();
    const map = ui.map;
    const visible = pins.filter((pin) => pin.type === map.type);
    const markers = map.favoritesOnly ? visible.filter((pin) => pin.favorite) : visible;
    const favorites = pins.filter((pin) => pin.favorite);
    const current = visible.find((pin) => pin.id === ui.selected.map) ?? visible[0] ?? null;
    const rows = (items, start = 1) =>
        items.map((pin, index) => mapRow(pin, start + index, pin.id === current?.id)).join('');
    const tabs = MAP_TYPES.map(
        (type) =>
            `<button type="button" class="tgo-hud-maptab${type.id === map.type ? ' is-active' : ''}" data-map-type="${type.id}">${type.label}</button>`
    ).join('');
    const controls = `<div class="tgo-hud-mapctrls">
        <button type="button" class="tgo-hud-mapctrl" data-map-center aria-label="Centralizar"${image ? '' : ' disabled'}><span class="icon">${MAP_ICONS.center}</span><span>Centralizar</span></button>
        <button type="button" class="tgo-hud-mapctrl" data-map-layers aria-label="Camadas" aria-pressed="${map.labels}"${image ? '' : ' disabled'}><span class="icon">${MAP_ICONS.layers}</span><span>Camadas</span></button>
        <button type="button" class="tgo-hud-mapctrl" data-map-filter aria-label="Filtros" aria-pressed="${map.favoritesOnly}"${image ? '' : ' disabled'}><span class="icon">${MAP_ICONS.filter}</span><span>Filtros</span></button>
    </div>`;
    const markerLayer = markers
        .map(
            (pin) =>
                `<button type="button" class="tgo-hud-pin${pin.favorite ? ' is-fav' : ''}${pin.id === current?.id ? ' is-active' : ''}" style="left:${pin.x}%;top:${pin.y}%" data-map-pin="${esc(pin.id)}" aria-label="${esc(pin.name)}">${MAP_ICONS.pin}<span class="tgo-hud-pinlabel">${esc(pin.name)}</span></button>`
        )
        .join('');
    const view = image
        ? `<div class="tgo-hud-maplayer" data-map-layer><img class="tgo-hud-mapimg" data-map-img src="${esc(image)}" alt="Mapa">${markerLayer}</div>`
        : `<div class="tgo-hud-mapempty"><div class="tgo-hud-empty"><strong>Mapa não configurado</strong><span>O GM ainda não definiu a imagem do mapa.</span></div></div>`;
    const panel = `<aside class="tgo-hud-mappanel">
        <div class="tgo-hud-mapsection">
            <div class="tgo-hud-mapsectionhead"><span>FAVORITOS</span><span>${favorites.length}</span></div>
            ${favorites.length ? rows(favorites) : '<p class="tgo-hud-maphint">Nenhum favorito.</p>'}
        </div>
        <div class="tgo-hud-mapsection">
            <div class="tgo-hud-mapsectionhead"><span>LISTA COMPLETA</span><span>${visible.length}</span></div>
            ${visible.length ? rows(visible) : '<p class="tgo-hud-maphint">Nenhum local nesta camada.</p>'}
        </div>
    </aside>`;
    return `<div class="tgo-hud-map${map.labels ? ' is-labels' : ''}">
        <div class="tgo-hud-mapview" data-map-view>${view}</div>
        <div class="tgo-hud-maptabs" role="tablist">${tabs}</div>
        ${controls}
        ${panel}
    </div>`;
}
export function buildRoot(activeTab) {
    const tabs = HUD_TABS.map(
        (
            tab
        ) => `<button type="button" class="tgo-hud-tab${tab.id === activeTab ? ' is-active' : ''}" data-hud-tab="${tab.id}" role="tab" aria-selected="${tab.id === activeTab}" aria-label="${tab.label}">
            <span class="tgo-hud-disc">${ICONS[tab.id] ?? ''}</span>
            <span class="tgo-hud-tablabel">${tab.label}</span>
        </button>`
    ).join('');
    return `<div class="tgo-hud">
        <nav class="tgo-hud-nav" role="tablist" aria-label="Diário do jogo">${tabs}</nav>
        <button type="button" class="tgo-hud-close" data-hud-close aria-label="Fechar diário">X</button>
        <main class="tgo-hud-body" id="tgo-hud-body" role="tabpanel"></main>
    </div>`;
}
export function renderPage(tab, data, ui) {
    const selected = ui.selected ?? {};
    const safeData = {
        story: data.story,
        quests: data.quests,
        events: data.events,
        npcs: data.npcs,
        rules: data.rules,
        pins: data.pins,
        mapImage: data.mapImage,
    };
    switch (tab) {
        case 'quests':
            return renderQuests(safeData.quests, selected.quests);
        case 'events':
            return renderEvents(safeData.events, selected.events);
        case 'map':
            return renderMap(safeData, {
                selected,
                map: ui.map,
            });
        case 'npcs':
            return renderNpcs(safeData.npcs, selected.npcs);
        case 'system':
            return renderRules(safeData.rules, selected.system);
        case 'shortcuts':
            return renderShortcuts();
        case 'lore':
        default:
            return renderLore(safeData.story, selected.lore);
    }
}
