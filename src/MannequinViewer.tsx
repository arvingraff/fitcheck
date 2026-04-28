import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { ClothingItem, Category } from './data/catalog';
import { categories, categoryIcons } from './data/catalog';

interface Props {
  outfit: Partial<Record<Category, ClothingItem>>;
}

// ── Colour helper ─────────────────────────────────────────────────────────
function colorFromItem(item: ClothingItem): THREE.Color {
  const raw = item.color.toLowerCase();
  const map: Record<string, string> = {
    black: '#1a1a1a', white: '#f0f0f0', 'all white': '#f0f0f0',
    red: '#cc2222', blue: '#2255cc', navy: '#1a2a5a', 'triple black': '#111111',
    grey: '#888888', gray: '#888888', 'light grey': '#cccccc',
    khaki: '#c8b87a', beige: '#d4c9a0', olive: '#6b7a3a',
    brown: '#7a5230', tan: '#c8a87a', 'hamilton brown': '#7a5230',
    green: '#2a6a2a', 'white/green': '#e8f0e0', 'sage green': '#7a9a6a',
    'medium indigo': '#3a4a8a', indigo: '#3a4a8a',
    ecru: '#ede0cc', 'vintage white': '#ede8d8',
    panda: '#eeeeee', 'white/black/gum': '#eeeeee',
    charcoal: '#3a3a3a', gunmetal: '#3a3f44', purple: '#6a2a9a',
  };
  for (const [k, v] of Object.entries(map)) {
    if (raw.includes(k)) return new THREE.Color(v);
  }
  return new THREE.Color('#888888');
}

function darken(c: THREE.Color, amt = 0.3): THREE.Color {
  return new THREE.Color(c.r * (1 - amt), c.g * (1 - amt), c.b * (1 - amt));
}

function mkMat(color: THREE.Color, rough = 0.8, metal = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
}

// ── Mannequin body ────────────────────────────────────────────────────────
function buildMannequin(): THREE.Group {
  const g = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: 0x2d2d3d, roughness: 0.8 });

  const add = (geo: THREE.BufferGeometry, x = 0, y = 0, z = 0, rx = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, skin);
    m.position.set(x, y, z);
    m.rotation.x = rx; m.rotation.z = rz;
    m.castShadow = true; m.receiveShadow = true;
    g.add(m);
  };

  add(new THREE.SphereGeometry(0.28, 32, 32), 0, 1.76, 0);            // head
  add(new THREE.CylinderGeometry(0.1, 0.12, 0.22, 16), 0, 1.47, 0);  // neck
  add(new THREE.CylinderGeometry(0.36, 0.28, 1.05, 24), 0, 0.75, 0); // torso
  add(new THREE.CylinderGeometry(0.31, 0.33, 0.38, 24), 0, 0.12, 0); // hips
  add(new THREE.CylinderGeometry(0.10, 0.09, 0.62, 14), -0.52, 0.97, 0, 0,  Math.PI/7);  // L upper arm
  add(new THREE.CylinderGeometry(0.08, 0.07, 0.58, 14), -0.72, 0.46, 0, 0,  Math.PI/12); // L lower arm
  add(new THREE.SphereGeometry(0.085, 12, 12),           -0.79, 0.16, 0);                 // L hand
  add(new THREE.CylinderGeometry(0.10, 0.09, 0.62, 14),  0.52, 0.97, 0, 0, -Math.PI/7);  // R upper arm
  add(new THREE.CylinderGeometry(0.08, 0.07, 0.58, 14),  0.72, 0.46, 0, 0, -Math.PI/12); // R lower arm
  add(new THREE.SphereGeometry(0.085, 12, 12),            0.79, 0.16, 0);                 // R hand
  add(new THREE.CylinderGeometry(0.155, 0.13, 0.78, 18), -0.17, -0.54, 0); // L thigh
  add(new THREE.CylinderGeometry(0.115, 0.09, 0.76, 18), -0.17, -1.23, 0); // L shin
  add(new THREE.BoxGeometry(0.21, 0.1, 0.42),             -0.17, -1.68, 0.09); // L foot
  add(new THREE.CylinderGeometry(0.155, 0.13, 0.78, 18),  0.17, -0.54, 0); // R thigh
  add(new THREE.CylinderGeometry(0.115, 0.09, 0.76, 18),  0.17, -1.23, 0); // R shin
  add(new THREE.BoxGeometry(0.21, 0.1, 0.42),              0.17, -1.68, 0.09); // R foot

  return g;
}

