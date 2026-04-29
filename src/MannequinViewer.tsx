import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { ClothingItem, Category } from './data/catalog';
import { categories, categoryIcons } from './data/catalog';

interface Props {
  outfit: Partial<Record<Category, ClothingItem>>;
}

function colorFromItem(item: ClothingItem): THREE.Color {
  const raw = item.color.toLowerCase();
  const map: Record<string, string> = {
    black: '#1a1a1a', white: '#f0f0f0', 'all white': '#f0f0f0',
    red: '#cc2222', blue: '#2255cc', navy: '#1a2a5a', 'triple black': '#111111',
    grey: '#888888', gray: '#888888', 'light grey': '#cccccc',
    khaki: '#c8b87a', beige: '#d4c9a0', olive: '#6b7a3a',
    brown: '#7a5230', tan: '#c8a87a', green: '#2a6a2a',
    charcoal: '#3a3a3a', purple: '#6a2a9a', indigo: '#3a4a8a',
    ecru: '#ede0cc', panda: '#eeeeee',
  };
  for (const [k, v] of Object.entries(map)) {
    if (raw.includes(k)) return new THREE.Color(v);
  }
  return new THREE.Color('#888888');
}

function darken(c: THREE.Color, amt = 0.3): THREE.Color {
  return new THREE.Color(c.r*(1-amt), c.g*(1-amt), c.b*(1-amt));
}

function mkMat(color: THREE.Color, rough = 0.8, metal = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
}

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, x=0,y=0,z=0,rx=0,rz=0,ry=0): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x,y,z); m.rotation.set(rx,ry,rz);
  m.castShadow = true;
  return m;
}

function buildMannequin(): THREE.Group {
  const g = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: 0x2d2d3d, roughness: 0.8 });
  const add = (geo: THREE.BufferGeometry, x=0,y=0,z=0,rx=0,rz=0) => {
    const m = new THREE.Mesh(geo, skin);
    m.position.set(x,y,z); m.rotation.x=rx; m.rotation.z=rz;
    m.castShadow=true; m.receiveShadow=true; g.add(m);
  };
  add(new THREE.SphereGeometry(0.28,32,32), 0,1.76,0);
  add(new THREE.CylinderGeometry(0.1,0.12,0.22,16), 0,1.47,0);
  add(new THREE.CylinderGeometry(0.36,0.28,1.05,24), 0,0.75,0);
  add(new THREE.CylinderGeometry(0.31,0.33,0.38,24), 0,0.12,0);
  add(new THREE.CylinderGeometry(0.10,0.09,0.62,14), -0.52,0.97,0, 0,Math.PI/7);
  add(new THREE.CylinderGeometry(0.08,0.07,0.58,14), -0.72,0.46,0, 0,Math.PI/12);
  add(new THREE.SphereGeometry(0.085,12,12), -0.79,0.16,0);
  add(new THREE.CylinderGeometry(0.10,0.09,0.62,14),  0.52,0.97,0, 0,-Math.PI/7);
  add(new THREE.CylinderGeometry(0.08,0.07,0.58,14),  0.72,0.46,0, 0,-Math.PI/12);
  add(new THREE.SphereGeometry(0.085,12,12),  0.79,0.16,0);
  add(new THREE.CylinderGeometry(0.155,0.13,0.78,18), -0.17,-0.54,0);
  add(new THREE.CylinderGeometry(0.115,0.09,0.76,18), -0.17,-1.23,0);
  add(new THREE.BoxGeometry(0.21,0.1,0.42), -0.17,-1.68,0.09);
  add(new THREE.CylinderGeometry(0.155,0.13,0.78,18),  0.17,-0.54,0);
  add(new THREE.CylinderGeometry(0.115,0.09,0.76,18),  0.17,-1.23,0);
  add(new THREE.BoxGeometry(0.21,0.1,0.42),  0.17,-1.68,0.09);
  return g;
}

function buildShoes(item: ClothingItem): THREE.Group {
  const g = new THREE.Group();
  const c = colorFromItem(item);
  const M = mkMat(c, 0.7), S = mkMat(darken(c,0.45),0.95);
  const laceM = mkMat(new THREE.Color('#f0f0f0'),0.5);
  [-1,1].forEach(side => {
    const x = side*0.17;
    g.add(mesh(new THREE.BoxGeometry(0.24,0.07,0.48), S, x,-1.73,0.09));
    g.add(mesh(new THREE.BoxGeometry(0.20,0.16,0.36), M, x,-1.60,0.08));
    g.add(mesh(new THREE.SphereGeometry(0.108,16,10,0,Math.PI*2,0,Math.PI/2), M, x,-1.605,0.255));
    g.add(mesh(new THREE.BoxGeometry(0.13,0.20,0.03), mkMat(darken(c,0.12),0.8), x,-1.565,0.21));
    for (let i=0;i<4;i++) g.add(mesh(new THREE.BoxGeometry(0.15,0.012,0.022),laceM,x,-1.545,0.04+i*0.06));
  });
  return g;
}

