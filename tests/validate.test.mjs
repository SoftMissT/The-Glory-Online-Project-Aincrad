import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
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
test('módulos ESM passam no node --check', () => {
    const files = [
        'the-glory-online.mjs',
        'config.mjs',
        'data/character.mjs',
        'sheets/character-sheet.mjs',
        'apps/journal-hud.mjs',
        'apps/journal-hud-data.mjs',
        'apps/journal-hud-view.mjs',
    ];
    for (const file of files) {
        execFileSync(process.execPath, ['--check', `${root}src/${file}`]);
    }
});