// ── Clothing builders ─────────────────────────────────────────────────────
function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, x=0, y=0, z=0, rx=0, rz=0, ry=0): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x,y,z); m.rotation.set(rx,ry,rz);
  m.castShadow = true;
  return m;
}

function buildShoes(item: ClothingItem): THREE.Group {
  const g = new THREE.Group();
  const c = colorFromItem(item);
  const M = mkMat(c, 0.7);
  const S = mkMat(darken(c, 0.45), 0.95);
  const laceM = mkMat(new THREE.Color('#f0f0f0'), 0.5);
  const heelM = mkMat(darken(c, 0.25), 0.9);
  [-1, 1].forEach((side) => {
    const x = side * 0.17;
    // Sole (slightly wider/longer than upper)
    g.add(mesh(new THREE.BoxGeometry(0.24, 0.07, 0.48), S, x, -1.73, 0.09));
    // Midsole stripe
    g.add(mesh(new THREE.BoxGeometry(0.24, 0.04, 0.48), mkMat(new THREE.Color('#ffffff'), 0.6), x, -1.695, 0.09));
    // Upper body
    g.add(mesh(new THREE.BoxGeometry(0.20, 0.16, 0.36), M, x, -1.60, 0.08));
    // Toe cap (rounded)
    g.add(mesh(new THREE.SphereGeometry(0.108, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), M, x, -1.605, 0.255));
    // Heel counter
    g.add(mesh(new THREE.BoxGeometry(0.20, 0.15, 0.10), heelM, x, -1.60, -0.14));
    // Tongue
    g.add(mesh(new THREE.BoxGeometry(0.13, 0.20, 0.03), mkMat(darken(c, 0.12), 0.8), x, -1.565, 0.21));
    // Laces
    for (let i = 0; i < 4; i++) g.add(mesh(new THREE.BoxGeometry(0.15, 0.012, 0.022), laceM, x, -1.545, 0.04 + i * 0.06));
    // Collar (ankle opening)
    g.add(mesh(new THREE.TorusGeometry(0.095, 0.024, 8, 20, Math.PI), M, x, -1.48, -0.01, 0, 0, Math.PI));
  });
  return g;
}

function buildPants(item: ClothingItem): THREE.Group {
  const g = new THREE.Group();
  const c = colorFromItem(item);
  const M  = mkMat(c, 0.85);
  const MD = mkMat(darken(c, 0.14), 0.9);
  const WB = mkMat(darken(c, 0.22), 0.78);
  const BL = mkMat(new THREE.Color('#111'), 0.4, 0.4); // belt loops
  // Waistband
  g.add(mesh(new THREE.CylinderGeometry(0.36, 0.35, 0.13, 32), WB, 0, 0.265, 0));
  // Belt loops
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.1;
    g.add(mesh(new THREE.BoxGeometry(0.025, 0.09, 0.018), BL, Math.sin(a)*0.36, 0.26, Math.cos(a)*0.36));
  }
  // Seat/hips
  g.add(mesh(new THREE.CylinderGeometry(0.35, 0.31, 0.32, 32), M, 0, 0.08, 0));
  // Crotch bridge
  g.add(mesh(new THREE.SphereGeometry(0.17, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), MD, 0, -0.08, 0));
  // Legs
  [-0.17, 0.17].forEach(x => {
    g.add(mesh(new THREE.CylinderGeometry(0.182, 0.155, 0.82, 22), M, x, -0.52, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.145, 0.118, 0.78, 22), M, x, -1.24, 0));
    // Front crease
    g.add(mesh(new THREE.BoxGeometry(0.014, 0.82, 0.014), MD, x, -0.52, 0.150));
    g.add(mesh(new THREE.BoxGeometry(0.014, 0.78, 0.014), MD, x, -1.24, 0.138));
    // Side seam (darker strip)
    g.add(mesh(new THREE.BoxGeometry(0.012, 1.60, 0.012), mkMat(darken(c, 0.08), 0.9), x + (x < 0 ? -0.17 : 0.17), -0.88, 0));
    // Hem/cuff at ankle
    g.add(mesh(new THREE.CylinderGeometry(0.118, 0.116, 0.04, 22), WB, x, -1.64, 0));
  });
  // Front fly area
  g.add(mesh(new THREE.BoxGeometry(0.06, 0.18, 0.02), MD, 0, 0.08, 0.31));
  return g;
}

