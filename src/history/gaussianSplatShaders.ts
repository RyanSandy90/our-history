// Project each oriented 3D Gaussian's covariance into a screen-space ellipse.
export const splatVertexShader = `
  attribute float splatIndex;
  uniform sampler2D splatData;
  uniform vec2 viewport;
  varying vec2 gaussianPosition;
  varying vec4 gaussianColor;
  vec4 readSplat(int offset) {
    return texelFetch(splatData, ivec2(offset % 2048, offset / 2048), 0);
  }
  void main() {
    int offset = int(splatIndex) * 4;
    vec4 center = readSplat(offset);
    vec4 a = readSplat(offset + 1);
    vec4 b = readSplat(offset + 2);
    vec4 c = readSplat(offset + 3);
    vec4 viewCenter = modelViewMatrix * vec4(center.xyz, 1.0);
    vec4 projectedCenter = projectionMatrix * viewCenter;
    gaussianPosition = position.xy;
    gaussianColor = vec4(b.zw, c.x, center.w);
    if (viewCenter.z >= -0.01) {
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      return;
    }
    mat3 covariance = mat3(a.x, a.y, a.z, a.y, a.w, b.x, a.z, b.x, b.y);
    mat3 viewRotation = mat3(modelViewMatrix);
    covariance = viewRotation * covariance * transpose(viewRotation);
    float z = -viewCenter.z;
    vec2 focal = viewport * vec2(projectionMatrix[0][0], projectionMatrix[1][1]) * 0.5;
    vec3 jx = vec3(focal.x / z, 0.0, focal.x * viewCenter.x / (z * z));
    vec3 jy = vec3(0.0, focal.y / z, focal.y * viewCenter.y / (z * z));
    float xx = dot(jx, covariance * jx) + 0.15;
    float xy = dot(jx, covariance * jy);
    float yy = dot(jy, covariance * jy) + 0.15;
    float midpoint = 0.5 * (xx + yy);
    float delta = length(vec2(0.5 * (xx - yy), xy));
    float major = sqrt(max(midpoint + delta, 0.15));
    float minor = sqrt(max(midpoint - delta, 0.15));
    vec2 axis = abs(xy) > 0.00001 ? normalize(vec2(xy, midpoint + delta - xx))
      : (xx >= yy ? vec2(1.0, 0.0) : vec2(0.0, 1.0));
    vec2 pixelOffset = axis * major * position.x + vec2(-axis.y, axis.x) * minor * position.y;
    gl_Position = projectedCenter;
    gl_Position.xy += 2.0 * pixelOffset / viewport * projectedCenter.w;
  }
`;

export const splatFragmentShader = `
  out vec4 splatOutput;
  varying vec2 gaussianPosition;
  varying vec4 gaussianColor;
  void main() {
    float radiusSquared = dot(gaussianPosition, gaussianPosition);
    if (radiusSquared > 9.0) discard;
    float alpha = gaussianColor.a * exp(-0.5 * radiusSquared);
    if (alpha < 0.0039) discard;
    // Captured/reconstructed colours already contain diffuse bronze lighting.
    // Do not add the reflective PBR lighting used by the GLB models.
    splatOutput = vec4(gaussianColor.rgb, min(alpha, 0.99));
  }
`;
