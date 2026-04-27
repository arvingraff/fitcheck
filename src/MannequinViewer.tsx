import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { ClothingItem, Category } from './data/catalog';
import { categories, categoryIcons } from './data/catalog';
import { removeBackground } from './removeBackground';

interface Props {
  outfit: Partial<Record<Category, ClothingItem>>;
}

// Where each clothing layer sits on the body, in 3-D space
const LAYER_CONFIG: Record<Category, {
  position: [number, number, number];
  scale: [number, number, number];
  zOrder: number;
}> = {
  shoes:     { position: [0, -2.05, 0.21], scale: [1.5, 0.55, 1],   zOrder: 1 },
  pants:     { position: [0, -0.85, 0.21], scale: [1.4, 1.55, 1],   zOrder: 2 },
  tshirt:    { position: [0,  0.45, 0.22], scale: [1.45, 1.3, 1],   zOrder: 3 },
  jacket:    { position: [0,  0.42, 0.23], scale: [1.75, 1.45, 1],  zOrder: 4 },
  accessory: { position: [0.85, 0.42, 0.24], scale: [0.55, 0.55, 1], zOrder: 5 },
  hat:       { position: [0,  1.65, 0.22], scale: [0.85, 0.65, 1],  zOrder: 6 },
};

export default function MannequinViewer({ outfit }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const mannequinRef = useRef<THREE.Group | null>(null);
  const rafRef = useRef<number>(0);
  const isDragging = useRef(false);
  const prevMouse = useRef({ x: 0, y: 0 });
  const rotY = useRef(0);
  const rotX = useRef(0);
  const [processingBg, setProcessingBg] = useState(false);
  const [hint, setHint] = useState(true);

  // Build the mannequin body out of cylinders/spheres
  function buildMannequin(scene: THREE.Scene): THREE.Group {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x2a2a3a, roughness: 0.7, metalness: 0.1 });
    const wireMat = new THREE.MeshStandardMaterial({ color: 0x4a4a6a, roughness: 0.8, wireframe: false });

    const add = (geo: THREE.BufferGeometry, m: THREE.Material, x=0, y=0, z=0) => {
      const mesh = new THREE.Mesh(geo, m);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      group.add(mesh);
      return mesh;
    };

    // Head
    add(new THREE.SphereGeometry(0.28, 24, 24), mat, 0, 1.75, 0);
    // Neck
    add(new THREE.CylinderGeometry(0.1, 0.12, 0.25, 16), mat, 0, 1.44, 0);
    // Torso
    add(new THREE.CylinderGeometry(0.35, 0.28, 1.1, 20), wireMat, 0, 0.72, 0);
    // Hips
    add(new THREE.CylinderGeometry(0.32, 0.3, 0.35, 20), wireMat, 0, 0.1, 0);
    // Left upper arm
    const lua = add(new THREE.CylinderGeometry(0.1, 0.09, 0.65, 12), mat, -0.52, 0.95, 0);
    lua.rotation.z = Math.PI / 6;
    // Left lower arm
    const lla = add(new THREE.CylinderGeometry(0.08, 0.07, 0.55, 12), mat, -0.7, 0.45, 0);
    lla.rotation.z = Math.PI / 8;
    // Right upper arm
    const rua = add(new THREE.CylinderGeometry(0.1, 0.09, 0.65, 12), mat, 0.52, 0.95, 0);
    rua.rotation.z = -Math.PI / 6;
    // Right lower arm
    const rla = add(new THREE.CylinderGeometry(0.08, 0.07, 0.55, 12), mat, 0.7, 0.45, 0);
    rla.rotation.z = -Math.PI / 8;
    // Left thigh
    add(new THREE.CylinderGeometry(0.14, 0.12, 0.75, 14), mat, -0.17, -0.52, 0);
    // Left shin
    add(new THREE.CylinderGeometry(0.11, 0.09, 0.75, 14), mat, -0.17, -1.2, 0);
    // Left foot
    const lf = add(new THREE.BoxGeometry(0.2, 0.1, 0.38), mat, -0.17, -1.65, 0.08);
    lf.rotation.y = 0;
    // Right thigh
    add(new THREE.CylinderGeometry(0.14, 0.12, 0.75, 14), mat, 0.17, -0.52, 0);
    // Right shin
    add(new THREE.CylinderGeometry(0.11, 0.09, 0.75, 14), mat, 0.17, -1.2, 0);
    // Right foot
    add(new THREE.BoxGeometry(0.2, 0.1, 0.38), mat, 0.17, -1.65, 0.08);

    scene.add(group);
    return group;
  }

  // Add a clothing texture plane to the mannequin
  async function applyClothing(
    group: THREE.Group,
    item: ClothingItem,
    cat: Category,
  ) {
    // Remove old layer for this category
    const existing = group.getObjectByName(`layer-${cat}`);
    if (existing) group.remove(existing);

    setProcessingBg(true);
    let texUrl: string;
    try {
      texUrl = await removeBackground(item.imageUrl);
    } catch {
      texUrl = item.imageUrl;
    }
    setProcessingBg(false);

    const texture = new THREE.TextureLoader().load(texUrl);
    texture.colorSpace = THREE.SRGBColorSpace;

    const cfg = LAYER_CONFIG[cat];
    const geo = new THREE.PlaneGeometry(cfg.scale[0], cfg.scale[1]);
    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      alphaTest: 0.05,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = `layer-${cat}`;
    mesh.renderOrder = cfg.zOrder;
    mesh.position.set(...cfg.position);
    group.add(mesh);
  }

  // Init Three.js scene
  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const W = el.clientWidth;
    const H = el.clientHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    el.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d0d1a);
    sceneRef.current = scene;

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(3, 5, 5);
    dir.castShadow = true;
    scene.add(dir);
    const fill = new THREE.DirectionalLight(0x8888ff, 0.4);
    fill.position.set(-3, 2, -3);
    scene.add(fill);

    // Floor grid
    const grid = new THREE.GridHelper(6, 20, 0x2a2a4a, 0x1a1a2e);
    grid.position.y = -2.15;
    scene.add(grid);

    // Camera
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
    camera.position.set(0, 0.3, 4.5);
    cameraRef.current = camera;

    // Mannequin
    const mannequin = buildMannequin(scene);
    mannequinRef.current = mannequin;

    // Render loop
    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      if (!isDragging.current) rotY.current += 0.003; // slow auto-rotate
      mannequin.rotation.y = rotY.current;
      mannequin.rotation.x = rotX.current;
      renderer.render(scene, camera);
    };
    animate();

    // Mouse / touch drag
    const onDown = (e: MouseEvent | TouchEvent) => {
      isDragging.current = true;
      setHint(false);
      const { clientX, clientY } = 'touches' in e ? e.touches[0] : e;
      prevMouse.current = { x: clientX, y: clientY };
    };
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging.current) return;
      const { clientX, clientY } = 'touches' in e ? e.touches[0] : e;
      const dx = clientX - prevMouse.current.x;
      const dy = clientY - prevMouse.current.y;
      rotY.current += dx * 0.012;
      rotX.current = Math.max(-0.6, Math.min(0.6, rotX.current + dy * 0.008));
      prevMouse.current = { x: clientX, y: clientY };
    };
    const onUp = () => { isDragging.current = false; };

    el.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    el.addEventListener('touchstart', onDown, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onUp);

    const onResize = () => {
      const w = el.clientWidth, h = el.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(rafRef.current);
      renderer.dispose();
      el.removeChild(renderer.domElement);
      el.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      el.removeEventListener('touchstart', onDown);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  // Re-apply clothing when outfit changes
  useEffect(() => {
    const group = mannequinRef.current;
    if (!group) return;

    // Remove all clothing layers
    const toRemove = group.children.filter((c) => c.name.startsWith('layer-'));
    toRemove.forEach((c) => group.remove(c));

    // Add each selected item
    categories.forEach((cat) => {
      const item = outfit[cat];
      if (item) applyClothing(group, item, cat);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outfit]);

  const outfitItems = categories.map((c) => outfit[c]).filter(Boolean) as ClothingItem[];

  return (
    <div className="mannequin-wrapper">
      <div className="mannequin-canvas" ref={mountRef} />

      {hint && outfitItems.length > 0 && (
        <div className="mannequin-hint">🖱️ Drag to rotate</div>
      )}
      {processingBg && (
        <div className="mannequin-processing">✂️ Removing background…</div>
      )}

      {/* Rotation preset buttons */}
      <div className="mannequin-controls">
        <button
          className="rot-btn"
          onClick={() => { rotY.current = 0; rotX.current = 0; }}
          title="Front"
        >Front</button>
        <button
          className="rot-btn"
          onClick={() => { rotY.current = Math.PI; rotX.current = 0; }}
          title="Back"
        >Back</button>
        <button
          className="rot-btn"
          onClick={() => { rotY.current = Math.PI / 2; rotX.current = 0; }}
          title="Side"
        >Side</button>
      </div>

      {/* Item legend */}
      {outfitItems.length > 0 && (
        <div className="mannequin-legend">
          {outfitItems.map((item) => (
            <div key={item.id} className="legend-item">
              <span>{categoryIcons[item.category]}</span>
              <span className="legend-name">{item.name}</span>
              <span className="legend-store" style={{ color: item.storeColor }}>{item.store}</span>
              <span className="legend-price">${item.price}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