function buildTshirt(item: ClothingItem): THREE.Group {
  const g = new THREE.Group();
  const c = colorFromItem(item);
  const M  = mkMat(c, 0.85);
  const MD = mkMat(darken(c, 0.12), 0.9);
  const SE = mkMat(darken(c, 0.07), 0.87); // subtle seam color

  // Main body — slightly tapered
  g.add(mesh(new THREE.CylinderGeometry(0.385, 0.325, 1.06, 32), M, 0, 0.745, 0));
  // Hem band at bottom
  g.add(mesh(new THREE.CylinderGeometry(0.326, 0.326, 0.035, 32), MD, 0, 0.215, 0));
  // Shoulder seam line (left/right)
  [-1, 1].forEach(s => {
    const sx = s * 0.38;
    // Sleeve — angled outward
    g.add(mesh(new THREE.CylinderGeometry(0.118, 0.102, 0.38, 18), MD, s * 0.545, 0.975, 0, 0, s * Math.PI / 5));
    // Sleeve hem band
    g.add(mesh(new THREE.CylinderGeometry(0.100, 0.100, 0.032, 18), SE, s * 0.65, 0.81, 0, 0, s * Math.PI / 5));
    // Shoulder seam strip
    g.add(mesh(new THREE.BoxGeometry(0.018, 0.38, 0.018), SE, sx, 1.07, 0));
  });
  // Ribbed collar / crew neck
  g.add(mesh(new THREE.TorusGeometry(0.148, 0.040, 12, 32), MD, 0, 1.27, 0.04));
  // Side seams
  [-0.36, 0.36].forEach(x =>
    g.add(mesh(new THREE.BoxGeometry(0.016, 1.06, 0.016), SE, x, 0.745, 0))
  );
  return g;
}

function buildJacket(item: ClothingItem): THREE.Group {
  const g = new THREE.Group();
  const c = colorFromItem(item);
  const M   = mkMat(c, 0.72);
  const MD  = mkMat(darken(c, 0.18), 0.78);
  const LN  = mkMat(darken(c, 0.30), 0.65);
  const BT  = mkMat(new THREE.Color('#aaa'), 0.25, 0.7);
  const LIN = mkMat(darken(c, 0.38), 0.6); // lining / interior

  const isHoodie = item.tags.includes('hoodie') || item.tags.some(t => t.includes('sweat'));
  const isBomber = item.tags.includes('bomber');

  // Body
  g.add(mesh(new THREE.CylinderGeometry(0.455, 0.365, 1.14, 32), M, 0, 0.73, 0));
  // Bottom hem band
  g.add(mesh(new THREE.CylinderGeometry(0.366, 0.366, 0.055, 32), MD, 0, 0.16, 0));

  // Sleeves (longer, more realistic)
  [-1, 1].forEach(s => {
    const sx = s * 0.565, lx = s * 0.775;
    g.add(mesh(new THREE.CylinderGeometry(0.133, 0.122, 0.68, 18), MD, sx, 0.95, 0, 0, s * Math.PI / 7));
    g.add(mesh(new THREE.CylinderGeometry(0.118, 0.106, 0.60, 18), MD, lx, 0.40, 0, 0, s * Math.PI / 12));
    // Cuff
    g.add(mesh(new THREE.CylinderGeometry(0.107, 0.107, 0.055, 18), mkMat(darken(c, 0.25), 0.75), lx + s * 0.07, 0.09, 0, 0, s * Math.PI / 12));
    // Shoulder seam
    g.add(mesh(new THREE.BoxGeometry(0.022, 0.68, 0.022), LN, sx, 0.95, 0));
  });

  if (isHoodie) {
    // Hood
    g.add(mesh(new THREE.SphereGeometry(0.31, 24, 14, 0, Math.PI * 2, 0, Math.PI / 1.8), MD, 0, 1.52, -0.10));
    g.add(mesh(new THREE.TorusGeometry(0.20, 0.045, 10, 24, Math.PI), MD, 0, 1.40, 0.22, -0.3));
    // Kangaroo pocket
    g.add(mesh(new THREE.BoxGeometry(0.44, 0.18, 0.04), mkMat(darken(c, 0.1), 0.85), 0, 0.42, 0.43));
    // Center zipper strip
    g.add(mesh(new THREE.BoxGeometry(0.034, 1.00, 0.045), LN, 0, 0.72, 0.44));
  } else if (isBomber) {
    // Ribbed collar
    g.add(mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.14, 24), MD, 0, 1.36, 0));
    // Front zipper strip
    g.add(mesh(new THREE.BoxGeometry(0.034, 1.05, 0.045), LN, 0, 0.72, 0.44));
    // Chest pockets
    [-1, 1].forEach(s => g.add(mesh(new THREE.BoxGeometry(0.16, 0.11, 0.035), MD, s * 0.22, 0.82, 0.43)));
  } else {
    // Blazer/jacket lapels
    [-1, 1].forEach(s => {
      g.add(mesh(new THREE.BoxGeometry(0.14, 0.40, 0.045), LN, s * 0.14, 1.02, 0.41)); // lapel panel
      g.add(mesh(new THREE.BoxGeometry(0.08, 0.28, 0.035), LIN, s * 0.10, 0.78, 0.44)); // inner lining show
    });
    // Collar
    g.add(mesh(new THREE.BoxGeometry(0.32, 0.11, 0.06), MD, 0, 1.28, 0.37));
    // Buttons
    for (let i = 0; i < 3; i++)
      g.add(mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.036, 14), BT, 0, 0.96 - i * 0.22, 0.43));
    // Chest pocket
    g.add(mesh(new THREE.BoxGeometry(0.14, 0.04, 0.035), MD, -0.22, 1.00, 0.43));
    // Side pockets
    [-1, 1].forEach(s => g.add(mesh(new THREE.BoxGeometry(0.16, 0.05, 0.035), MD, s * 0.28, 0.48, 0.41)));
  }
  return g;
}

