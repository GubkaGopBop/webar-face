import * as THREE from 'three';

// Накладка и видимая часть ремешка подгоняются по ключевым точкам лица.
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
  group.add(pad);

  // Только видимая часть ремешка: Face Tracking не определяет затылок.
  // Полоса следует поверхности лица вместо кольца фиксированного размера.
  const path = [127, 34, 33, 159, 133, 168, 336, 296, 334, 293, 300, 264, 356];
  const vertices = new Float32Array(path.length * 2 * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  const indices = [];
  for (let i = 0; i < path.length - 1; i++) {
    const a = i * 2;
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  geometry.setIndex(indices);
  const strap = new THREE.Mesh(geometry, material);
  strap.frustumCulled = false;
  group.add(strap);

  function update(landmarks, faceScale) {
    if (!landmarks || !(faceScale > 0)) return;
    const origin = landmarks[168];
    const local = (index) => new THREE.Vector3(
      (landmarks[index][0] - origin[0]) / faceScale,
      (landmarks[index][1] - origin[1]) / faceScale,
      (landmarks[index][2] - origin[2]) / faceScale
    );
    const outer = local(33), inner = local(133);
    const width = outer.distanceTo(inner);
    const center = outer.clone().add(inner).multiplyScalar(0.5);
    // Накладка чуть шире глаза и вынесена перед его поверхностью.
    pad.scale.setScalar(width * 1.35 / 0.4);
    pad.position.copy(center);
    pad.position.z = Math.max(local(159).z, local(145).z, outer.z, inner.z) + 0.025;
    pad.rotation.z = Math.atan2(inner.y - outer.y, inner.x - outer.x);
    for (let i = 0; i < path.length; i++) {
      const point = local(path[i]);
      // Небольшой отступ наружу исключает совпадение с сеткой лица.
      point.x += Math.sign(point.x) * 0.008;
      point.z += 0.025;
      vertices.set([point.x, point.y - 0.011, point.z,
        point.x, point.y + 0.011, point.z], i * 6);
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
  }
  return { group, update };
}
