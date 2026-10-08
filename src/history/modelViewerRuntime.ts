import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { assetUrl } from "./assets";
import { historyModels, type HistoryModelKind } from "./models";
import { createGaussianSplat } from "./gaussianSplat";

function disposeModel(model: THREE.Object3D) {
  const textures = new Set<THREE.Texture>();
  const materials = new Set<THREE.Material>();
  model.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.dispose();
    (Array.isArray(object.material) ? object.material : [object.material]).forEach(material => materials.add(material));
  });
  materials.forEach(material => {
    Object.values(material).forEach(value => { if (value instanceof THREE.Texture) textures.add(value); });
    material.dispose();
  });
  textures.forEach(texture => {
    if (typeof ImageBitmap !== "undefined" && texture.image instanceof ImageBitmap) texture.image.close();
    texture.dispose();
  });
}

type ModelCallbacks = { onReady(): void; onError(): void };
type PreparedModel = { scene: THREE.Scene; model: THREE.Group; size: THREE.Vector3; key: THREE.DirectionalLight };
type ModelSlot = { state: "loading" | "ready" | "error"; prepared?: PreparedModel };

function frameCamera(camera: THREE.PerspectiveCamera, size: THREE.Vector3, kind: HistoryModelKind) {
  const halfFov = THREE.MathUtils.degToRad(camera.fov / 2);
  const { padding, viewX, viewY } = historyModels[kind];
  const distance = (Math.max(size.y / (2 * Math.tan(halfFov)), size.x / (2 * Math.tan(halfFov) * camera.aspect)) + size.z / 2) * padding;
  camera.position.set(viewX, viewY, 1).normalize().multiplyScalar(distance);
  camera.lookAt(0, 0, 0);
  return distance;
}

function prepareModel(model: THREE.Group, kind: HistoryModelKind, environment: THREE.Texture): PreparedModel {
  const bounds = new THREE.Box3().setFromObject(model);
  const size = bounds.getSize(new THREE.Vector3());
  const scale = 2 / Math.max(size.x, size.y, size.z);
  model.position.copy(bounds.getCenter(new THREE.Vector3())).multiplyScalar(-scale);
  model.scale.setScalar(scale);
  size.multiplyScalar(scale);
  model.traverse(object => { if (object instanceof THREE.Mesh && kind !== "nano") { object.castShadow = true; object.receiveShadow = true; } });
  const scene = new THREE.Scene();
  scene.environment = environment;
  scene.environmentIntensity = historyModels[kind].environmentIntensity;
  scene.add(model, new THREE.HemisphereLight(0xffffff, 0x57504a, 1.1));
  const key = new THREE.DirectionalLight(0xfff0df, 3);
  key.position.set(-3, 5, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -2, right: 2, top: 2, bottom: -2, near: .1, far: 15 });
  key.shadow.bias = -.0002;
  key.shadow.normalBias = .006;
  const fill = new THREE.DirectionalLight(0xdce6ff, .9);
  fill.position.set(4, 2, 2);
  const rim = new THREE.DirectionalLight(0xffffff, 1.5);
  rim.position.set(1, 4, -3);
  scene.add(key, fill, rim);
  return { scene, model, size, key };
}

/** One timeline owns one GPU context. Models are fetched, decoded and rendered
 * offscreen ahead of selection; changing years only attaches the prepared scene. */