function buildHat(item: ClothingItem): THREE.Group {
  const g = new THREE.Group();
  const c = colorFromItem(item);
  const M  = mkMat(c, 0.8);
  const MD = mkMat(darken(c, 0.22), 0.85);
  const isBucket = item.tags.includes('bucket hat');
  const isBeanie  = item.tags.includes('beanie');
  const isTrucker = item.tags.includes('trucker');

  if (isBeanie) {
    // Dome
    g.add(mesh(new THREE.SphereGeometry(0.30, 28, 16, 0, Math.PI * 2, 0, Math.PI / 1.55), M, 0, 1.75, 0));
    // Folded rib cuff
    g.add(mesh(new THREE.CylinderGeometry(0.295, 0.295, 0.10, 28), MD, 0, 1.565, 0));
    // Ribbing lines
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      g.add(mesh(new THREE.BoxGeometry(0.012, 0.10, 0.012), mkMat(darken(c, 0.30), 0.9), Math.sin(a) * 0.295, 1.565, Math.cos(a) * 0.295));
    }
    // Pom-pom
    g.add(mesh(new THREE.SphereGeometry(0.072, 14, 14), mkMat(new THREE.Color('#fff'), 0.9), 0, 2.07, 0));
  } else if (isBucket) {
    // Crown
    g.add(mesh(new THREE.CylinderGeometry(0.265, 0.285, 0.28, 32), M, 0, 1.88, 0));
    g.add(mesh(new THREE.SphereGeometry(0.265, 32, 10, 0, Math.PI * 2, 0, Math.PI / 2), M, 0, 1.88, 0));
    // Brim (drooped)
    g.add(mesh(new THREE.CylinderGeometry(0.46, 0.50, 0.06, 32), MD, 0, 1.73, 0));
    // Seam around crown/brim join
    g.add(mesh(new THREE.TorusGeometry(0.285, 0.018, 8, 32), mkMat(darken(c, 0.28), 0.9), 0, 1.735, 0));
    // Side vents
    [-1, 1].forEach(s => g.add(mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.04, 10), MD, s * 0.24, 1.87, 0.20)));
  } else if (isTrucker) {
    // Foam front panel
    const foamM = mkMat(new THREE.Color('#f5f5f5'), 0.85);
    g.add(mesh(new THREE.CylinderGeometry(0.28, 0.30, 0.30, 32, 1, false, -Math.PI / 2, Math.PI), M, 0, 1.87, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.28, 0.30, 0.30, 32, 1, false, Math.PI / 2, Math.PI), foamM, 0, 1.87, 0));
    g.add(mesh(new THREE.SphereGeometry(0.29, 28, 10, -Math.PI / 2, Math.PI, 0, Math.PI / 2), foamM, 0, 1.87, 0));
    g.add(mesh(new THREE.SphereGeometry(0.29, 28, 10, Math.PI / 2, Math.PI, 0, Math.PI / 2), M, 0, 1.87, 0));
    // Mesh back (darker, lattice-like)
    g.add(mesh(new THREE.BoxGeometry(0.58, 0.28, 0.32), mkMat(darken(c, 0.1), 0.9, 0), 0, 1.87, -0.05));
    // Brim
    g.add(mesh(new THREE.BoxGeometry(0.62, 0.04, 0.26), MD, 0, 1.715, -0.22));
    g.add(mesh(new THREE.TorusGeometry(0.295, 0.025, 8, 32), MD, 0, 1.71, 0));
    // Snapback adjuster
    g.add(mesh(new THREE.BoxGeometry(0.28, 0.06, 0.025), mkMat(new THREE.Color('#1a1a1a'), 0.7), 0, 1.81, -0.30));
    // Button top
    g.add(mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.038, 12), MD, 0, 2.04, 0));
  } else {
    // Snapback / fitted cap
    g.add(mesh(new THREE.CylinderGeometry(0.275, 0.295, 0.28, 32), M, 0, 1.87, 0));
    g.add(mesh(new THREE.SphereGeometry(0.275, 32, 10, 0, Math.PI * 2, 0, Math.PI / 2), M, 0, 1.87, 0));
    // Structured brim
    g.add(mesh(new THREE.BoxGeometry(0.64, 0.042, 0.26), MD, 0, 1.715, -0.215));
    // Brim underside slight curve approximation
    g.add(mesh(new THREE.BoxGeometry(0.62, 0.018, 0.24), mkMat(darken(c, 0.1), 0.85), 0, 1.695, -0.205));
    // Sweatband
    g.add(mesh(new THREE.TorusGeometry(0.290, 0.030, 10, 32), MD, 0, 1.71, 0));
    // Embroidery/logo area (front panel indicator)
    g.add(mesh(new THREE.BoxGeometry(0.20, 0.16, 0.02), mkMat(darken(c, 0.05), 0.82), 0, 1.90, 0.293));
    // Eyelets
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      g.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.02, 8), mkMat(new THREE.Color('#c0c0c0'), 0.4, 0.7), Math.sin(a) * 0.278, 1.96, Math.cos(a) * 0.278));
    }
    // Button top
    g.add(mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.038, 12), MD, 0, 2.03, 0));
  }
  return g;
}

