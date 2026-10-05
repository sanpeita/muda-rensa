import test from 'node:test';
import assert from 'node:assert/strict';
import { detectHyper, GestureInput } from '../src/input.js';

function circle({ radius = 30, duration = 700, direction = 1, turns = 1, count = 40 } = {}) {
  return Array.from({ length: count + 1 }, (_, i) => {
    const angle = direction * i / count * Math.PI * 2 * turns;
    return { x: 180 + Math.cos(angle) * radius, y: 240 + Math.sin(angle) * radius, t: i / count * duration };
  });
}

test('quick circles qualify clockwise and counterclockwise, even after approaching from the center', () => {
  for (const direction of [-1, 1]) {
    const path = circle({ direction });
    assert.equal(detectHyper(path), true);
    assert.equal(detectHyper([{ x: 180, y: 240, t: 0 }, ...path]), true);
  }
});

test('slow turns, tiny circles, half turns and invalid samples do not qualify', () => {
  assert.equal(detectHyper(circle({ duration: 1600 })), false);
  assert.equal(detectHyper(circle({ radius: 10 })), false);
  assert.equal(detectHyper(circle({ turns: 0.5 })), false);
  assert.equal(detectHyper([]), false);
  assert.equal(detectHyper([...circle(), { x: NaN, y: 0, t: 800 }]), false);
  assert.equal(detectHyper(circle().reverse()), false);
});

test('straight drags, zigzags and backtracking arcs do not trigger hyper', () => {
  const straight = Array.from({ length: 41 }, (_, i) => ({ x: i * 4, y: 30, t: i * 15 }));
  const zigzag = straight.map((p, i) => ({ ...p, y: i % 2 ? 50 : -50 }));
  const arc = circle({ turns: 0.4, duration: 300 });
  const backtrack = [...arc, ...arc.slice().reverse().map((p, i) => ({ ...p, t: 301 + i * 7 }))];
  assert.equal(detectHyper(straight), false);
  assert.equal(detectHyper(zigzag), false);
  assert.equal(detectHyper(backtrack), false);
});

class MockTarget {
  constructor() { this.handlers = new Map(); this.style = {}; }
  addEventListener(type, fn) { if (!this.handlers.has(type)) this.handlers.set(type, []); this.handlers.get(type).push(fn); }
  removeEventListener(type, fn) { this.handlers.set(type, this.handlers.get(type).filter(f => f !== fn)); }
  emit(type, event = {}) { for (const fn of this.handlers.get(type) ?? []) fn({ pointerId: 1, clientX: 0, clientY: 0, button: 0, preventDefault() {}, ...event }); }
  setPointerCapture(id) { this.captured = id; }
  releasePointerCapture(id) { this.captured = null; this.emit('lostpointercapture', { pointerId: id }); }
}

function setup(t) {
  let now = 0;
  t.mock.method(performance, 'now', () => now);
  const element = new MockTarget(), view = new MockTarget(), doc = new MockTarget();
  element.ownerDocument = doc;
  doc.defaultView = view;
  const calls = [];
  const input = new GestureInput(element, {
    onMove: (dx, dy) => calls.push(['move', dx, dy]),
    onCharge: () => calls.push(['charge']), onHyper: () => calls.push(['hyper']),
    onRelease: hyper => calls.push(['release', hyper]), onCancel: () => calls.push(['cancel'])
  });
  return { element, view, doc, calls, input, setTime: value => { now = value; } };
}

test('drag updates direction, stopping charges after 350 ms and release fires once', t => {
  const { element, input, calls, setTime } = setup(t);
  element.emit('pointerdown');
  setTime(200); element.emit('pointermove', { clientX: 30, clientY: 10 });
  input.update(549); assert.equal(input.mode, 'moving');
  input.update(550); assert.equal(input.mode, 'charging');
  input.update(800);
  element.emit('pointermove', { clientX: 34, clientY: 10 });
  element.emit('pointerup'); element.emit('pointerup');
  assert.deepEqual(calls, [['move', 30, 10], ['charge'], ['release', false]]);
  assert.equal(input.mode, 'idle'); assert.equal(input.hyper, false);
});