function buildPants(item: ClothingItem): THREE.Group {
  const g = new THREE.Group();
  const c = colorFromItem(item);
  const M = mkMat(c,0.85), MD = mkMat(darken(c,0.14),0.9), WB = mkMat(darken(c,0.22),0.78);
  g.add(mesh(new THREE.CylinderGeometry(0.36,0.35,0.13,32), WB, 0,0.265,0));
  g.add(mesh(new THREE.CylinderGeometry(0.35,0.31,0.32,32), M, 0,0.08,0));
  [-0.17,0.17].forEach(x => {
    g.add(mesh(new THREE.CylinderGeometry(0.182,0.155,0.82,22), M, x,-0.52,0));
    g.add(mesh(new THREE.CylinderGeometry(0.145,0.118,0.78,22), M, x,-1.24,0));
    g.add(mesh(new THREE.BoxGeometry(0.014,0.82,0.014), MD, x,-0.52,0.150));
    g.add(mesh(new THREE.CylinderGeometry(0.118,0.116,0.04,22), WB, x,-1.64,0));
  });
  return g;
}

function buildTshirt(item: ClothingItem): THREE.Group {
  const g = new THREE.Group();
  const c = colorFromItem(item);
  const M = mkMat(c,0.85), MD = mkMat(darken(c,0.12),0.9);
  g.add(mesh(new THREE.CylinderGeometry(0.385,0.325,1.06,32), M, 0,0.745,0));
  g.add(mesh(new THREE.CylinderGeometry(0.326,0.326,0.035,32), MD, 0,0.215,0));
  [-1,1].forEach(s => {
    g.add(mesh(new THREE.CylinderGeometry(0.118,0.102,0.38,18), MD, s*0.545,0.975,0, 0,s*Math.PI/5));
    g.add(mesh(new THREE.CylinderGeometry(0.100,0.100,0.032,18), MD, s*0.65,0.81,0, 0,s*Math.PI/5));
  });
  g.add(mesh(new THREE.TorusGeometry(0.148,0.040,12,32), MD, 0,1.27,0.04));
  return g;
}

function buildJacket(item: ClothingItem): THREE.Group {
  const g = new THREE.Group();
  const c = colorFromItem(item);
  const M = mkMat(c,0.72), MD = mkMat(darken(c,0.18),0.78), LN = mkMat(darken(c,0.30),0.65);
  const isHoodie = item.tags.some(t=>t.includes('hoodie')||t.includes('sweat'));
  g.add(mesh(new THREE.CylinderGeometry(0.455,0.365,1.14,32), M, 0,0.73,0));
  g.add(mesh(new THREE.CylinderGeometry(0.366,0.366,0.055,32), MD, 0,0.16,0));
  [-1,1].forEach(s => {
    g.add(mesh(new THREE.CylinderGeometry(0.133,0.122,0.68,18), MD, s*0.565,0.95,0, 0,s*Math.PI/7));
    g.add(mesh(new THREE.CylinderGeometry(0.118,0.106,0.60,18), MD, s*0.775,0.40,0, 0,s*Math.PI/12));
    g.add(mesh(new THREE.BoxGeometry(0.14,0.40,0.045), LN, s*0.14,1.02,0.41));
  });
  if (isHoodie) {
    g.add(mesh(new THREE.SphereGeometry(0.31,24,14,0,Math.PI*2,0,Math.PI/1.8), MD, 0,1.52,-0.10));
    g.add(mesh(new THREE.BoxGeometry(0.44,0.18,0.04), mkMat(darken(c,0.1),0.85), 0,0.42,0.43));
  } else {
    g.add(mesh(new THREE.BoxGeometry(0.32,0.11,0.06), MD, 0,1.28,0.37));
    const BT = mkMat(new THREE.Color('#aaa'),0.25,0.7);
    for (let i=0;i<3;i++) g.add(mesh(new THREE.CylinderGeometry(0.028,0.028,0.036,14), BT, 0,0.96-i*0.22,0.43));
  }
  return g;
}

