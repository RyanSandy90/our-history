import { FRAGMENT_SHADER, VERTEX_SHADER } from "./spectralRibbonShaders";

export function createSpectralRibbonRenderer(canvas: HTMLCanvasElement, colours: string[]) {
  const gl = canvas.getContext("webgl", { alpha: false, antialias: false, depth: false, powerPreference: "low-power" });
  if (!gl) throw new Error("WebGL is unavailable");
  const shaders: WebGLShader[] = [];
  let program: WebGLProgram | null = null;
  let buffer: WebGLBuffer | null = null;
  const dispose = () => {
    gl.deleteBuffer(buffer);
    gl.deleteProgram(program);
    shaders.forEach(shader => gl.deleteShader(shader));
  };

  try {
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) throw new Error("Could not create ribbon shader");
      shaders.push(shader);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error("Could not compile ribbon shader");
      return shader;
    };
    program = gl.createProgram();
    if (!program) throw new Error("Could not create ribbon program");
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX_SHADER));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT_SHADER));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error("Could not link ribbon shader");
    gl.useProgram(program);

    buffer = gl.createBuffer();
    if (!buffer) throw new Error("Could not create ribbon buffer");
    const position = gl.getAttribLocation(program, "position");
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const uniform = (name: string) => gl.getUniformLocation(program!, name);
    const resolution = uniform("u_res");
    const time = uniform("u_time");
    const offset = uniform("u_offset");
    const curve = uniform("u_curve[0]");
    const points = new Float32Array(49 * 2);
    let aspect = 1;
    ["u_base", "u_accent"].forEach((name, index) => {
      const hex = colours[index].trim().replace("#", "");
      if (!/^[a-f\d]{6}$/i.test(hex)) throw new Error("Invalid ribbon palette");
      gl.uniform3f(uniform(name), parseInt(hex.slice(0, 2), 16) / 255, parseInt(hex.slice(2, 4), 16) / 255, parseInt(hex.slice(4, 6), 16) / 255);
    });
    gl.uniform1f(uniform("u_intensity"), .16);
    gl.uniform1f(uniform("u_thickness"), 1);
    gl.uniform1f(uniform("u_grain"), .12);

    return {
      resize(width: number, height: number) {
        // A soft backdrop needs far fewer pixels than the foreground 3D models.
        const scale = Math.min(1, 1000 / width, 760 / height);
        canvas.width = Math.max(1, Math.round(width * scale));
        canvas.height = Math.max(1, Math.round(height * scale));
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.uniform2f(resolution, canvas.width, canvas.height);
        aspect = width / Math.max(height, 1);
      },
      draw(seconds: number, travel: number) {
        const slowTime = seconds * .2;
        // One continuous S-curve in scroll-space. Sample once on the CPU rather
        // than repeating the trigonometry for every fragment, every frame.
        for (let i = 0; i <= 48; i++) {
          const y = -.55 + i / 48 * 2.1;
          const along = y + travel;
          const sway = Math.sin(slowTime * .42 + along * 1.2) * .025;
          // Two slow travelling waves let the ribbon breathe in a light breeze
          // even at a reading stop, with no gusts, brightness pulsing or reset.
          const breeze = Math.sin(seconds * .32 - along * 1.4) * .019
            + Math.sin(seconds * .19 + along * 2.1) * .011;
          points[i * 2] = (Math.sin(along * 1.7 - .65 + sway) * .52
            + Math.sin(along * 3.3 + slowTime * .18) * .035 + breeze) * aspect;
          points[i * 2 + 1] = y;
        }
        gl.uniform2fv(curve, points);
        gl.uniform1f(time, slowTime);
        gl.uniform1f(offset, travel);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      },
      dispose,
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
