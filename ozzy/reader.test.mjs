import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, sep } from 'node:path';
import { clampPage, stateFromSearch, searchFromState } from './reader.mjs';

const root = fileURLToPath(new URL('.', import.meta.url));
const catalog = JSON.parse(await readFile(new URL('./books.json', import.meta.url), 'utf8'));

test('shared reading links preserve the selected book and clamp its page', () => {
  assert.deepEqual(stateFromSearch('', catalog.editions, catalog.defaultVersion), { version: 'v4', page: 0 });
  assert.deepEqual(stateFromSearch('?v=v2&p=6', catalog.editions, 'v4'), { version: 'v4', page: 6 });
  assert.deepEqual(stateFromSearch('?v=unknown&p=999', catalog.editions, 'v4'), { version: 'v4', page: 10 });
  assert.deepEqual(stateFromSearch('?v=v1&p=bad', catalog.editions, 'v4'), { version: 'v4', page: 0 });
  for (const invalid of [-5, '-Infinity', 'NaN', undefined]) assert.equal(clampPage(invalid, 11), 0);
  assert.deepEqual(stateFromSearch('?v=bedtime&p=999', catalog.editions, 'v4'), { version: 'bedtime', page: 13 });
  for (const state of [{ version: 'bedtime', page: 0 }, { version: 'bedtime', page: 9 }, { version: 'v4', page: 6 }]) {
    const search = searchFromState(state, 'v4');
    assert.deepEqual(stateFromSearch(search, catalog.editions, 'v4'), state);
  }
  assert.equal(searchFromState({ version: 'v4', page: 0 }, 'v4'), '');
  assert.equal(searchFromState({ version: 'bedtime', page: 9 }, 'v4'), '?v=bedtime&p=9');
});

test('both final books have complete pages and matching downloadable PDFs', async () => {
  assert.deepEqual(catalog.editions.map(item => item.id), ['v4', 'bedtime']);
  const labels = {
    v4: ['封面', ...Array.from({ length: 10 }, (_, i) => `第 ${i + 1} 页`)],
    bedtime: ['封面', '前衬页', ...Array.from({ length: 10 }, (_, i) => `第 ${i + 1} 页`), '后衬页', '封底'],
  };
  const paths = new Set();
  for (const edition of catalog.editions) {
    assert.equal(edition.pages.length, labels[edition.id].length);
    for (const [index, page] of edition.pages.entries()) {
      assert.equal(page.label, labels[edition.id][index]);
      assert.ok(page.alt.length > page.label.length);
      assert.ok(page.width > 0 && page.width === page.height);
      assert.ok(resolve(root, page.image).startsWith(root.replace(/\/$/, '') + sep));
      assert.ok(!paths.has(page.image)); paths.add(page.image);
      const image = await readFile(resolve(root, page.image));
      assert.equal(image.toString('ascii', 0, 4), 'RIFF');
      assert.equal(image.toString('ascii', 8, 12), 'WEBP');
    }
    const pdf = await readFile(resolve(root, edition.pdf));
    assert.equal(pdf.toString('ascii', 0, 5), '%PDF-');
    assert.equal((await stat(resolve(root, edition.pdf))).size, edition.pdfBytes);
  }
  assert.equal(paths.size, 25);
  assert.ok(!JSON.stringify(catalog).includes('/Users/'));
  assert.ok(!JSON.stringify(catalog.editions[1]).includes('资料来源'));
  assert.ok(!JSON.stringify(catalog.editions[1]).includes('共读提示'));
});

test('homepage and no-script fallback point to published book assets', async () => {
  const home = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const page = await readFile(new URL('./index.html', import.meta.url), 'utf8');
  assert.ok(home.includes('href="/ozzy/"'));
  assert.ok(page.includes('./downloads/ozzy-potty-v4.pdf'));
  assert.ok(page.includes('./downloads/ozzy-bedtime.pdf'));
  assert.ok(page.includes('href="./?v=bedtime"'));
  assert.ok(page.includes('./assets/v4/page-00.webp'));
  assert.ok(page.includes('<noscript>'));
});
