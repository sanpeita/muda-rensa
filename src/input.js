const HOLD_MS = 350;
const HOLD_RADIUS = 8;
const ROTATION_WINDOW_MS = 900;

/** Recognize a quick, mostly circular turn in either direction, in CSS pixels. */
export function detectHyper(points) {
  if (!Array.isArray(points) || points.length < 9) return false;
  if (points.some(p => !p || ![p.x, p.y, p.t].every(Number.isFinite))) return false;
  if (points.some((p, i) => i > 0 && p.t < points[i - 1].t)) return false;
  const end = points.at(-1).t;
  const recent = points.filter(p => end - p.t <= ROTATION_WINDOW_MS);
  // Trying a few prefixes also permits a finger to move from the hold point
  // to the edge of its circle before drawing the actual turn.
  for (let start = 0; start <= recent.length - 9; start++) {
    const path = recent.slice(start);
    if (path.at(-1).t <= path[0].t) continue;
    const xs = path.map(p => p.x), ys = path.map(p => p.y);
    const width = Math.max(...xs) - Math.min(...xs);
    const height = Math.max(...ys) - Math.min(...ys);
    if (Math.min(width, height) / Math.max(width, height) < 0.55) continue;
    const cx = (Math.max(...xs) + Math.min(...xs)) / 2;
    const cy = (Math.max(...ys) + Math.min(...ys)) / 2;
    const radii = path.map(p => Math.hypot(p.x - cx, p.y - cy));
    const radius = radii.reduce((a, b) => a + b, 0) / path.length;
    if (radius < 12 || Math.min(...radii) < radius * 0.45) continue;
    const deviation = Math.sqrt(radii.reduce((sum, r) => sum + (r - radius) ** 2, 0) / path.length);
    if (deviation / radius > 0.3) continue;
    let signed = 0, absolute = 0, tooLargeStep = false;
    for (let i = 1; i < path.length; i++) {
      const a = Math.atan2(path[i - 1].y - cy, path[i - 1].x - cx);
      const b = Math.atan2(path[i].y - cy, path[i].x - cx);
      const angle = Math.atan2(Math.sin(b - a), Math.cos(b - a));
      if (Math.abs(angle) > Math.PI / 2) tooLargeStep = true;
      signed += angle;
      absolute += Math.abs(angle);
    }
    if (!tooLargeStep && Math.abs(signed) >= Math.PI * 1.8 && Math.abs(signed) / absolute >= 0.85) return true;
  }
  return false;
}

export class GestureInput {
  constructor(element, { onMove = () => {}, onCharge = () => {}, onRelease = () => {}, onCancel = () => {}, onHyper = () => {} } = {}) {
    this.element = element;
    this.callbacks = { onMove, onCharge, onRelease, onCancel, onHyper };
    this._mode = 'idle';
    this._hyper = false;
    this.pointerId = null;
    this.samples = [];
    this.listeners = [];
    if (element.style) element.style.touchAction = 'none';
    this.listen(element, 'pointerdown', e => this.down(e));
    this.listen(element, 'pointermove', e => this.move(e));
    this.listen(element, 'pointerup', e => this.up(e));
    this.listen(element, 'pointercancel', e => { if (e.pointerId === this.pointerId) this.cancel(); });
    this.listen(element, 'lostpointercapture', e => { if (e.pointerId === this.pointerId) this.cancel(); });
    this.view = element.ownerDocument?.defaultView ?? globalThis.window;
    this.document = element.ownerDocument ?? globalThis.document;
    if (this.view) this.listen(this.view, 'blur', () => this.cancel());
    if (this.document) this.listen(this.document, 'visibilitychange', () => { if (this.document.hidden) this.cancel(); });
  }

  get mode() { return this._mode; }
  get hyper() { return this._hyper; }

  listen(target, type, fn) {
    target.addEventListener(type, fn);
    this.listeners.push([target, type, fn]);
  }

  down(e) {
    if (this.pointerId !== null || (e.button !== undefined && e.button !== 0)) return;
    e.preventDefault?.();
    this.pointerId = e.pointerId;
    this._mode = 'moving';
    this._hyper = false;
    this.last = { x: e.clientX, y: e.clientY };
    this.anchor = { ...this.last };
    this.stationarySince = performance.now();
    this.samples = [];
    try { this.element.setPointerCapture?.(e.pointerId); } catch { /* Detached elements cannot capture. */ }
  }

  move(e) {
    if (e.pointerId !== this.pointerId) return;
    e.preventDefault?.();
    const now = performance.now();
    const position = { x: e.clientX, y: e.clientY };
    if (this._mode === 'moving') {
      const dx = position.x - this.last.x, dy = position.y - this.last.y;
      if (dx || dy) this.callbacks.onMove(dx, dy);
      if (Math.hypot(position.x - this.anchor.x, position.y - this.anchor.y) > HOLD_RADIUS) {
        this.anchor = { ...position };
        this.stationarySince = now;
      }
    } else if (this._mode === 'charging' && !this._hyper) {
      // Browsers merge high-frequency finger positions into one pointermove.
      // Preserve their original timestamps rather than timing the whole batch
      // at dispatch, which would hide a complete turn or misclassify a slow one.
      let coalesced = [];
      try { coalesced = e.getCoalescedEvents?.() ?? []; } catch { /* Unsupported capture provider. */ }
      if (!Array.isArray(coalesced)) coalesced = [];
      const events = [...coalesced, e];
      for (const sample of events) {
        if (!sample || !Number.isFinite(sample.clientX) || !Number.isFinite(sample.clientY)) continue;
        if (sample.pointerId !== undefined && sample.pointerId !== this.pointerId) continue;
        const validClock = Number.isFinite(sample.timeStamp) && sample.timeStamp >= 0 && sample.timeStamp <= now + 1;
        const timestamp = validClock ? sample.timeStamp : now;
        if (validClock && timestamp < this.chargedAt) continue;
        this.samples.push({ x: sample.clientX, y: sample.clientY, t: timestamp });
      }
      this.samples.sort((a, b) => a.t - b.t);
      const latest = this.samples.at(-1)?.t ?? now;
      const seen = new Set();
      this.samples = this.samples.filter(p => {
        const key = `${p.t}:${p.x}:${p.y}`;
        if (latest - p.t > ROTATION_WINDOW_MS || seen.has(key)) return false;
        seen.add(key);
        return true;
      }).slice(-160);
      if (detectHyper(this.samples)) {
        this._hyper = true;
        this.callbacks.onHyper();
      }
    }
    this.last = position;
  }

  update(nowMs) {
    if (this._mode === 'moving' && nowMs - this.stationarySince >= HOLD_MS) {
      this._mode = 'charging';
      this.chargedAt = nowMs;
      this.samples = [{ ...this.last, t: nowMs }];
      this.callbacks.onCharge();
    }
  }

  up(e) {
    if (e.pointerId !== this.pointerId) return;
    e.preventDefault?.();
    const hyper = this._hyper;
    this.reset();
    this.callbacks.onRelease(hyper);
  }

  reset() {
    const pointer = this.pointerId;
    this.pointerId = null;
    this._mode = 'idle';
    this._hyper = false;
    this.samples = [];
    // Clear identity first: releasing capture can immediately dispatch a loss event.
    try { if (pointer !== null) this.element.releasePointerCapture?.(pointer); } catch { /* Capture may already be lost. */ }
  }

  cancel() {
    if (this.pointerId === null) return;
    this.reset();
    this.callbacks.onCancel();
  }

  destroy() {
    this.cancel();
    for (const [target, type, fn] of this.listeners) target.removeEventListener(type, fn);
    this.listeners = [];
  }
}
