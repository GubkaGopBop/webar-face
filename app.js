const $ = (id) => document.getElementById(id);
const status = (message) => { $('status').textContent = message; $('status').hidden = !message; };
let mindar, renderer, scene, camera, anchor, eyePatch;
let running = false, busy = false, lastVisible;

function stop() {
  if (busy || !running) return;
  renderer.setAnimationLoop(null);
  mindar.stop();
  anchor.group.visible = false;
  mindar.faceMeshes.forEach((mesh) => { mesh.visible = false; });
  renderer.clear();
  running = false;
  $('start').disabled = false;
  $('start').textContent = 'Включить камеру';
  status('Камера выключена. Можно включить её снова.');
}

async function start() {
  if (running || busy) return;
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
    status('Откройте сайт по защищённой ссылке HTTPS, чтобы включить камеру.');
    return;
  }
  busy = true;
  $('start').disabled = true;
  $('start').textContent = 'Запускаем…';
  status('Разрешите доступ к камере, если браузер спросит.');
  anchor.group.visible = false;
  try {
    await mindar.start();
    running = true;
    lastVisible = undefined;
    $('start').textContent = 'Выключить камеру';
    renderer.setAnimationLoop(() => {
      if (anchor.group.visible !== lastVisible) {
        lastVisible = anchor.group.visible;
        status(lastVisible ? '' : 'Посмотрите в камеру, чтобы появилась повязка.');
      }
      if (anchor.group.visible) {
        const estimate = mindar.getLatestEstimate();
        eyePatch.update(estimate?.metricLandmarks, estimate?.faceScale);
      }
      renderer.render(scene, camera);
    });
  } catch (error) {
    // Освобождаем поток и при частично завершившемся запуске.
    mindar.controller.stopProcessVideo();
    mindar.video?.srcObject?.getTracks().forEach((track) => track.stop());
    mindar.video?.remove();
    status('Камера недоступна. Разрешите доступ к ней и попробуйте снова.');
    console.error('MindAR start failed', error);
  } finally {
    busy = false;
    $('start').disabled = false;
    if (!running) $('start').textContent = 'Включить камеру';
    if (document.hidden) stop();
  }
}

async function init() {
  try {
    const [{ MindARThree }, THREE, { createEyePatch }] = await Promise.all([
      import('mindar-face-three'), import('three'), import('./eyepatch.js')
    ]);
    mindar = new MindARThree({
      container: $('camera'), uiLoading: 'no', uiScanning: 'no', uiError: 'no',
      // One Euro Filter сглаживает ключевые точки, матрицу лица и масштаб.
      filterMinCF: 0.001, filterBeta: 1
    });
    ({ renderer, scene, camera } = mindar);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    scene.add(new THREE.HemisphereLight(0xffffff, 0x708090, 1.5));
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(1, 2, 3);
    scene.add(light);
    anchor = mindar.addAnchor(168);
    anchor.group.visible = false;
    eyePatch = createEyePatch();
    anchor.group.add(eyePatch.group);
    // Окклюдер скрывает ремешок, оказавшийся за лицом при поворотах.
    const occluder = mindar.addFaceMesh();
    occluder.material = new THREE.MeshBasicMaterial({ colorWrite: false });
    occluder.renderOrder = -1;
    scene.add(occluder);
    // Посадка задана относительно переносицы (якорь 168).
    eyePatch.group.scale.setScalar(1);
    eyePatch.group.position.set(0, 0, 0);
    $('start').textContent = 'Включить камеру';
    $('start').disabled = false;
    $('start').addEventListener('click', () => { if (running) stop(); else start(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
    window.addEventListener('pagehide', stop);
  } catch (error) {
    status('Не удалось загрузить эффект. Проверьте интернет и обновите страницу.');
    $('start').textContent = 'Загрузка не удалась';
    console.error('WebAR initialization failed', error);
  }
}
init();
