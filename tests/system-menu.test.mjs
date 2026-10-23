import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const menu = readFileSync(new URL('../src/apps/system-menu.mjs', import.meta.url), 'utf8');
// Regressão: o stat HP antigo e o card novo renderizavam o mesmo data-path e
// savePlayerEdits aplicava last-wins, descartando a edição do card novo.
test('menu renderiza um único input por pool', () => {
    const count = (path) => menu.split(`editInput('${path}'`).length - 1;
    assert.equal(count('system.health.value'), 1);
    assert.equal(count('system.health.max'), 1);
    assert.equal(count('system.mana.value'), 1);
    assert.equal(count('system.mana.max'), 1);
});
test('menu reutiliza os helpers da ficha, sem duplicar lógica', () => {
    assert.match(
        menu,
        /import \{ healthTone, poolPercent \} from '\.\.\/sheets\/character-sheet-data\.mjs'/
    );
    assert.doesNotMatch(menu, /const poolPercent\s*=/);
    assert.doesNotMatch(menu, /const hpTone\s*=/);
});
test('barras de HP e Mana do menu são progressbar acessível', () => {
    const bars = menu.match(/role="progressbar"[^>]*aria-valuenow/g) ?? [];
    assert.equal(bars.length, 2);
});
test('cores das barras usam tokens --sao-*, sem hex hardcoded', () => {
    assert.match(menu, /--sao-mana:#42d9e8;/);
    for (const tone of ['hp-safe', 'hp-warning', 'hp-critical', 'mana']) {
        assert.match(
            menu,
            new RegExp(`\\.sao-resource-fill\\.${tone}\\{background:var\\(--sao-[a-z]+\\);\\}`)
        );
    }
});
