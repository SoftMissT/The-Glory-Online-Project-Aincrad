// Testes do HUD J: dados puros e HTML gerado, sem depender do runtime Foundry.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    HUD_TABS,
    MAP_TYPES,
    esc,
    clamp,
    splitParagraphs,
    textSummary,
    progressValue,
    questState,
    normalizeRecords,
    normalizePins,
} from '../src/apps/journal-hud-data.mjs';
import { buildRoot, renderPage } from '../src/apps/journal-hud-view.mjs';
const UI = {
    selected: {
        lore: 0,
        quests: 0,
        events: 0,
        npcs: 0,
        system: 0,
        map: null,
    },
    map: {
        type: 'local',
        labels: true,
        favoritesOnly: false,
    },
};
test('HUD tem as 7 abas do design, na ordem', () => {
    assert.deepEqual(
        HUD_TABS.map((tab) => tab.id),
        ['lore', 'quests', 'events', 'map', 'npcs', 'system', 'shortcuts']
    );
    assert.deepEqual(
        MAP_TYPES.map((type) => type.id),
        ['local', 'exploration', 'pin']
    );
});
test('esc neutraliza HTML', () => {
    assert.equal(esc(`<b>"x" & 'y'</b>`), '&lt;b&gt;&quot;x&quot; &amp; &#39;y&#39;&lt;/b&gt;');
});
test('clamp e progressValue limitam a faixa', () => {
    assert.equal(clamp('150', 0, 100), 100);
    assert.equal(clamp(-10, 0, 100), 0);
    assert.equal(clamp('abc', 0, 100), 0);
    assert.equal(progressValue(42), 42);
    assert.equal(progressValue(999), 100);
});
test('splitParagraphs e textSummary normalizam texto', () => {
    assert.deepEqual(splitParagraphs('um\n\n dois \n\n\n três '), ['um', 'dois', 'três']);
    assert.equal(textSummary('  a   b\n c  ', 20), 'a b c');
    assert.equal(textSummary('abcdef', 4), 'abc…');
});
test('questState reconhece os estados do sistema', () => {
    assert.equal(
        questState({
            state: 'done',
        }).id,
        'done'
    );
    assert.equal(
        questState({
            state: 'completed',
        }).id,
        'done'
    );
    assert.equal(
        questState({
            state: 'new',
        }).id,
        'new'
    );
    assert.equal(
        questState({
            state: 'active',
        }).id,
        'active'
    );
    assert.equal(questState({}).label, 'ATIVA');
});
test('normalizeRecords descarta entradas inválidas', () => {
    assert.deepEqual(normalizeRecords(null), []);
    assert.deepEqual(
        normalizeRecords([
            null,
            3,
            {
                title: 'ok',
            },
        ]),
        [
            {
                title: 'ok',
            },
        ]
    );
});
test('normalizePins valida nome, tipo e coordenadas', () => {
    const pins = normalizePins([
        {
            name: 'Portão',
            x: 150,
            y: -10,
            type: 'exploration',
            favorite: 1,
        },
        {
            name: '  ',
            x: 1,
            y: 1,
        },
        {
            name: 'Pin',
            type: 'invalido',
        },
    ]);
    assert.equal(pins.length, 2);
    assert.deepEqual(pins[0], {
        id: 'pin-0',
        name: 'Portão',
        x: 100,
        y: 0,
        type: 'exploration',
        status: '',
        favorite: true,
    });
    assert.equal(pins[1].type, 'local');
});
test('buildRoot entrega 7 abas, fechar e corpo vazio', () => {
    const html = buildRoot('lore');
    assert.equal((html.match(/data-hud-tab="/g) ?? []).length, 7);
    assert.match(html, /class="tgo-hud-tab is-active"[^>]*data-hud-tab="lore"/);
    assert.match(html, /data-hud-close/);
    assert.match(html, /id="tgo-hud-body"/);
});
test('página de quests escapa conteúdo e monta objetivo, recompensa e CTA', () => {
    const html = renderPage(
        'quests',
        {
            quests: [
                {
                    title: 'O <Lamento>',
                    description: 'A guardiã & o portal',
                    objective: 'Achar <a> chave',
                    reward: '100 Col',
                    progress: 60,
                    state: 'active',
                },
            ],
        },
        UI
    );
    assert.match(html, /O &lt;Lamento&gt;/);
    assert.doesNotMatch(html, /<Lamento>/);
    assert.match(html, /A guardiã &amp; o portal/);
    assert.match(html, /Achar &lt;a&gt; chave/);
    assert.match(html, /100 Col/);
    assert.match(html, /data-hud-close/);
    assert.match(html, /width:60%/);
});
test('páginas vazias mostram estado vazio, não quebram', () => {
    for (const tab of ['lore', 'events', 'npcs', 'system']) {
        const html = renderPage(tab, {}, UI);
        assert.match(html, /tgo-hud-empty/, tab);
    }
    assert.match(
        renderPage(
            'quests',
            {
                quests: [],
            },
            UI
        ),
        /tgo-hud-empty/
    );
});
test('mapa sem imagem mostra aviso e controles desativados', () => {
    const html = renderPage(
        'map',
        {
            pins: [],
        },
        UI
    );
    assert.match(html, /Mapa não configurado/);
    assert.match(html, /data-map-center aria-label="Centralizar" disabled/);
    assert.equal((html.match(/data-map-type="/g) ?? []).length, 3);
});
test('mapa com pinos posiciona e lista os locais', () => {
    const html = renderPage(
        'map',
        {
            mapImage: 'worlds/teste/mapa.webp',
            pins: [
                {
                    name: 'Mina',
                    x: 25,
                    y: 75,
                    type: 'local',
                    favorite: true,
                },
            ],
        },
        UI
    );
    assert.match(html, /data-map-layer/);
    assert.match(html, /worlds\/teste\/mapa\.webp/);
    assert.match(html, /left:25%;top:75%/);
    // marcador + FAVORITOS + LISTA COMPLETA
    assert.equal((html.match(/data-map-pin="pin-0"/g) ?? []).length, 3);
});
test('atalhos lista os comandos implementados e o DSN', () => {
    const html = renderPage('shortcuts', {}, UI);
    assert.match(html, /DICE SO NICE/);
    assert.match(html, /<kbd>Esc<\/kbd>/);
    assert.match(html, /<kbd>1–7<\/kbd>/);
});
