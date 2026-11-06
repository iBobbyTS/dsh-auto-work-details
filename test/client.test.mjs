import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../client.js', import.meta.url), 'utf8');

function conversation(id) {
  const root = {
    id, groups: [],
    getAttribute(name) { return name === 'data-conversation-session' ? this.id : null; },
    querySelectorAll() { return this.groups; },
  };
  return root;
}

function group(root, key) {
  const header = {
    clicks: 0, open: false, running: true,
    closest: () => null,
    getClientRects: () => [{}],
    querySelector() { return this.running ? {} : null; },
    getAttribute() { return String(this.open); },
    click() { this.clicks++; this.open = !this.open; this.focus(); },
    focus() { assert.fail('synthetic click stole focus'); },
  };
  const value = {
    header,
    closest(selector) { return selector === '[data-conversation-content]' ? root : null; },
    getClientRects: () => [{}],
    querySelector: () => header,
    getAttribute: () => key,
  };
  root.groups.push(value);
  return value;
}

function mount(root, id, pageRoots = []) {
  const frames = new Map();
  const effects = [];
  const observers = [];
  const document = {
    visibilityState: 'visible',
    body: { querySelectorAll: () => pageRoots.flatMap(root => root.groups) },
    addEventListener() {}, removeEventListener() {},
  };
  let sequence = 0;
  document.defaultView = {
    MutationObserver: class {
      constructor(notify) { this.notify = notify; observers.push(this); }
      observe(target) { this.target = target; }
      disconnect() { this.disconnected = true; }
    },
    requestAnimationFrame(fn) { const key = ++sequence; frames.set(key, fn); return key; },
    cancelAnimationFrame(key) { frames.delete(key); },
    addEventListener() {}, removeEventListener() {},
  };
  const host = {
    ownerDocument: document,
    closest(selector) { return selector === '[data-conversation-content]' ? root : null; },
  };
  const React = {
    createElement: () => null,
    useRef: () => ({ current: host }),
    useEffect: fn => effects.push(fn),
  };
  let plugin, component;
  new Function('window', source)({
    localStorage: { removeItem() {} },
    __ModuleLoader__: { load(spec) { plugin = spec.factory(() => React); } },
  });
  plugin.apply({
    effect: fn => fn(),
    slots: { inject: (_, fn) => fn(), register: (_, value) => { component = value; } },
  });
  component({ sessionId: id });
  const cleanups = effects.map(fn => fn());
  function flush() { for (const [key, fn] of [...frames]) { frames.delete(key); fn(); } }
  flush();
  return { observers, flush, cleanup() { cleanups.forEach(fn => fn?.()); } };
}

test('main and embedded conversations observe only their own groups', () => {
  const main = conversation('main'), child = conversation('child');
  const mainGroup = group(main, 'same-key'), childGroup = group(child, 'same-key');
  const a = mount(main, 'main', [main, child]);
  assert.equal(mainGroup.header.clicks, 1);
  assert.equal(childGroup.header.clicks, 0);
  mainGroup.header.open = false; // User collapses an already-running group.
  const b = mount(child, 'child', [main, child]);
  assert.equal(mainGroup.header.clicks, 1, 'opening the child does not reopen the main group');
  assert.equal(childGroup.header.clicks, 1);
  assert.equal(a.observers[0].target, main);
  assert.equal(b.observers[0].target, child);
  childGroup.header.running = false;
  b.observers[0].notify(); b.flush();
  assert.equal(childGroup.header.open, false, 'completed child group folds normally');
  a.cleanup(); b.cleanup();
  assert.ok(a.observers[0].disconnected && b.observers[0].disconnected);
});

test('an outer conversation does not operate on a nested occurrence', () => {
  const main = conversation('main'), nested = conversation('nested');
  const nestedGroup = group(nested, 'nested-group');
  main.groups.push(nestedGroup);
  mount(main, 'main', [main, nested]).cleanup();
  assert.equal(nestedGroup.header.clicks, 0);
});

for (const [name, root] of [['missing container', null], ['wrong session container', conversation('other')]]) {
  test(`${name} never falls back to observing the page`, () => {
    const page = conversation('page'); const value = group(page, 'page-group');
    const observer = mount(root, 'requested', [page]);
    assert.equal(observer.observers.length, 0);
    assert.equal(value.header.clicks, 0);
    observer.cleanup();
  });
}