test('stationary jitter allows hold; additional pointers do not control or release it', t => {
  const { element, input, calls, setTime } = setup(t);
  element.emit('pointerdown');
  setTime(200); element.emit('pointermove', { clientX: 3, clientY: 2 });
  element.emit('pointerdown', { pointerId: 2 });
  element.emit('pointermove', { pointerId: 2, clientX: 80 });
  element.emit('pointerup', { pointerId: 2 });
  input.update(350);
  assert.equal(input.mode, 'charging');
  assert.deepEqual(calls, [['move', 3, 2], ['charge']]);
});

test('circle during charge locks hyper once and never changes movement direction', t => {
  const { element, input, calls, setTime } = setup(t);
  element.emit('pointerdown', { clientX: 180, clientY: 240 });
  input.update(350);
  for (const p of circle({ turns: 2, duration: 800, count: 80 })) {
    setTime(350 + p.t); element.emit('pointermove', { clientX: p.x, clientY: p.y });
  }
  assert.equal(input.hyper, true);
  element.emit('pointerup');
  assert.deepEqual(calls, [['charge'], ['hyper'], ['release', true]]);
});

test('cancel, blur, visibility loss and lost capture suppress release', t => {
  const { element, input, calls, view, doc } = setup(t);
  for (const stop of [() => input.cancel(), () => view.emit('blur'), () => { doc.hidden = true; doc.emit('visibilitychange'); }, () => element.emit('lostpointercapture'), () => element.emit('pointercancel')]) {
    element.emit('pointerdown'); input.update(350); stop(); element.emit('pointerup');
    assert.equal(input.mode, 'idle');
  }
  assert.equal(calls.filter(c => c[0] === 'release').length, 0);
  assert.equal(calls.filter(c => c[0] === 'cancel').length, 5);
});

test('one coalesced circle arms hyper once using original sample timestamps', t => {
  const { element, input, calls, setTime } = setup(t);
  element.emit('pointerdown', { clientX: 180, clientY: 240 });
  input.update(350);
  const batch = circle().map(p => ({ pointerId: 1, clientX: p.x, clientY: p.y, timeStamp: 350 + p.t }));
  setTime(1050);
  const end = batch.at(-1);
  element.emit('pointermove', { ...end, getCoalescedEvents: () => batch });
  element.emit('pointermove', { ...end, getCoalescedEvents: () => batch });
  assert.equal(input.hyper, true);
  assert.deepEqual(input.last, { x: end.clientX, y: end.clientY });
  element.emit('pointerup');
  assert.deepEqual(calls, [['charge'], ['hyper'], ['release', true]]);
});

test('coalesced slow turns retain their duration and cannot arm hyper', t => {
  const { element, input, setTime } = setup(t);
  element.emit('pointerdown', { clientX: 180, clientY: 240 });
  input.update(350);
  const batch = circle({ duration: 1600 }).map(p => ({ clientX: p.x, clientY: p.y, timeStamp: 350 + p.t }));
  setTime(1950);
  element.emit('pointermove', { ...batch.at(-1), getCoalescedEvents: () => batch });
  assert.equal(input.hyper, false);
});

test('out-of-order overlapping coalesced batches are sorted and deduplicated', t => {
  const { element, input, calls, setTime } = setup(t);
  element.emit('pointerdown', { clientX: 180, clientY: 240 });
  input.update(350);
  const batch = circle().map(p => ({ clientX: p.x, clientY: p.y, timeStamp: 350 + p.t }));
  setTime(1050);
  element.emit('pointermove', { ...batch.at(-1), getCoalescedEvents: () => [batch.at(-1), ...batch.slice().reverse(), ...batch.slice(0, 5)] });
  assert.equal(input.hyper, true);
  assert.ok(input.samples.every((p, i) => i === 0 || p.t >= input.samples[i - 1].t));
  assert.equal(new Set(input.samples.map(p => `${p.t}:${p.x}:${p.y}`)).size, input.samples.length);
  assert.deepEqual(calls, [['charge'], ['hyper']]);
});

test('empty, invalid and throwing coalesced providers fall back to the real event', t => {
  const { element, input, setTime } = setup(t);
  element.emit('pointerdown', { clientX: 180, clientY: 240 });
  input.update(350);
  const providers = [() => [], () => null, () => [{ clientX: NaN, clientY: 0 }], () => { throw new Error('unsupported'); }];
  for (const [i, p] of circle().entries()) {
    setTime(350 + p.t);
    element.emit('pointermove', { clientX: p.x, clientY: p.y, timeStamp: i % 2 ? NaN : Date.now(), getCoalescedEvents: providers[i % providers.length] });
  }
  assert.equal(input.hyper, true);
});