export function createTimelineModelViewer(assetBase: string) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  const canvas = renderer.domElement;
  canvas.setAttribute("aria-hidden", "true");
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const camera = new THREE.PerspectiveCamera(35, 1, .01, 100);
  const controls = new OrbitControls(camera, canvas);
  const preferences = window.matchMedia("(prefers-reduced-motion: reduce)");
  const narrow = window.matchMedia("(max-width: 899px)");
  const touchControls = () => {
    // One finger belongs to the reading journey on phones. Two fingers retain
    // model rotation and pinch zoom, without displaying a control toolbar.
    controls.touches.ONE = narrow.matches ? null : THREE.TOUCH.ROTATE;
    controls.touches.TWO = narrow.matches ? THREE.TOUCH.DOLLY_ROTATE : THREE.TOUCH.DOLLY_PAN;
  };
  touchControls();
  narrow.addEventListener("change", touchControls);
  controls.enabled = false;
  controls.enableDamping = !preferences.matches;
  controls.dampingFactor = .1;
  controls.rotateSpeed = .7;
  controls.zoomSpeed = .75;
  controls.panSpeed = .65;
  controls.autoRotateSpeed = .6; // One gentle revolution in 100 seconds.
  controls.minPolarAngle = .04;
  controls.maxPolarAngle = Math.PI - .04;
  controls.maxTargetRadius = 1.5;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, .04);
  room.dispose();
  pmrem.dispose();
  const warmTarget = new THREE.WebGLRenderTarget(32, 32);
  const controller = new AbortController();
  const draco = new DRACOLoader().setDecoderPath(`${assetUrl(assetBase, "/models/draco")}/`).setWorkerLimit(2);
  const loader = new GLTFLoader().setDRACOLoader(draco);
  const slots = new Map<HistoryModelKind, ModelSlot>();
  let disposed = false, contextFailed = false, visible = false, frame = 0, lastRenderTime = 0;
  let active: { host: HTMLDivElement; kind: HistoryModelKind; callbacks: ModelCallbacks; userControlled: boolean; detach(): void } | null = null;
  const activeModel = () => active && slots.get(active.kind)?.state === "ready" ? slots.get(active.kind)!.prepared : undefined;
  const requestRender = () => { if (!disposed && !contextFailed && visible && !frame) frame = requestAnimationFrame(render); };
  const stopRender = () => { cancelAnimationFrame(frame); frame = 0; lastRenderTime = 0; };
  const render = (time: number) => {
    frame = 0;
    const prepared = activeModel();
    if (disposed || contextFailed || !visible || !prepared) return;
    const delta = lastRenderTime ? Math.min((time - lastRenderTime) / 1000, .05) : 0;
    lastRenderTime = time;
    const moving = controls.update(delta);
    renderer.render(prepared.scene, camera);
    if (controls.autoRotate || moving && controls.enableDamping) requestRender();
  };
  const updateRotation = () => {
    controls.autoRotate = !!active && controls.enabled && !preferences.matches && !active.userControlled;
    if (active) active.host.dataset.autoRotate = String(controls.autoRotate);
    lastRenderTime = 0;
  };
  const takeControl = () => {
    if (!active || !historyModels[active.kind].interactive) return;
    active.userControlled = true;
    updateRotation();
  };
  const resize = () => {
    if (!active) return;
    const width = active.host.clientWidth, height = active.host.clientHeight;
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    requestRender();
  };
  const updateVisibility = () => {
    const rect = active?.host.getBoundingClientRect();
    visible = !!rect && !document.hidden && rect.bottom > 0 && rect.top < window.innerHeight;
    controls.enabled = visible && !!activeModel() && !contextFailed && !!active && historyModels[active.kind].interactive;
    updateRotation();
    if (visible) requestRender();
    else stopRender();
  };
  const observer = new ResizeObserver(resize);
  const visibility = new IntersectionObserver(updateVisibility);
  const motionPreference = () => { controls.enableDamping = !preferences.matches; updateRotation(); requestRender(); };
  const focus = (event: PointerEvent) => {
    if (event.pointerType === "touch" && narrow.matches) return;
    active?.host.focus({ preventScroll: true });
  };
  const reset = () => {
    takeControl();
    controls.enableDamping = false;
    controls.update();
    controls.reset();
    controls.enableDamping = !preferences.matches;
    requestRender();
  };
  const keyboard = (event: KeyboardEvent) => {
    if (!controls.enabled || event.ctrlKey || event.metaKey || event.altKey) return;
    const arrows = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"];
    if (![...arrows, "+", "=", "-", "Home", "r", "R"].includes(event.key)) return;
    takeControl();
    if (arrows.includes(event.key)) {
      const horizontal = event.key === "ArrowLeft" ? 1 : event.key === "ArrowRight" ? -1 : 0;
      const vertical = event.key === "ArrowUp" ? 1 : event.key === "ArrowDown" ? -1 : 0;
      if (event.shiftKey) controls.pan(horizontal * 20, vertical * 20);
      else { controls.rotateLeft(horizontal * .12); controls.rotateUp(vertical * .12); }
    } else if (["+", "="].includes(event.key)) controls.dollyIn(.88);
    else if (event.key === "-") controls.dollyOut(.88);
    else if (event.key === "Home" || event.key.toLowerCase() === "r") reset();
    else return;
    event.preventDefault();
    event.stopPropagation();
    controls.update();
    requestRender();
  };
  const showActive = () => {
    if (!active || disposed) return;
    const slot = slots.get(active.kind)!;
    if (contextFailed || slot.state === "error") { controls.enabled = false; updateRotation(); active.callbacks.onError(); return; }
    if (slot.state !== "ready" || !slot.prepared) return;
    resize();
    // Flush old damping before framing another model on the shared camera.
    controls.autoRotate = false;
    controls.enableDamping = false;
    controls.update();
    const distance = frameCamera(camera, slot.prepared.size, active.kind);
    controls.target.set(0, 0, 0);
    controls.minDistance = distance * .35;
    controls.maxDistance = distance * 2.5;
    controls.update();
    controls.saveState();
    controls.enableDamping = !preferences.matches;
    renderer.render(slot.prepared.scene, camera);
    active.callbacks.onReady();
    updateVisibility();
  };
  const contextLost = (event: Event) => {
    event.preventDefault();
    contextFailed = true;
    controls.enabled = false;
    updateRotation();
    stopRender();
    active?.callbacks.onError();
  };
  controls.addEventListener("change", requestRender);
  controls.addEventListener("start", takeControl);
  canvas.addEventListener("webglcontextlost", contextLost);
  preferences.addEventListener("change", motionPreference);
  document.addEventListener("visibilitychange", updateVisibility);

  const ready = Promise.all((Object.keys(historyModels) as HistoryModelKind[]).map(async kind => {
    const slot: ModelSlot = { state: "loading" };
    slots.set(kind, slot);
    try {
      const response = await fetch(assetUrl(assetBase, `/models/${historyModels[kind].file}`), { signal: controller.signal });
      if (!response.ok) throw new Error(`Model returned ${response.status}`);
      const bytes = await response.arrayBuffer();
      if (disposed) return false;
      const splat = historyModels[kind].file.endsWith(".splat") ? await createGaussianSplat(bytes, controller.signal) : undefined;
      const model = splat ? splat.model : (await loader.parseAsync(bytes, "")).scene;
      if (disposed) { disposeModel(model); return false; }
      const prepared = prepareModel(model, kind, environment.texture);
      if (splat) prepared.scene.onBeforeRender = splat.beforeRender;
      slot.prepared = prepared;
      const warmCamera = new THREE.PerspectiveCamera(35, kind === "building" ? 580 / 456 : 1, .01, 100);
      frameCamera(warmCamera, prepared.size, kind);
      // Compile the display shaders, then upload geometry/textures and draw shadows
      // offscreen. Preloading another model must never paint over the current year.
      await renderer.compileAsync(prepared.scene, warmCamera);
      if (disposed) return false;
      renderer.setRenderTarget(warmTarget);
      try { renderer.render(prepared.scene, warmCamera); }
      finally { renderer.setRenderTarget(null); }
      slot.state = "ready";
      if (active?.kind === kind) showActive();
      return true;
    } catch (error) {
      slot.state = "error";
      if (!disposed && !controller.signal.aborted) {
        console.warn("Aquinas 3D model could not be displayed", error);
        if (active?.kind === kind) showActive();
      }
      return false;
    }
  })).then(results => {
    // Decoder tasks cannot be cancelled midway. Let them settle before terminating
    // workers, including tasks that were awaiting the decoder when unmounted.
    draco.dispose();
    return results.every(Boolean);
  });

  return {
    ready,
    attach(host: HTMLDivElement, kind: HistoryModelKind, callbacks: ModelCallbacks) {
      if (disposed) return () => {};
      active?.detach();
      const binding = { host, kind, callbacks, userControlled: false, detach: () => {
        if (active !== binding) return;
        observer.disconnect();
        visibility.disconnect();
        host.removeEventListener("pointerdown", focus);
        host.removeEventListener("focus", takeControl);
        host.removeEventListener("keydown", keyboard);
        host.removeEventListener("dblclick", reset);
        active = null;
        visible = false;
        controls.enabled = false;
        controls.autoRotate = false;
        delete host.dataset.autoRotate;
        stopRender();
        canvas.remove();
      } };
      active = binding;
      host.append(canvas);
      if (historyModels[kind].interactive) {
        host.addEventListener("pointerdown", focus);
        host.addEventListener("focus", takeControl);
        host.addEventListener("keydown", keyboard);
        host.addEventListener("dblclick", reset);
      }
      observer.observe(host);
      visibility.observe(host);
      showActive();
      return binding.detach;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      active?.detach();
      controller.abort();
      stopRender();
      observer.disconnect();
      visibility.disconnect();
      canvas.removeEventListener("webglcontextlost", contextLost);
      preferences.removeEventListener("change", motionPreference);
      narrow.removeEventListener("change", touchControls);
      document.removeEventListener("visibilitychange", updateVisibility);
      controls.removeEventListener("change", requestRender);
      controls.removeEventListener("start", takeControl);
      controls.dispose();
      slots.forEach(slot => {
        if (!slot.prepared) return;
        disposeModel(slot.prepared.model);
        slot.prepared.key.shadow.dispose();
      });
      environment.dispose();
      warmTarget.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}

export type TimelineModelViewer = ReturnType<typeof createTimelineModelViewer>;
