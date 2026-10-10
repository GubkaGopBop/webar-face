import * as THREE from 'three';

// Лёгкая повязка: объёмная накладка на глаз и ремешок вокруг головы.
// Вся модель движется одной группой относительно якоря на переносице.
export function createEyePatch() {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: '#151515', roughness: 0.8, metalness: 0,
    side: THREE.DoubleSide
  });

  const outline = new THREE.Shape();
  outline.moveTo(-0.19, 0.10);
  outline.bezierCurveTo(-0.16, 0.19, 0.16, 0.19, 0.19, 0.10);
  outline.bezierCurveTo(0.23, -0.04, 0.11, -0.18, 0, -0.20);
  outline.bezierCurveTo(-0.11, -0.18, -0.23, -0.04, -0.19, 0.10);
  const pad = new THREE.Mesh(new THREE.ExtrudeGeometry(outline, {
    depth: 0.025, bevelEnabled: true, bevelSegments: 2,
    steps: 1, bevelSize: 0.012, bevelThickness: 0.012, curveSegments: 12
  }), material);
  pad.position.set(-0.255, 0.06, 0.13);
  group.add(pad);

  // Эллиптический ремешок. Его задняя часть скрывается окклюдером лица.
  const strap = new THREE.Mesh(new THREE.CylinderGeometry(
    0.58, 0.58, 0.035, 48, 1, true
  ), material);
  strap.scale.z = 0.84;
  strap.position.set(0, 0.11, -0.30);
  group.add(strap);
  return { group };
}
