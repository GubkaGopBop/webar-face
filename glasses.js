import * as THREE from 'three';

// Лёгкая симметричная модель: два ободка, линзы, мост и две дужки.
// Размеры заданы в нормализованной системе координат якоря MindAR.
export function createGlasses() {
  const group = new THREE.Group();
  const frameMaterial = new THREE.MeshStandardMaterial({ color: '#43ddd0', metalness: 0.35, roughness: 0.35 });
  const lensMaterial = new THREE.MeshStandardMaterial({ color: '#76b9dc', transparent: true, opacity: 0.24, roughness: 0.2, side: THREE.DoubleSide, depthWrite: false });
  const rimGeometry = new THREE.TorusGeometry(0.205, 0.018, 8, 40);
  const lensGeometry = new THREE.CircleGeometry(0.187, 40);
  for (const side of [-1, 1]) {
    const rim = new THREE.Mesh(rimGeometry, frameMaterial);
    rim.position.x = side * 0.255;
    rim.scale.y = 0.8;
    group.add(rim);
    const lens = new THREE.Mesh(lensGeometry, lensMaterial);
    lens.position.set(side * 0.255, 0, -0.005);
    lens.scale.y = 0.8;
    group.add(lens);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.028, 0.48), frameMaterial);
    arm.position.set(side * 0.46, 0, -0.24);
    group.add(arm);
  }
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.105, 0.025, 0.03), frameMaterial);
  bridge.position.y = 0.02;
  group.add(bridge);
  return { group, frameMaterial };
}