function buildHat(item: ClothingItem): THREE.Group {
  const g = new THREE.Group();
  const c = colorFromItem(item);
  const M = mkMat(c,0.8), MD = mkMat(darken(c,0.22),0.85);
  const isBeanie = item.tags.includes('beanie');
  const isBucket = item.tags.includes('bucket hat');
  if (isBeanie) {
    g.add(mesh(new THREE.SphereGeometry(0.30,28,16,0,Math.PI*2,0,Math.PI/1.55), M, 0,1.75,0));
    g.add(mesh(new THREE.CylinderGeometry(0.295,0.295,0.10,28), MD, 0,1.565,0));
    g.add(mesh(new THREE.SphereGeometry(0.072,14,14), mkMat(new THREE.Color('#fff'),0.9), 0,2.07,0));
  } else if (isBucket) {
    g.add(mesh(new THREE.CylinderGeometry(0.265,0.285,0.28,32), M, 0,1.88,0));
    g.add(mesh(new THREE.SphereGeometry(0.265,32,10,0,Math.PI*2,0,Math.PI/2), M, 0,1.88,0));
    g.add(mesh(new THREE.CylinderGeometry(0.46,0.50,0.06,32), MD, 0,1.73,0));
  } else {
    g.add(mesh(new THREE.CylinderGeometry(0.275,0.295,0.28,32), M, 0,1.87,0));
    g.add(mesh(new THREE.SphereGeometry(0.275,32,10,0,Math.PI*2,0,Math.PI/2), M, 0,1.87,0));
    g.add(mesh(new THREE.BoxGeometry(0.64,0.042,0.26), MD, 0,1.715,-0.215));
    g.add(mesh(new THREE.TorusGeometry(0.290,0.030,10,32), MD, 0,1.71,0));
    g.add(mesh(new THREE.CylinderGeometry(0.038,0.038,0.038,12), MD, 0,2.03,0));
  }
  return g;
}

function buildAccessory(item: ClothingItem): THREE.Group {
  const g = new THREE.Group();
  const c = colorFromItem(item);
  const M = mkMat(c,0.3,0.7);
  const isSunglasses = item.tags.includes('sunglasses');
  const isWatch = item.tags.includes('watch');
  if (isSunglasses) {
    const lensM = new THREE.MeshStandardMaterial({color:0x0a0a22,roughness:0.08,metalness:0.85,transparent:true,opacity:0.80});
    g.add(mesh(new THREE.CylinderGeometry(0.098,0.098,0.022,32), lensM, -0.155,1.678,0.282,Math.PI/2));
    g.add(mesh(new THREE.CylinderGeometry(0.098,0.098,0.022,32), lensM,  0.155,1.678,0.282,Math.PI/2));
    g.add(mesh(new THREE.TorusGeometry(0.098,0.012,10,32), M, -0.155,1.678,0.282,Math.PI/2));
    g.add(mesh(new THREE.TorusGeometry(0.098,0.012,10,32), M,  0.155,1.678,0.282,Math.PI/2));
    g.add(mesh(new THREE.BoxGeometry(0.065,0.018,0.018), M, 0,1.678,0.282));
    g.add(mesh(new THREE.BoxGeometry(0.24,0.014,0.014), M, -0.265,1.678,0.175, 0,0,0.32));
    g.add(mesh(new THREE.BoxGeometry(0.24,0.014,0.014), M,  0.265,1.678,0.175, 0,0,-0.32));
  } else if (isWatch) {
    const faceM = mkMat(new THREE.Color('#0a0a0a'),0.15,0.95);
    g.add(mesh(new THREE.CylinderGeometry(0.075,0.075,0.032,32), faceM, -0.795,0.17,0,Math.PI/2));
    g.add(mesh(new THREE.TorusGeometry(0.075,0.014,10,32), M, -0.795,0.17,0,Math.PI/2));
  } else {
    g.add(mesh(new THREE.TorusGeometry(0.182,0.014,10,40), M, 0,1.27,0.10,0.40));
  }
  return g;
}

const BUILDERS: Record<Category,(item:ClothingItem)=>THREE.Group> = {
  shoes: buildShoes, pants: buildPants, tshirt: buildTshirt,
  jacket: buildJacket, hat: buildHat, accessory: buildAccessory,
};