function buildAccessory(item: ClothingItem): THREE.Group {
  const g = new THREE.Group();
  const c = colorFromItem(item);
  const M  = mkMat(c, 0.3, 0.7);
  const isSunglasses = item.tags.includes('sunglasses');
  const isWatch = item.tags.includes('watch');
  const isChain = item.tags.some(t => t.includes('chain') || t.includes('necklace'));
  const isRing  = item.tags.includes('ring');
  const isBracelet = item.tags.includes('bracelet');

  if (isSunglasses) {
    const lensM = new THREE.MeshStandardMaterial({ color: 0x0a0a22, roughness: 0.08, metalness: 0.85, transparent: true, opacity: 0.80 });
    const frameM = mkMat(c, 0.25, 0.75);
    // Lenses
    g.add(mesh(new THREE.CylinderGeometry(0.098, 0.098, 0.022, 32), lensM, -0.155, 1.678, 0.282, Math.PI / 2));
    g.add(mesh(new THREE.CylinderGeometry(0.098, 0.098, 0.022, 32), lensM,  0.155, 1.678, 0.282, Math.PI / 2));
    // Lens rim
    g.add(mesh(new THREE.TorusGeometry(0.098, 0.012, 10, 32), frameM, -0.155, 1.678, 0.282, Math.PI / 2));
    g.add(mesh(new THREE.TorusGeometry(0.098, 0.012, 10, 32), frameM,  0.155, 1.678, 0.282, Math.PI / 2));
    // Bridge
    g.add(mesh(new THREE.BoxGeometry(0.065, 0.018, 0.018), frameM, 0, 1.678, 0.282));
    // Temples (arms going to ears)
    g.add(mesh(new THREE.BoxGeometry(0.24, 0.014, 0.014), frameM, -0.265, 1.678, 0.175, 0, 0, 0.32));
    g.add(mesh(new THREE.BoxGeometry(0.24, 0.014, 0.014), frameM,  0.265, 1.678, 0.175, 0, 0, -0.32));
  } else if (isWatch) {
    const faceM = mkMat(new THREE.Color('#0a0a0a'), 0.15, 0.95);
    const bandM = mkMat(darken(c, 0.1), 0.7);
    // Case
    g.add(mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.032, 32), faceM, -0.795, 0.17, 0, Math.PI / 2));
    // Bezel
    g.add(mesh(new THREE.TorusGeometry(0.075, 0.014, 10, 32), M, -0.795, 0.17, 0, Math.PI / 2));
    // Watch band top/bottom
    g.add(mesh(new THREE.BoxGeometry(0.048, 0.072, 0.020), bandM, -0.795, 0.26, 0));
    g.add(mesh(new THREE.BoxGeometry(0.048, 0.072, 0.020), bandM, -0.795, 0.08, 0));
    // Crown (winding button)
    g.add(mesh(new THREE.CylinderGeometry(0.010, 0.010, 0.030, 10), M, -0.730, 0.17, 0, 0, 0, Math.PI / 2));
    // Hour and minute hands (decorative)
    g.add(mesh(new THREE.BoxGeometry(0.004, 0.040, 0.005), mkMat(new THREE.Color('#fff'), 0.3), -0.795, 0.17, 0, Math.PI / 2, 0, 0.8));
    g.add(mesh(new THREE.BoxGeometry(0.003, 0.055, 0.005), mkMat(new THREE.Color('#fff'), 0.3), -0.795, 0.17, 0, Math.PI / 2, 0, 2.5));
  } else if (isRing) {
    // Ring on right index finger
    g.add(mesh(new THREE.TorusGeometry(0.025, 0.010, 10, 24), M, 0.79, 0.16, 0));
    // Optional gem
    g.add(mesh(new THREE.OctahedronGeometry(0.016, 0), mkMat(new THREE.Color('#88ccff'), 0.1, 0.9), 0.79, 0.185, 0.026));
  } else if (isBracelet) {
    g.add(mesh(new THREE.TorusGeometry(0.068, 0.016, 12, 32), M, -0.795, 0.17, 0, Math.PI / 2));
  } else if (isChain) {
    // Layered chain necklace
    const chainM = mkMat(c, 0.2, 0.9);
    g.add(mesh(new THREE.TorusGeometry(0.188, 0.013, 10, 40), chainM, 0, 1.26, 0.09, 0.38));
    g.add(mesh(new THREE.TorusGeometry(0.165, 0.010, 10, 40), chainM, 0, 1.18, 0.09, 0.42));
    // Pendant
    g.add(mesh(new THREE.OctahedronGeometry(0.022, 0), mkMat(new THREE.Color('#ffd700'), 0.1, 1.0), 0, 1.06, 0.22));
  } else {
    // Generic necklace
    g.add(mesh(new THREE.TorusGeometry(0.182, 0.014, 10, 40), M, 0, 1.27, 0.10, 0.40));
  }
  return g;
}

