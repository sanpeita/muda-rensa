import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, moveDrone, release, step, continueGame } from '../src/game.js';
import { STORAGE_KEY, loadSession, saveSession, validateSession } from '../src/persistence.js';

function memoryStorage(initial = null) {
  let value = initial, writes = 0;
  return { getItem: key => { assert.equal(key, STORAGE_KEY); return value; }, setItem: (key, raw) => { assert.equal(key, STORAGE_KEY); value = raw; writes++; }, get value() { return value; }, get writes() { return writes; } };
}

test('initial state and partial suction restore without sharing references', () => {
  const state = createGame(), storage = memoryStorage();
  const o = state.objects.find(o => Math.hypot(o.x - state.drone.x, o.z - state.drone.z) < 5.7);
  step(state, 0.35, { charging: true });
  assert.equal(o.state, 'absorbing');
  assert.ok(o.absorbProgress > 0 && o.absorbProgress < 1);
  assert.deepEqual(saveSession(storage, state), { ok: true });
  const result = loadSession(storage);
  assert.equal(result.status, 'ok');
  assert.deepEqual(result.state, state);
  result.state.drone.x = 9;
  assert.equal(state.drone.x, 0);
});

test('release and partial flight roundtrip preserve damage, IDs and later single hits', () => {
  const state = createGame(), storage = memoryStorage();
  step(state, 1.4, { charging: true });
  assert.ok(state.drone.energy > 0);
  assert.equal(release(state, true), true);
  step(state, 0.1);
  assert.ok(state.projectiles.length > 0);
  assert.ok(state.target.hp < state.target.maxHp);
  const hp = state.target.hp;
  saveSession(storage, state);
  const restored = loadSession(storage).state;
  assert.equal(restored.target.hp, hp); // Loading never reapplies a release shockwave.
  assert.deepEqual(restored.projectiles, state.projectiles);
  for (let i = 0; i < 80; i++) { step(state, 0.04); step(restored, 0.04); }
  assert.deepEqual(restored, state);
  assert.equal(restored.projectiles.length, 0);
  const afterHits = restored.target.hp;
  step(restored, 0.04);
  assert.equal(restored.target.hp, afterHits);
});

test('continue and won phases roundtrip', () => {
  const storage = memoryStorage(), state = createGame();
  step(state, 0, { clockDelta: 300 });
  assert.equal(state.phase, 'continue');
  assert.equal(saveSession(storage, state).ok, true);
  const restored = loadSession(storage).state;
  continueGame(restored);
  assert.equal(restored.continued, true);
  restored.drone.energy = 180;
  restored.target.hp = 1;
  release(restored);
  assert.equal(restored.phase, 'won');
  assert.equal(saveSession(storage, restored).ok, true);
  assert.equal(loadSession(storage).state.target.hp, 0);
});

test('serialization drops unknown fields at every nesting level and input contact', () => {
  const state = createGame(), storage = memoryStorage();
  state.pointerId = 15; state.charging = true; state.secret = 'private';
  state.drone.extra = 'private'; state.drone.heading.extra = 'private'; state.target.extra = 'private'; state.objects[0].extra = 'private';
  state.drone.energy = 5;
  release(state); state.projectiles[0].extra = 'private';
  assert.equal(saveSession(storage, state).ok, true);
  assert.equal(storage.value.includes('private'), false);
  assert.equal(storage.value.includes('pointerId'), false);
  const parsed = JSON.parse(storage.value);
  parsed.extraOnDisk = 'untrusted'; parsed.drone.extraOnDisk = 'untrusted';
  storage.setItem(STORAGE_KEY, JSON.stringify(parsed));
  const restored = loadSession(storage).state;
  assert.equal('extraOnDisk' in restored, false);
  assert.equal('extraOnDisk' in restored.drone, false);
});

test('malformed, incompatible and oversized existing data are preserved until human chooses restart', () => {
  for (const raw of ['{', 'null', '[]', '', JSON.stringify({ ...createGame(), schemaVersion: 2 }), 'x'.repeat(1024 * 1024 + 1)]) {
    const storage = memoryStorage(raw);
    assert.equal(loadSession(storage).status, 'invalid');
    assert.equal(storage.value, raw);
    assert.equal(storage.writes, 0);
  }
  assert.deepEqual(loadSession(memoryStorage()), { status: 'empty' });
});

test('invalid finite bounds, enums, IDs, counters and lifecycle are rejected without writes', () => {
  const mutations = [
    s => { s.drone.energy = 181; }, s => { s.drone.x = Infinity; }, s => { s.target.hp = NaN; },
    s => { s.elapsedSeconds = -1; }, s => { s.elapsedSeconds = 1e20; }, s => { s.score = 0.5; },
    s => { s.seed = -1; }, s => { s.phase = 'paused'; }, s => { s.continued = 1; },
    s => { s.target.maxHp = 1e9; }, s => { s.target.hp = 3001; }, s => { s.phase = 'won'; },
    s => { s.hyperShots = 1; }, s => { s.shots = -1; }, s => { s.nextProjectileId = 0; },
    s => { s.drone.heading.x = 0; s.drone.heading.z = 0; },
    s => { s.objects[0].kind = 'unknown'; }, s => { s.objects[0].state = 'unknown'; },
    s => { s.objects[0].absorbProgress = 1.1; }, s => { s.objects[0].respawnAt = -1; },
    s => { s.objects[0].value = -3; }, s => { s.objects.push({ ...s.objects[0] }); },
    s => { s.objects = Array.from({ length: 301 }, (_, id) => ({ ...s.objects[0], id })); },
    s => { s.phase = 'continue'; s.elapsedSeconds = 299; }
  ];
  for (const change of mutations) {
    const state = createGame(), storage = memoryStorage('prior'); change(state);
    assert.equal(validateSession(state), false);
    assert.equal(saveSession(storage, state).ok, false);
    assert.equal(storage.value, 'prior'); assert.equal(storage.writes, 0);
  }
});

test('in-flight projectile corruption and duplication cannot load', () => {
  const mutations = [
    s => { s.projectiles[0].id = s.nextProjectileId; },
    s => { s.projectiles.push({ ...s.projectiles[0] }); },
    s => { s.projectiles[0].life = 0; }, s => { s.projectiles[0].life = 100; },
    s => { s.projectiles[0].damage = Infinity; }, s => { s.projectiles[0].x = 1e9; },
    s => { s.projectiles[0].dx = 99; }, s => { s.projectiles[0].hyper = 'true'; },
    s => { s.nextProjectileId = 600; s.projectiles = Array.from({ length: 501 }, (_, i) => ({ ...s.projectiles[0], id: i + 1 })); }
  ];
  for (const change of mutations) {
    const state = createGame(); state.drone.energy = 40; release(state); change(state);
    assert.equal(validateSession(state), false);
    assert.equal(loadSession(memoryStorage(JSON.stringify(state))).status, 'invalid');
  }
});

test('read denial, write quota and unavailable storage report failure without throwing', () => {
  const denied = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('quota'); } };
  assert.equal(loadSession(denied).status, 'unavailable');
  assert.equal(saveSession(denied, createGame()).ok, false);
  assert.equal(loadSession(null).status, 'unavailable');
  assert.equal(saveSession(null, createGame()).ok, false);
  const validStorage = memoryStorage();
  const poisonous = { get schemaVersion() { throw new Error('getter'); } };
  assert.equal(validateSession(poisonous), false);
  assert.equal(saveSession(validStorage, poisonous).ok, false);
  assert.equal(validStorage.writes, 0);
});
