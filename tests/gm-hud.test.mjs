import assert from 'node:assert/strict';
import test from 'node:test';
import {
    GM_TABS,
    blankRecord,
    clampNumber,
    displayName,
    normalizeList,
    normalizeRecord,
    removeRecord,
    subtitleFor,
    upsertRecord,
    validateRecord,
} from '../src/apps/gm-hud-data.mjs';
import { GM_CSS, buildGmRoot, renderGmPage } from '../src/apps/gm-hud-view.mjs';
test('GM_TABS cobre as seis abas de autoria', () => {
    assert.deepEqual(
        GM_TABS.map((entry) => entry.id),
        ['story', 'quests', 'events', 'map', 'npcs', 'rules']
    );
    assert.deepEqual(
        GM_TABS.map((entry) => entry.setting),
        ['story', 'quests', 'events', 'mapPins', 'npcs', 'rules']
    );
});
test('blankRecord cria registro com id e defaults coerentes', () => {
    const quest = blankRecord('quests');
    assert.ok(quest.id);
    assert.equal(quest.progress, 0);
    assert.equal(quest.state, 'active');
    const pin = blankRecord('map');
    assert.equal(pin.x, 50);
    assert.equal(pin.y, 50);
    assert.equal(pin.type, 'local');
    assert.equal(pin.favorite, false);
});
test('validateRecord exige os campos obrigatórios', () => {
    const story = blankRecord('story');
    assert.equal(validateRecord('story', story).length, 1);
    story.title = 'Aincrad';
    assert.equal(validateRecord('story', story).length, 0);
});
test('normalizeRecord limita números e valida enums', () => {
    const quest = normalizeRecord('quests', {
        title: ' Raid ',
        progress: 150,
        state: 'inventado',
    });
    assert.equal(quest.title, 'Raid');
    assert.equal(quest.progress, 100);
    assert.equal(quest.state, 'active');
    assert.equal(
        normalizeRecord('quests', {
            progress: -10,
        }).progress,
        0
    );
    assert.equal(
        normalizeRecord('map', {
            x: 'abc',
            y: 130,
        }).x,
        50
    );
    assert.equal(
        normalizeRecord('map', {
            x: 'abc',
            y: 130,
        }).y,
        100
    );
});
test('normalizeRecord cobre checkbox de favorito', () => {
    assert.equal(
        normalizeRecord('map', {
            favorite: 'on',
        }).favorite,
        true
    );
    assert.equal(
        normalizeRecord('map', {
            favorite: undefined,
        }).favorite,
        false
    );
});
test('NPC antigo com title ganha name sem perder o dado', () => {
    const npc = normalizeRecord('npcs', {
        title: 'Kirito',
        status: 'vivo',
    });
    assert.equal(npc.name, 'Kirito');
    assert.equal(npc.status, 'vivo');
});
test('upsert e remove operam por id', () => {
    const first = normalizeRecord('rules', {
        id: 'a',
        title: 'Regra A',
    });
    const second = normalizeRecord('rules', {
        id: 'b',
        title: 'Regra B',
    });
    let list = upsertRecord([], first);
    list = upsertRecord(list, second);
    assert.equal(list.length, 2);
    const changed = upsertRecord(list, {
        ...first,
        title: 'Regra A2',
    });
    assert.equal(changed.length, 2);
    assert.equal(changed.find((entry) => entry.id === 'a').title, 'Regra A2');
    assert.deepEqual(
        removeRecord(changed, 'a').map((entry) => entry.id),
        ['b']
    );
});
test('normalizeList ignora valor que não é array', () => {
    assert.deepEqual(normalizeList('story', null), []);
    assert.deepEqual(normalizeList('story', 'nada'), []);
});
test('displayName e subtitleFor alimentam a lista', () => {
    assert.equal(
        displayName({
            name: 'Asuna',
        }),
        'Asuna'
    );
    assert.equal(
        displayName({
            title: 'Raid',
        }),
        'Raid'
    );
    assert.equal(displayName({}), 'Sem título');
    assert.equal(
        subtitleFor('quests', {
            state: 'done',
            progress: 100,
        }),
        'CONCLUÍDA · 100%'
    );
    assert.equal(
        subtitleFor('npcs', {
            role: 'Ferreiro',
            status: 'vivo',
        }),
        'Ferreiro · vivo'
    );
    assert.equal(
        subtitleFor('map', {
            type: 'exploration',
            status: 'aberto',
        }),
        'EXPLORAÇÃO · aberto'
    );
});
test('cada schema produz as chaves que o HUD do jogador lê', () => {
    const expected = {
        story: ['title', 'summary', 'text'],
        quests: ['title', 'description', 'objective', 'reward', 'progress', 'state'],
        events: ['title', 'status', 'date', 'place', 'text'],
        npcs: ['name', 'role', 'status', 'note'],
        rules: ['title', 'summary', 'text'],
        map: ['name', 'type', 'status', 'favorite', 'x', 'y'],
    };
    for (const [tab, keys] of Object.entries(expected)) {
        const record = normalizeRecord(tab, {});
        for (const key of keys) assert.ok(key in record, `${tab} sem ${key}`);
    }
});
test('buildGmRoot tem seis abas, corpo e close', () => {
    const html = buildGmRoot('story');
    assert.equal((html.match(/data-gm-tab="/g) ?? []).length, GM_TABS.length);
    assert.match(html, /id="tgo-gm-body"/);
    assert.match(html, /data-gm-close/);
    assert.match(html, /--tgo-gm-tabs:6/);
    assert.match(html, /assets\/crest-mark\.webp/);
});
test('renderGmPage monta lista, formulário e ações', () => {
    const record = normalizeRecord('quests', {
        id: 'q1',
        title: 'Raid de Aincrad',
        progress: 20,
    });
    const html = renderGmPage('quests', {
        records: [record],
        draft: record,
    });
    assert.match(html, /data-gm-select="q1"/);
    assert.match(html, /name="progress"/);
    assert.match(html, /name="state"/);
    assert.match(html, /data-gm-save/);
    assert.match(html, /data-gm-delete/);
    assert.match(html, /data-gm-new/);
    assert.match(html, /Raid de Aincrad/);
});
test('renderGmPage do mapa mostra imagem e pinos', () => {
    const pin = normalizeRecord('map', {
        id: 'p1',
        name: 'Boss room',
        x: 30,
        y: 70,
    });
    const html = renderGmPage('map', {
        records: [pin],
        draft: pin,
        mapImage: 'systems/the-glory-online/assets/hud-bg.webp',
    });
    assert.match(html, /name="mapImage"/);
    assert.match(html, /data-gm-mapclick/);
    assert.match(html, /left:30%/);
    assert.match(html, /top:70%/);
});
test('GM mostra mapa e placeholder visual quando faltam imagens', () => {
    const map = renderGmPage('map', {
        records: [],
        draft: null,
    });
    assert.match(map, /assets\/map-floor-1\.webp/);
    const npcs = renderGmPage('npcs', {
        records: [],
        draft: {
            id: 'n1',
            name: 'Guardião',
        },
    });
    assert.match(npcs, /assets\/npc-placeholder\.webp/);
});
test('texto do usuário sai escapado', () => {
    const html = renderGmPage('story', {
        records: [
            {
                id: 'x',
                title: '<img src=x onerror=alert(1)>',
            },
        ],
        draft: {
            id: 'x',
            title: '<img src=x onerror=alert(1)>',
        },
    });
    assert.ok(!html.includes('<img src=x'));
    assert.ok(html.includes('&lt;img'));
});
test('CSS do GM não carrega fonte externa', () => {
    assert.ok(!GM_CSS.includes('http'));
    assert.ok(!GM_CSS.includes('@import'));
});