export default function MannequinViewer({ outfit }: Props) {
  const mountRef  = useRef<HTMLDivElement>(null);
  const cgRef     = useRef<THREE.Group|null>(null);
  const rafRef    = useRef<number>(0);
  const rootRef   = useRef<THREE.Group|null>(null);
  const isDragging= useRef(false);
  const prev      = useRef({x:0,y:0});
  const rotY      = useRef(0);
  const rotX      = useRef(0);
  const [hint, setHint] = useState(true);

  useLayoutEffect(()=>{
    const el = mountRef.current;
    if (!el) return;

    const W = el.clientWidth || el.offsetWidth || 600;
    const H = el.clientHeight || el.offsetHeight || 540;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a18);
    scene.fog = new THREE.FogExp2(0x0a0a18, 0.06);
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const key = new THREE.DirectionalLight(0xfff4e0, 1.5);
    key.position.set(3,6,5); key.castShadow=true; key.shadow.mapSize.set(1024,1024); scene.add(key);
    const fill = new THREE.DirectionalLight(0xaabbff, 0.5);
    fill.position.set(-4,2,-3); scene.add(fill);
    const back = new THREE.DirectionalLight(0xffffff, 0.3);
    back.position.set(0,4,-6); scene.add(back);

    const floor = new THREE.Mesh(new THREE.CircleGeometry(4,48), new THREE.MeshStandardMaterial({color:0x111120,roughness:0.9}));
    floor.rotation.x=-Math.PI/2; floor.position.y=-2.15; floor.receiveShadow=true; scene.add(floor);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.1,0.04,10,60), new THREE.MeshBasicMaterial({color:0x3a2a6a,transparent:true,opacity:0.55}));
    ring.rotation.x=-Math.PI/2; ring.position.y=-2.13; scene.add(ring);

    const root = new THREE.Group(); scene.add(root); rootRef.current = root;
    root.add(buildMannequin());
    const cg = new THREE.Group(); root.add(cg); cgRef.current = cg;

    const camera = new THREE.PerspectiveCamera(42, W/H, 0.1, 50);
    camera.position.set(0, 0.35, 4.2);

    const applySize = () => {
      const w = el.clientWidth || el.offsetWidth;
      const h = el.clientHeight || el.offsetHeight;
      if (w > 10 && h > 10) {
        renderer.setSize(w, h);
        camera.aspect = w/h;
        camera.updateProjectionMatrix();
      }
    };

    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      if (!isDragging.current) rotY.current += 0.004;
      root.rotation.y = rotY.current;
      root.rotation.x = rotX.current;
      renderer.render(scene, camera);
    };
    animate();

    const dn = (e: MouseEvent|TouchEvent) => { isDragging.current=true; setHint(false); const p='touches'in e?e.touches[0]:e; prev.current={x:p.clientX,y:p.clientY}; };
    const mv = (e: MouseEvent|TouchEvent) => { if(!isDragging.current)return; const p='touches'in e?e.touches[0]:e; rotY.current+=(p.clientX-prev.current.x)*0.013; rotX.current=Math.max(-0.55,Math.min(0.55,rotX.current+(p.clientY-prev.current.y)*0.009)); prev.current={x:p.clientX,y:p.clientY}; };
    const up = () => { isDragging.current=false; };
    el.addEventListener('mousedown',dn); window.addEventListener('mousemove',mv); window.addEventListener('mouseup',up);
    el.addEventListener('touchstart',dn,{passive:true}); window.addEventListener('touchmove',mv,{passive:true}); window.addEventListener('touchend',up);
    window.addEventListener('resize', applySize);

    return () => {
      cancelAnimationFrame(rafRef.current);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
      el.removeEventListener('mousedown',dn); window.removeEventListener('mousemove',mv); window.removeEventListener('mouseup',up);
      el.removeEventListener('touchstart',dn); window.removeEventListener('touchmove',mv); window.removeEventListener('touchend',up);
      window.removeEventListener('resize', applySize);
    };
  }, []);

  useEffect(()=>{
    const cg = cgRef.current; if (!cg) return;
    while (cg.children.length) {
      const c = cg.children[0]; cg.remove(c);
      c.traverse(o => { if (o instanceof THREE.Mesh) { o.geometry.dispose(); (Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose()); }});
    }
    categories.forEach(cat => { const item=outfit[cat]; if(item){ const grp=BUILDERS[cat](item); grp.name=`clothing-${cat}`; cg.add(grp); }});
  }, [outfit]);

  const outfitItems = categories.map(c=>outfit[c]).filter(Boolean) as ClothingItem[];
  const snap = (y: number) => { rotY.current=y; rotX.current=0; };

  return (
    <div className="mannequin-wrapper">
      <div className="mannequin-canvas" ref={mountRef} />
      {hint && outfitItems.length>0 && <div className="mannequin-hint">🖱️ Drag to rotate 360°</div>}
      <div className="mannequin-controls">
        <button className="rot-btn" onClick={()=>snap(0)}>Front</button>
        <button className="rot-btn" onClick={()=>snap(Math.PI)}>Back</button>
        <button className="rot-btn" onClick={()=>snap(Math.PI/2)}>Side</button>
      </div>
      {outfitItems.length===0 && <div className="mannequin-empty-overlay"><p>Pick clothes from the catalog<br/>to dress the mannequin</p></div>}
      {outfitItems.length>0 && (
        <div className="mannequin-legend">
          {outfitItems.map(item=>(
            <div key={item.id} className="legend-item">
              <span>{categoryIcons[item.category]}</span>
              <span className="legend-name">{item.name}</span>
              <span className="legend-store" style={{color:item.storeColor}}>{item.store}</span>
              <span className="legend-price">${item.price}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
