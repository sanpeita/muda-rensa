import { CONFIG as C } from './config.js';

export const STORAGE_KEY = 'muda-rensa:session:v1';
const MAX_TIME = 365 * 24 * 60 * 60;
const MAX_SERIALIZED_SIZE = 1024 * 1024;
const INVALID_MESSAGE = '保存データが壊れているか、対応していない形式です。新しく始めるか選んでください。';
const UNAVAILABLE_MESSAGE = 'この端末では続きの保存ができません。';
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const finite = (value, min, max) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
const integer = (value, min, max = Number.MAX_SAFE_INTEGER) => Number.isSafeInteger(value) && value >= min && value <= max;
const coordinate = value => finite(value, -C.bounds, C.bounds);

/** Validate the complete resumable simulation, including in-flight projectiles. */
export function validateSession(s) {
  try {
    if (!record(s) || s.schemaVersion !== 1 || !integer(s.seed, 0, 0xffffffff)) return false;
    if (!['playing', 'continue', 'won'].includes(s.phase) || typeof s.continued !== 'boolean') return false;
    if (!finite(s.elapsedSeconds, 0, MAX_TIME) || !integer(s.score, 0, 1e12)) return false;
    if (!integer(s.shots, 0, 1e9) || !integer(s.hyperShots, 0, s.shots) || !integer(s.nextProjectileId, 1)) return false;
    if (!record(s.drone) || !coordinate(s.drone.x) || !coordinate(s.drone.z) || !finite(s.drone.energy, 0, C.energyCap)) return false;
    const heading = s.drone.heading;
    if (!record(heading) || !finite(heading.x, -1, 1) || !finite(heading.z, -1, 1)) return false;
    if (Math.abs(Math.hypot(heading.x, heading.z) - 1) > 0.001) return false;
    if (!record(s.target) || !coordinate(s.target.x) || !coordinate(s.target.z)) return false;
    if (s.target.maxHp !== C.targetHp || !finite(s.target.hp, 0, s.target.maxHp)) return false;
    if ((s.phase === 'won') !== (s.target.hp === 0)) return false;
    if (s.phase === 'continue' && (s.continued || s.elapsedSeconds < C.limitSeconds)) return false;
    if (!Array.isArray(s.objects) || s.objects.length > 300) return false;
    const objectIds = new Set();
    for (const o of s.objects) {
      if (!record(o) || !integer(o.id, 0) || objectIds.has(o.id)) return false;
      objectIds.add(o.id);
      if (!['tree', 'car', 'crate'].includes(o.kind) || !['available', 'absorbing', 'gone'].includes(o.state)) return false;
      if (!coordinate(o.x) || !coordinate(o.z) || !integer(o.value, 1, C.energyCap)) return false;
      if (!finite(o.absorbProgress, 0, 1) || !finite(o.respawnAt, 0, MAX_TIME + C.respawnSeconds)) return false;
    }
    if (!Array.isArray(s.projectiles) || s.projectiles.length > 500) return false;
    const projectileIds = new Set();
    for (const p of s.projectiles) {
      if (!record(p) || !integer(p.id, 1) || p.id >= s.nextProjectileId || projectileIds.has(p.id)) return false;
      projectileIds.add(p.id);
      if (!finite(p.x, -100, 100) || !finite(p.z, -100, 100) || !finite(p.dx, -1, 1) || !finite(p.dz, -1, 1)) return false;
      if (Math.abs(Math.hypot(p.dx, p.dz) - 1) > 0.001) return false;
      if (!finite(p.damage, 0, C.energyCap * C.hyperMultiplier) || !finite(p.life, Number.MIN_VALUE, C.projectileLife)) return false;
      if (typeof p.hyper !== 'boolean') return false;
    }
    return true;
  } catch {
    return false;
  }
}

// Explicit field selection excludes input state, temporary effects and unknown data.
function cleanSession(s) {
  return {
    schemaVersion: 1, seed: s.seed, phase: s.phase, elapsedSeconds: s.elapsedSeconds, continued: s.continued,
    drone: { x: s.drone.x, z: s.drone.z, heading: { x: s.drone.heading.x, z: s.drone.heading.z }, energy: s.drone.energy },
    target: { x: s.target.x, z: s.target.z, hp: s.target.hp, maxHp: s.target.maxHp },
    score: s.score,
    objects: s.objects.map(o => ({ id: o.id, kind: o.kind, x: o.x, z: o.z, value: o.value, state: o.state, absorbProgress: o.absorbProgress, respawnAt: o.respawnAt })),
    projectiles: s.projectiles.map(p => ({ id: p.id, x: p.x, z: p.z, dx: p.dx, dz: p.dz, damage: p.damage, life: p.life, hyper: p.hyper })),
    nextProjectileId: s.nextProjectileId, shots: s.shots, hyperShots: s.hyperShots
  };
}

export function loadSession(storage) {
  let raw;
  try {
    if (!storage || typeof storage.getItem !== 'function') return { status: 'unavailable', message: UNAVAILABLE_MESSAGE };
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return { status: 'unavailable', message: UNAVAILABLE_MESSAGE };
  }
  if (raw === null) return { status: 'empty' };
  if (typeof raw !== 'string' || raw.length > MAX_SERIALIZED_SIZE) return { status: 'invalid', message: INVALID_MESSAGE };
  try {
    const state = JSON.parse(raw);
    if (!validateSession(state)) return { status: 'invalid', message: INVALID_MESSAGE };
    return { status: 'ok', state: cleanSession(state) };
  } catch {
    return { status: 'invalid', message: INVALID_MESSAGE };
  }
}

export function saveSession(storage, state) {
  if (!validateSession(state)) return { ok: false, message: INVALID_MESSAGE };
  try {
    if (!storage || typeof storage.setItem !== 'function') return { ok: false, message: UNAVAILABLE_MESSAGE };
    storage.setItem(STORAGE_KEY, JSON.stringify(cleanSession(state)));
    return { ok: true };
  } catch {
    return { ok: false, message: UNAVAILABLE_MESSAGE };
  }
}
