// Testes estáticos da F2 parcial: tipos de Item, ficha de item e edição no menu.
// Não dependem do runtime Foundry.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { TGO } from '../src/config.mjs';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('system.json declara os três tipos de Item e um único entrypoint', async () => {
    const manifest = JSON.parse(await read('system.json'));
    assert.deepEqual(Object.keys(manifest.documentTypes.Item).sort(), [
        'consumable',
        'equipment',
        'weapon',
    ]);
    assert.deepEqual(manifest.esmodules, ['src/the-glory-online.mjs']);
});

test('src/data/item.mjs define os campos dos três tipos', async () => {
    const source = await read('src/data/item.mjs');
    for (const field of ['description', 'quantity', 'equipped', 'hands', 'hand', 'slot', 'armor']) {
        assert.match(source, new RegExp(`\\b${field}\\b`), field);
    }
    assert.match(source, /TGOWeaponData/);
    assert.match(source, /TGOEquipmentData/);
    assert.match(source, /TGOConsumableData/);
});

test('TGO.equipmentSlots cobre os cinco slots e TGO.itemTypes os três tipos', () => {
    assert.deepEqual(Object.keys(TGO.equipmentSlots).sort(), [
        'acc1',
        'acc2',
        'armor',
        'feet',
        'head',
    ]);
    assert.deepEqual(Object.keys(TGO.itemTypes).sort(), ['consumable', 'equipment', 'weapon']);
});

test('ficha de item usa submitOnChange e o template declarado', async () => {
    const source = await read('src/sheets/item-sheet.mjs');
    assert.match(source, /submitOnChange:\s*true/);
    assert.match(source, /templates\/item\/item-sheet\.hbs/);
    const template = await read('templates/item/item-sheet.hbs');
    assert.match(template, /name='system\.quantity'/);
    assert.match(template, /name='system\.slot'/);
    assert.match(template, /name='system\.hands'/);
});

test('entry registra os dataModels e a ficha de Item', async () => {
    const source = await read('src/the-glory-online.mjs');
    assert.match(source, /CONFIG\.Item\.dataModels/);
    assert.match(source, /registerSheet\(\s*foundry\.documents\.Item/);
});

test('menu tem edição explícita, criação/exclusão e escape de atributo', async () => {
    const source = await read('src/apps/system-menu.mjs');
    assert.match(source, /data-edit-toggle/);
    assert.match(source, /savePlayerEdits\(/);
    assert.match(source, /createActorItem\(/);
    assert.match(source, /deleteActorItem\(/);
    assert.match(source, /function editInput[\s\S]*?escAttr\(value\)/);
    assert.doesNotMatch(source, /addEventListener\(\s*'change'/);
});

test('equippedForSlot usa system.slot, sem regex/palavra-chave no nome', async () => {
    const source = await read('src/apps/system-menu.mjs');
    const start = source.indexOf('function equippedForSlot');
    const end = source.indexOf('// EQUIPMENT SCREEN');
    assert.ok(start > -1 && end > start, 'equippedForSlot não encontrado');
    const body = source.slice(start, end);
    assert.match(body, /system\?\.slot/);
    assert.doesNotMatch(body, /keywords|toLowerCase|includes\(/);
});

test('lang/pt-BR.json é JSON válido e tem rótulos de item', async () => {
    const lang = JSON.parse(await read('lang/pt-BR.json'));
    assert.equal(lang.TYPES.Item.weapon, 'Arma');
    assert.equal(lang.TGO.Sheet.item, 'Item');
    assert.equal(lang.TGO.Item.slot, 'Slot');
    assert.equal(lang.TGO.EquipmentSlot.head, 'Cabeça');
});
