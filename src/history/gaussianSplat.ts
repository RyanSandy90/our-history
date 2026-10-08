import * as THREE from "three";
import { splatFragmentShader, splatVertexShader } from "./gaussianSplatShaders";

/** Standard 32-byte .splat records: XYZ, scale XYZ, RGBA, quaternion WXYZ.
 * This asset is sampled from a photo-conditioned reconstruction, not a scan. */
export async function createGaussianSplat(bytes: ArrayBuffer, signal?: AbortSignal): Promise<{ model: THREE.Group; beforeRender: THREE.Scene["onBeforeRender"] }> {
  signal?.throwIfAborted();
  const count = bytes.byteLength / 32;
  if (!Number.isInteger(count) || count < 1 || count > 1_000_000) throw new Error("Invalid splat asset size");
  const view = new DataView(bytes);
  const data = new Float32Array(2048 * Math.ceil(count * 4 / 2048) * 4);
  const centers = new Float32Array(count * 3);
  const bounds = new THREE.Box3();
  const position = new THREE.Vector3(), scale = new THREE.Vector3(), quaternion = new THREE.Quaternion();
  const transform = new THREE.Matrix4(), covariance = new THREE.Matrix3(), rotation = new THREE.Matrix3();
  let sliceStart = performance.now();
  for (let i = 0; i < count; i++) {
    // The statue has hundreds of thousands of splats. Yield small preparation
    // slices so preloading cannot monopolise the introduction's scroll/reveal.
    if (i % 1024 === 0 && performance.now() - sliceStart >= 4) {
      await new Promise<void>(resolve => window.setTimeout(resolve, 0));
      signal?.throwIfAborted();
      sliceStart = performance.now();
    }
    const offset = i * 32, target = i * 16;
    position.set(view.getFloat32(offset, true), view.getFloat32(offset + 4, true), view.getFloat32(offset + 8, true));
    scale.set(view.getFloat32(offset + 12, true), view.getFloat32(offset + 16, true), view.getFloat32(offset + 20, true));
    if (![...position, ...scale].every(Number.isFinite) || Math.min(...scale) <= 0) throw new Error("Invalid splat geometry");
    quaternion.set((view.getUint8(offset + 29) - 128) / 128, (view.getUint8(offset + 30) - 128) / 128,
      (view.getUint8(offset + 31) - 128) / 128, (view.getUint8(offset + 28) - 128) / 128).normalize();
    transform.compose(position, quaternion, scale);
    rotation.setFromMatrix4(transform);
    covariance.copy(rotation).multiply(rotation.clone().transpose());
    const c = covariance.elements;
    data.set([position.x, position.y, position.z, view.getUint8(offset + 27) / 255,
      c[0], c[1], c[2], c[4], c[5], c[8], view.getUint8(offset + 24) / 255,
      view.getUint8(offset + 25) / 255, view.getUint8(offset + 26) / 255, 0, 0, 0], target);
    position.toArray(centers, i * 3);
    bounds.expandByPoint(position);
  }
  const texture = new THREE.DataTexture(data, 2048, data.length / (2048 * 4), THREE.RGBAFormat, THREE.FloatType);
  texture.needsUpdate = true;
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute([-3, -3, 0, 3, -3, 0, 3, 3, 0, -3, 3, 0], 3));
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  geometry.instanceCount = count;
  geometry.boundingBox = bounds.clone().expandByScalar(.02);
  geometry.boundingSphere = geometry.boundingBox.getBoundingSphere(new THREE.Sphere());
  const order = new Float32Array(count);
  for (let i = 0; i < count; i++) order[i] = i;
  const indices = new THREE.InstancedBufferAttribute(order, 1).setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute("splatIndex", indices);
  const material = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms: { splatData: { value: texture }, viewport: { value: new THREE.Vector2() } },
    vertexShader: splatVertexShader, fragmentShader: splatFragmentShader,
    transparent: true, depthWrite: false, toneMapped: false,
  });
  // Explicit ownership lets the shared viewer dispose shader-uniform textures.
  material.addEventListener("dispose", () => texture.dispose());
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "Nano Nagle | photo-referenced Gaussian surface";
  mesh.frustumCulled = false;
  const depths = new Float32Array(count), bins = new Uint32Array(65536), buckets = new Uint16Array(count);
  const lastView = new THREE.Matrix4(), currentView = new THREE.Matrix4();
  let sorted = false;
  // Scene callbacks run before geometry uploads. Sorting in a mesh callback
  // would upload the new order one frame late during a drag or first reveal.
  const beforeRender: THREE.Scene["onBeforeRender"] = (renderer, _scene, camera) => {
    const target = renderer.getRenderTarget();
    if (target) material.uniforms.viewport.value.set(target.width, target.height);
    else renderer.getDrawingBufferSize(material.uniforms.viewport.value);
    currentView.multiplyMatrices(camera.matrixWorldInverse, mesh.matrixWorld);
    if (sorted && currentView.equals(lastView)) return;
    lastView.copy(currentView);
    sorted = true;
    const matrix = currentView.elements;
    let near = -Infinity, far = Infinity;
    for (let i = 0; i < count; i++) {
      const depth = centers[i * 3] * matrix[2] + centers[i * 3 + 1] * matrix[6] + centers[i * 3 + 2] * matrix[10];
      depths[i] = depth;
      near = Math.max(near, depth); far = Math.min(far, depth);
    }
    const factor = 65535 / Math.max(near - far, 1e-6);
    bins.fill(0);
    for (let i = 0; i < count; i++) {
      const bucket = Math.min(65535, Math.max(0, Math.floor((depths[i] - far) * factor)));
      buckets[i] = bucket; bins[bucket]++;
    }
    let start = 0;
    for (let i = 0; i < bins.length; i++) { const size = bins[i]; bins[i] = start; start += size; }
    for (let i = 0; i < count; i++) order[bins[buckets[i]]++] = i;
    indices.needsUpdate = true;
  };
  const group = new THREE.Group();
  group.add(mesh);
  return { model: group, beforeRender };
}
