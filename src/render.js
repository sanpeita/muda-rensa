import * as THREE from 'three';

const PALETTE = { ground: 0x263d4c, road: 0x1b2c3b, mint: 0x80bda8, teal: 0x4d887e, yellow: 0xf5d778, cyan: 0x85dfeb, coral: 0xe78479 };
const HYPER_COLORS = [0xff4791, 0x21eddf, 0xffdc38, 0x9e74ff, 0xff7d26];

export class GameRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x101c2b);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-22, 22, 22, -22, .1, 120);
    this.camera.position.set(20, 28, 24);
    this.camera.lookAt(0, 0, 0);
    this.scene.add(new THREE.HemisphereLight(0xc1e5f5, 0x3a414a, 2.2));
    const sun = new THREE.DirectionalLight(0xffebc4, 2.7);
    sun.position.set(-12, 24, 10);
    this.scene.add(sun);
    this.boxGeometry = new THREE.BoxGeometry(1, 1, 1);
    this.ballGeometry = new THREE.IcosahedronGeometry(1, 1);
    this.ringGeometry = new THREE.RingGeometry(.91, 1, 48);
    this.materials = new Map();
    this.objectMeshes = new Map();
    this.projectileMeshes = new Map();
    this.time = 0;
    this.lastHp = null;
    this.hitGlow = 0;
    this.buildWorld();
    this.buildDrone();
    this.buildTarget();
    this.buildVortex();
    this.resize();
  }

  material(color, flat = false) {
    const key = `${color}:${flat}`;
    if (!this.materials.has(key)) this.materials.set(key, flat
      ? new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide })
      : new THREE.MeshStandardMaterial({ color, roughness: .85, metalness: .03, flatShading: true }));
    return this.materials.get(key);
  }

  box(parent, color, size, position) {
    const mesh = new THREE.Mesh(this.boxGeometry, this.material(color));
    mesh.scale.set(...size);
    mesh.position.set(...position);
    parent.add(mesh);
    return mesh;
  }

  buildWorld() {
    this.box(this.scene, PALETTE.ground, [29, .65, 29], [0, -.45, 0]);
    this.box(this.scene, 0x365567, [29.4, .2, 29.4], [0, -.9, 0]);
    for (const axis of ['x', 'z']) {
      const size = axis === 'x' ? [29, .025, 2] : [2, .025, 29];
      for (const p of [-7, 0, 7]) {
        this.box(this.scene, PALETTE.road, size, axis === 'x' ? [0, -.09, p] : [p, -.09, 0]);
        for (let d = -13; d <= 13; d += 2) {
          this.box(this.scene, 0x596b75, axis === 'x' ? [.6, .026, .07] : [.07, .026, .6], axis === 'x' ? [d, -.06, p] : [p, -.06, d]);
        }
      }
    }
    // Edge landmarks frame the playable city without masking the central target.
    const colors = [0x426374, 0x597789, 0x477e7d, 0x636f81];
    for (let i = 0; i < 12; i++) {
      const side = Math.floor(i / 3), along = (i % 3 - 1) * 9;
      const x = side === 0 ? -12.6 : side === 1 ? 12.6 : along;
      const z = side === 2 ? -12.6 : side === 3 ? 12.6 : along;
      const h = 1.5 + (i % 3) * .65;
      this.box(this.scene, colors[i % 4], [1.65, h, 1.65], [x, h / 2, z]);
      this.box(this.scene, 0x76979c, [1.85, .15, 1.85], [x, h, z]);
      for (let floor = 0; floor < 2; floor++) {
        this.box(this.scene, 0xb0c9b6, [.22, .24, .035], [x - .4, .5 + floor * .6, z + .84]);
        this.box(this.scene, 0xb0c9b6, [.22, .24, .035], [x + .4, .5 + floor * .6, z + .84]);
      }
    }
  }

  buildDrone() {
    this.drone = new THREE.Group();
    this.scene.add(this.drone);
    this.box(this.drone, PALETTE.yellow, [.85, .32, .85], [0, 0, 0]);
    this.box(this.drone, 0x233744, [.5, .13, .5], [0, .22, 0]);
    this.box(this.drone, PALETTE.cyan, [.44, .16, .07], [0, .02, -.46]);
    this.propellers = [];
    for (const x of [-1, 1]) for (const z of [-1, 1]) {
      const arm = this.box(this.drone, 0x9baeb1, [.14, .13, 1.1], [x * .38, -.02, z * .38]);
      arm.rotation.y = x * z * Math.PI / 4;
      this.box(this.drone, PALETTE.yellow, [.25, .19, .25], [x * .68, .05, z * .68]);
      const prop = this.box(this.drone, 0xd7f8ed, [.73, .035, .12], [x * .68, .18, z * .68]);
      this.propellers.push(prop);
    }
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(.9, 24), new THREE.MeshBasicMaterial({ color: 0x0c202e, transparent: true, opacity: .55 }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = .01;
    this.shadow = shadow;
    this.scene.add(shadow);
    this.aim = new THREE.Group();
    for (let i = 0; i < 3; i++) this.box(this.aim, PALETTE.yellow, [.12, .05, .3], [0, .035, -1.4 - i * .6]);
    this.scene.add(this.aim);
  }

  buildTarget() {
    this.target = new THREE.Group();
    this.scene.add(this.target);
    this.box(this.target, 0x663650, [2.3, .25, 2.3], [0, .1, 0]);
    this.targetBody = this.box(this.target, 0xbe6476, [1.65, 2, 1.4], [0, 1.3, 0]);
    this.box(this.target, 0xe78479, [1.95, 1.3, 1.55], [0, 2.95, 0]);
    this.box(this.target, 0x4a304b, [1.2, .3, .07], [0, 3.06, .8]);
    for (const x of [-.36, .36]) this.box(this.target, 0xffdb82, [.2, .2, .1], [x, 3.08, .85]);
    for (const x of [-1, 1]) {
      this.box(this.target, 0x96556c, [.45, 1.3, .55], [x * 1.15, 1.65, 0]);
      this.box(this.target, 0x663650, [.6, .5, .7], [x * .5, .48, .05]);
      this.box(this.target, 0xf0ad8e, [.2, .6, .2], [x * .6, 3.85, 0]);
    }
    this.targetRing = new THREE.Mesh(this.ringGeometry, this.material(0xe78479, true));
    this.targetRing.rotation.x = -Math.PI / 2;
    this.targetRing.scale.setScalar(1.85);
    this.targetRing.position.y = .02;
    this.scene.add(this.targetRing);
  }

  makeObject(object) {
    const group = new THREE.Group();
    if (object.kind === 'tree') {
      this.box(group, 0x8c7564, [.18, .55, .18], [0, .27, 0]);
      this.box(group, PALETTE.teal, [.7, .65, .7], [0, .82, 0]);
      this.box(group, PALETTE.mint, [.48, .34, .48], [0, 1.27, 0]);
    } else if (object.kind === 'car') {
      const colors = [0xbba085, 0x7ea0af, 0xba7f77, 0x95ada0];
      const color = colors[Math.abs(Math.floor(object.x * 3 + object.z)) % colors.length];
      this.box(group, color, [.65, .35, 1.15], [0, .3, 0]);
      this.box(group, 0x9cc4ce, [.5, .25, .55], [0, .59, -.1]);
      for (const x of [-.34, .34]) for (const z of [-.35, .35]) this.box(group, 0x172633, [.12, .22, .25], [x, .15, z]);
    } else {
      this.box(group, 0xbba47b, [.6, .6, .6], [0, .3, 0]);
      this.box(group, 0xe0c39a, [.63, .09, .63], [0, .4, 0]);
    }
    this.scene.add(group);
    return group;
  }

  buildVortex() {
    this.vortex = new THREE.Group();
    this.scene.add(this.vortex);
    this.vortexDots = [];
    for (let i = 0; i < 36; i++) {
      const mesh = new THREE.Mesh(this.ballGeometry, this.material(i % 3 ? 0x85dfeb : 0xf5d778, true));
      mesh.scale.setScalar(.045 + (i % 3) * .015);
      this.vortex.add(mesh);
      this.vortexDots.push(mesh);
    }
    this.chargeRing = new THREE.Mesh(this.ringGeometry, this.material(0x85dfeb, true));
    this.chargeRing.rotation.x = -Math.PI / 2;
    this.chargeRing.scale.setScalar(3.6);
    this.chargeRing.position.y = .025;
    this.vortex.add(this.chargeRing);
  }

  resize() {
    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;
    if (width === this.width && height === this.height) return;
    this.width = width; this.height = height;
    this.renderer.setSize(width, height, false);
    const aspect = width / height;
    const halfWidth = aspect < 1 ? 22 : 24 * aspect;
    const halfHeight = halfWidth / aspect;
    this.camera.left = -halfWidth; this.camera.right = halfWidth;
    this.camera.top = halfHeight; this.camera.bottom = -halfHeight;
    this.camera.updateProjectionMatrix();
  }

  screenDeltaToWorld(dx, dy) {
    // Ground-plane inverse projection. Horizontal screen right is camera right.
    const rX = .768221, rZ = -.640184;
    const upX = -.469668, upZ = -.563602;
    const scale = .035;
    const det = rX * upZ - rZ * upX;
    const sx = dx * scale, sy = -dy * scale;
    return { x: (sx * upZ - rZ * sy) / det, z: (rX * sy - sx * upX) / det };
  }

  update(state, { charging = false, hyper = false } = {}, dt = 0) {
    this.resize();
    this.time += dt;
    const drone = state.drone;
    this.drone.position.set(drone.x, 1.55 + Math.sin(this.time * 4) * .06, drone.z);
    this.drone.rotation.y = Math.atan2(-drone.heading.x, -drone.heading.z);
    this.shadow.position.set(drone.x, .01, drone.z);
    this.aim.position.set(drone.x, 0, drone.z);
    this.aim.rotation.y = this.drone.rotation.y;
    for (const prop of this.propellers) prop.rotation.y += dt * (charging ? 40 : 25);
    this.drone.children[0].material = this.material(hyper ? 0xffdc38 : PALETTE.yellow);

    const activeIds = new Set();
    for (const object of state.objects) {
      activeIds.add(object.id);
      let group = this.objectMeshes.get(object.id);
      if (!group && object.state !== 'gone') {
        group = this.makeObject(object);
        this.objectMeshes.set(object.id, group);
      }
      if (!group) continue;
      group.visible = object.state !== 'gone';
      if (!group.visible) continue;
      const p = object.state === 'absorbing' ? Math.min(1, object.absorbProgress || 0) : 0;
      const angle = p * Math.PI * 3;
      const ox = object.x - drone.x, oz = object.z - drone.z;
      group.position.set(drone.x + (ox * Math.cos(angle) - oz * Math.sin(angle)) * (1 - p), p * 1.7, drone.z + (ox * Math.sin(angle) + oz * Math.cos(angle)) * (1 - p));
      group.scale.setScalar(1 - p * .9);
      group.rotation.y = p * Math.PI * 3;
    }
    for (const [id, group] of this.objectMeshes) if (!activeIds.has(id)) { this.scene.remove(group); this.objectMeshes.delete(id); }

    const projectileIds = new Set();
    for (const projectile of state.projectiles) {
      projectileIds.add(projectile.id);
      let mesh = this.projectileMeshes.get(projectile.id);
      if (!mesh) {
        const index = this.projectileMeshes.size % HYPER_COLORS.length;
        mesh = new THREE.Mesh(this.ballGeometry, this.material(projectile.hyper ? HYPER_COLORS[index] : 0xf5d778, true));
        mesh.scale.setScalar(projectile.hyper ? .36 : .17);
        this.scene.add(mesh);
        this.projectileMeshes.set(projectile.id, mesh);
      }
      mesh.position.set(projectile.x, 1.25, projectile.z);
      mesh.rotation.x += dt * 5;
    }
    for (const [id, mesh] of this.projectileMeshes) if (!projectileIds.has(id)) { this.scene.remove(mesh); this.projectileMeshes.delete(id); }

    this.vortex.visible = charging;
    this.vortex.position.set(drone.x, 0, drone.z);
    this.chargeRing.material = this.material(hyper ? 0xffdc38 : 0x85dfeb, true);
    this.vortexDots.forEach((mesh, i) => {
      const p = (i / this.vortexDots.length + this.time * .55) % 1;
      const radius = (1 - p) * 3.65;
      const angle = this.time * 5 + i * 2.4 + p * 8;
      mesh.position.set(Math.cos(angle) * radius, p * 2.2, Math.sin(angle) * radius);
      mesh.material = this.material(hyper ? HYPER_COLORS[i % 5] : i % 3 ? 0x85dfeb : 0xf5d778, true);
    });

    if (this.lastHp !== null && state.target.hp < this.lastHp) this.hitGlow = .3;
    this.lastHp = state.target.hp;
    this.hitGlow = Math.max(0, this.hitGlow - dt);
    this.target.position.set(state.target.x, 0, state.target.z);
    this.target.rotation.z = this.hitGlow > 0 ? Math.sin(this.time * 45) * .05 : 0;
    this.targetBody.material = this.material(this.hitGlow > 0 ? 0xffce9b : 0xbe6476);
    this.target.scale.setScalar(state.phase === 'won' ? .4 : 1);
    this.targetRing.position.set(state.target.x, .02, state.target.z);
    this.targetRing.visible = state.phase !== 'won';
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.boxGeometry.dispose(); this.ballGeometry.dispose(); this.ringGeometry.dispose();
    for (const material of this.materials.values()) material.dispose();
    this.shadow.geometry.dispose(); this.shadow.material.dispose();
    this.renderer.dispose();
  }
}
