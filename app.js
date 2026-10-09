const $ = (id) => document.getElementById(id);
const status = (message) => { $('status').textContent = message; };
let mindar, renderer, scene, camera, anchor, glasses;
let running = false, busy = false, lastVisible;

function applyFit() {
  if (!glasses) return;
  glasses.group.scale.setScalar(Number($('size').value));
  // Якорь 168 — переносица. Y поднимает оправу к глазам, Z выносит её вперёд.
  glasses.group.position.set(0, Number($('height').value), Number($('depth').value));
  glasses.frameMaterial.color.set($('color').value);
  for (const id of ['size', 'height', 'depth']) $(id + '-value').value = Number($(id).value).toFixed(2);
}

function stop() {
  if (busy || !running) return;
  renderer.setAnimationLoop(null);
  mindar.stop();
  anchor.group.visible = false;
  mindar.faceMeshes.forEach((mesh) => { mesh.visible = false; });
  renderer.clear();
  running = false;
  $('start').disabled = false;
  $('stop').disabled = true;
  status('Камера выключена. Нажмите «Включить камеру» для продолжения.');
}

async function start() {
  if (running || busy) return;
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
    status('Камера доступна через HTTPS или localhost. Откройте опубликованный сайт GitHub Pages.');
    return;
  }
  busy = true;
  $('start').disabled = true;
  status('Запускаем камеру и распознавание лица…');
  anchor.group.visible = false;
  try {
    await mindar.start();
    running = true;
    lastVisible = undefined;
    $('stop').disabled = false;
    renderer.setAnimationLoop(() => {
      if (anchor.group.visible !== lastVisible) {
        lastVisible = anchor.group.visible;
        status(lastVisible ? 'Лицо обнаружено — очки следуют за движениями головы.' : 'Посмотрите в камеру и поместите лицо целиком в кадр.');
      }
      renderer.render(scene, camera);
    });
  } catch (error) {
    // Освобождаем поток и при частично завершившемся запуске.
    mindar.controller.stopProcessVideo();
    mindar.video?.srcObject?.getTracks().forEach((track) => track.stop());
    mindar.video?.remove();
    status('Не удалось запустить камеру. Разрешите доступ, закройте приложения с камерой и повторите. Если загрузка зависает — проверьте интернет.');
    console.error('MindAR start failed', error);
  } finally {
    busy = false;
    $('start').disabled = running;
    if (document.hidden) stop();
  }
}

async function init() {
  try {
    const [{ MindARThree }, THREE, { createGlasses }] = await Promise.all([
      import('mindar-face-three'), import('three'), import('./glasses.js')
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
    glasses = createGlasses();
    anchor.group.add(glasses.group);
    // Окклюдер скрывает части дужек, оказавшиеся за лицом при поворотах.
    const occluder = mindar.addFaceMesh();
    occluder.material = new THREE.MeshBasicMaterial({ colorWrite: false });
    occluder.renderOrder = -1;
    scene.add(occluder);
    applyFit();
    $('start').textContent = 'Включить камеру';
    $('start').disabled = false;
    $('start').addEventListener('click', start);
    $('stop').addEventListener('click', stop);
    for (const id of ['size', 'height', 'depth', 'color']) $(id).addEventListener('input', applyFit);
    $('reset').addEventListener('click', () => {
      $('size').value = '1'; $('height').value = '0.06'; $('depth').value = '0.08'; $('color').value = '#43ddd0'; applyFit();
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
    window.addEventListener('pagehide', stop);
  } catch (error) {
    status('Не удалось загрузить библиотеки WebAR. Проверьте интернет, поддержку WebGL и обновите страницу.');
    $('start').textContent = 'Загрузка не удалась';
    console.error('WebAR initialization failed', error);
  }
}
init();
