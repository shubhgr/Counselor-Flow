import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const routes = JSON.parse(
  fs.readFileSync(new URL('../src/lib/routes.json', import.meta.url), 'utf8'),
);
import config from '../next.config.mjs';
test('every Counselor flow has a native Next route and a React view', () => {
  assert.equal(Object.keys(routes).length, 20);
  for (const [name, { route, workspace }] of Object.entries(routes)) {
    const group = workspace ? '(workspace)' : '(public)';
    assert.ok(fs.existsSync(`src/app/${group}${route === '/' ? '' : route}/page.jsx`), route);
    assert.ok(fs.existsSync(`src/features/${name}/view.jsx`));
    assert.doesNotMatch(
      fs.readFileSync(`src/features/${name}/view.jsx`, 'utf8'),
      /<script|<iframe[^>]*src=\{["']\//,
    );
  }
});
test('old bookmarks retain redirects and Figma tokens remain exact', async () => {
  const redirects = await config.redirects();
  assert.equal(redirects.find((r) => r.source === '/profile.html').destination, '/profile');
  assert.equal(
    redirects.find((r) => r.source === '/services.html').destination,
    '/profile?tab=services',
  );
  const css = fs.readFileSync('src/design-system/tokens.css', 'utf8');
  for (const [name, value] of [
    ['purple-500', '#782bff'],
    ['purple-600', '#520ad0'],
    ['gray-200', '#dfdef0'],
    ['space-2', '6px'],
    ['space-13', '120px'],
    ['radius-7', '999px'],
    ['stroke-4', '4px'],
  ])
    assert.ok(css.includes(`--${name}: ${value};`), name);
});

test('shared controls are registry-sourced and all icon assets are Lucide SVG', () => {
  const registry = JSON.parse(fs.readFileSync('src/design-system/registry.json', 'utf8'));
  for (const name of [
    'button',
    'input',
    'textarea',
    'label',
    'card',
    'sidebar',
    'native-select',
    'dialog',
    'tabs',
    'switch',
    'table',
    'input-otp',
  ])
    assert.ok(registry.components.includes(name), name);
  assert.equal(registry.source, 'https://ui.shadcn.com');
  const aliases = JSON.parse(fs.readFileSync('src/design-system/icons.json', 'utf8'));
  const markup = JSON.parse(fs.readFileSync('src/design-system/icon-markup.json', 'utf8'));
  assert.equal(Object.keys(markup).length, Object.keys(aliases).length);
  for (const svg of Object.values(markup)) assert.match(svg, /<svg[^>]*class="lucide /);
  assert.doesNotMatch(
    fs.readFileSync('src/app/layout.jsx', 'utf8'),
    /fonts.googleapis|Material Symbols/,
  );
});