const BUILDERS: Record<Category,(item:ClothingItem)=>THREE.Group> = {
  shoes: buildShoes, pants: buildPants, tshirt: buildTshirt,
  jacket: buildJacket, hat: buildHat, accessory: buildAccessory,
};

// ── Component ─────────────────────────────────────────────────────────────
export default function MannequinViewer({ outfit }: Props) {
  const mountRef   = useRef<HTMLDivElement>(null);
  const rendererRef= useRef<THREE.WebGLRenderer|null>(null);
  const cgRef      = useRef<THREE.Group|null>(null);
  const rafRef     = useRef<number>(0);
  const isDragging = useRef(false);
  const prev       = useRef({x:0,y:0});
  const rotY       = useRef(0);
  const rotX       = useRef(0);
  const rootRef    = useRef<THREE.Group|null>(null);
  const [hint, setHint] = useState(true);

  useEffect(()=>{
    const el = mountRef.current; if(!el) return;

    // Build scene immediately, but defer renderer sizing until the container has real dimensions
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a18);
    scene.fog = new THREE.FogExp2(0x0a0a18, 0.06);

    scene.add(new THREE.AmbientLight(0xffffff,0.5));
    const key = new THREE.DirectionalLight(0xfff4e0,1.5); key.position.set(3,6,5); key.castShadow=true; key.shadow.mapSize.set(1024,1024); scene.add(key);
    const fill= new THREE.DirectionalLight(0xaabbff,0.5); fill.position.set(-4,2,-3); scene.add(fill);
    scene.add(Object.assign(new THREE.DirectionalLight(0xffffff,0.3),{position:new THREE.Vector3(0,4,-6)}));

    const floor = new THREE.Mesh(new THREE.CircleGeometry(4,48), new THREE.MeshStandardMaterial({color:0x111120,roughness:0.9}));
    floor.rotation.x=-Math.PI/2; floor.position.y=-2.15; floor.receiveShadow=true; scene.add(floor);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.1,0.04,10,60), new THREE.MeshBasicMaterial({color:0x3a2a6a,transparent:true,opacity:0.55}));
    ring.rotation.x=-Math.PI/2; ring.position.y=-2.13; scene.add(ring);

    const root = new THREE.Group(); scene.add(root); rootRef.current=root;
    root.add(buildMannequin());
    const cg = new THREE.Group(); root.add(cg); cgRef.current=cg;

    const camera = new THREE.PerspectiveCamera(42,1,0.1,50);
    camera.position.set(0,0.35,4.2);

    const renderer = new THREE.WebGLRenderer({antialias:true});
    renderer.setPixelRatio(devicePixelRatio);
    renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    let sized = false;
    const applySize = () => {
      const w = el.clientWidth || el.offsetWidth;
      const h = el.clientHeight || el.offsetHeight;
      if (w > 0 && h > 0) {
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        sized = true;
      }
    };

    el.appendChild(renderer.domElement);
    applySize();

    const animate=()=>{
      rafRef.current=requestAnimationFrame(animate);
      if (!sized) applySize(); // keep trying until we have real dimensions
      if(!isDragging.current) rotY.current+=0.004;
      root.rotation.y=rotY.current; root.rotation.x=rotX.current;
      renderer.render(scene,camera);
    };
    animate();

    const dn=(e:MouseEvent|TouchEvent)=>{ isDragging.current=true; setHint(false); const p='touches'in e?e.touches[0]:e; prev.current={x:p.clientX,y:p.clientY}; };
    const mv=(e:MouseEvent|TouchEvent)=>{ if(!isDragging.current)return; const p='touches'in e?e.touches[0]:e; rotY.current+=(p.clientX-prev.current.x)*0.013; rotX.current=Math.max(-0.55,Math.min(0.55,rotX.current+(p.clientY-prev.current.y)*0.009)); prev.current={x:p.clientX,y:p.clientY}; };
    const up=()=>{ isDragging.current=false; };
    el.addEventListener('mousedown',dn); window.addEventListener('mousemove',mv); window.addEventListener('mouseup',up);
    el.addEventListener('touchstart',dn,{passive:true}); window.addEventListener('touchmove',mv,{passive:true}); window.addEventListener('touchend',up);
    const onResize=()=>{ applySize(); };
    window.addEventListener('resize',onResize);

    // Also observe the container itself resizing (tab switch, layout change)
    const ro = new ResizeObserver(()=>{ applySize(); });
    ro.observe(el);

    return ()=>{
      cancelAnimationFrame(rafRef.current); ro.disconnect(); renderer.dispose();
      if(el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
      el.removeEventListener('mousedown',dn); window.removeEventListener('mousemove',mv); window.removeEventListener('mouseup',up);
      el.removeEventListener('touchstart',dn); window.removeEventListener('touchmove',mv); window.removeEventListener('touchend',up);
      window.removeEventListener('resize',onResize);
    };
  },[]);

  useEffect(()=>{
    const cg=cgRef.current; if(!cg) return;
    while(cg.children.length){ const c=cg.children[0]; cg.remove(c); c.traverse(o=>{ if(o instanceof THREE.Mesh){ o.geometry.dispose(); (Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose()); } }); }
    categories.forEach(cat=>{ const item=outfit[cat]; if(item){ const grp=BUILDERS[cat](item); grp.name=`clothing-${cat}`; cg.add(grp); } });
  },[outfit]);

  const outfitItems = categories.map(c=>outfit[c]).filter(Boolean) as ClothingItem[];
  const snap=(y:number)=>{ rotY.current=y; rotX.current=0; };

  return (
    <div className="mannequin-wrapper">
      <div className="mannequin-canvas" ref={mountRef}/>
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
