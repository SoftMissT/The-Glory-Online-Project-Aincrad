import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { healthTone, poolPercent } from '../src/sheets/character-sheet-data.mjs';
const root = fileURLToPath(new URL('..', import.meta.url));
const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
test('system.json é um manifesto válido', () => {
    const manifest = JSON.parse(read('../system.json'));
    assert.equal(manifest.id, 'the-glory-online');
    assert.equal(manifest.type, 'system');
    assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
    assert.ok(manifest.manifest.endsWith('/system.json'));
    assert.ok(manifest.download.endsWith('/system.zip'));
});
test('lang/pt-BR.json parseia', () => {
    const lang = JSON.parse(read('../lang/pt-BR.json'));
    assert.ok(Object.keys(lang).length > 0);
});
test('README usa versão dinâmica da release, não número fixo', () => {
    const readme = read('../README.md');
    assert.match(readme, /img\.shields\.io\/github\/v\/release\//);
    assert.doesNotMatch(readme, /badge\/Vers%C3%A3o-\d/);
});
test('CHANGELOG cobre a versão atual do manifesto', () => {
    const manifest = JSON.parse(read('../system.json'));
    const changelog = read('../CHANGELOG.md');
    assert.match(changelog, new RegExp(`## \\[${manifest.version.replaceAll('.', '\\.')}\\]`));
    assert.equal(
        manifest.changelog,
        'https://github.com/SoftMissT/The-Glory-Online-Project-Aincrad/blob/main/CHANGELOG.md'
    );
});
test('barras da ficha calculam percentual e estado de HP', () => {
    assert.equal(poolPercent({ value: 75, max: 100 }), 75);
    assert.equal(poolPercent({ value: 140, max: 100 }), 100);
    assert.equal(poolPercent({ value: 10, max: 0 }), 0);
    assert.equal(healthTone(75), 'safe');
    assert.equal(healthTone(50), 'warning');
    assert.equal(healthTone(25), 'critical');
});
test('template da ficha expõe barras acessíveis de HP e Mana', () => {
    const template = read('../templates/actor/parts/character-status.hbs');
    assert.match(template, /tgo-meter-health/);
    assert.match(template, /tgo-meter-mana/);
    assert.match(template, /role='progressbar'/);
    assert.match(template, /system\.health\.value/);
    assert.match(template, /system\.mana\.value/);
});
test('módulos ESM passam no node --check', () => {
    const files = [
        'the-glory-online.mjs',
        'config.mjs',
        'data/character.mjs',
        'data/item.mjs',
        'sheets/character-sheet.mjs',
        'sheets/character-sheet-data.mjs',
        'sheets/item-sheet.mjs',
        'apps/system-menu.mjs',
        'apps/journal-hud.mjs',
        'apps/journal-hud-data.mjs',
        'apps/journal-hud-view.mjs',
    ];
    for (const file of files) {
        execFileSync(process.execPath, ['--check', `${root}src/${file}`]);
    }
});
