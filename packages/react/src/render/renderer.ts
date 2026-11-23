import { fragmentSource, vertexSource } from '../generated/core';
import type { Linear } from '../colors';

/** A uniform value: a number is a `float`, three numbers a `vec3`. */
export type UniformValue = number | readonly [number, number, number];
/**
 * One frame's uniforms by GLSL name (packages/core/spec.md › Motion › Draw), e.g. `{ uTime: 1.2, uTint: [1, 1, 1] }`.
 * Adding a uniform to the shader needs no change here: pass it in the map.
 */
export type Uniforms = Readonly<Record<string, UniformValue>>;

export interface Renderer {
  /** Sets the drawing buffer size in device pixels. */
  resize(width: number, height: number): void;
  /** Ground and three pigments, linear light. */
  setColors(colors: readonly Linear[]): void;
  draw(uniforms: Uniforms): void;
  dispose(): void;
}

/** A WebGL2 renderer for one canvas, or null when WebGL2 or the shader is unavailable. Framework-free. */
export function createRenderer(canvas: HTMLCanvasElement): Renderer | null {
  const gl = canvas.getContext('webgl2', {
    alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'low-power',
  });
  if (!gl) return null;

  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
    gl.deleteShader(shader);
    return null;
  };
  const vertex = compile(gl.VERTEX_SHADER, vertexSource);
  const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  if (!vertex || !fragment || !program) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'aPos');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  // Locations looked up on first use; null (not in the shader) is cached too and setting it is a no-op.
  const locations = new Map<string, WebGLUniformLocation | null>();
  const location = (name: string) => {
    let found = locations.get(name);
    if (found === undefined) locations.set(name, (found = gl.getUniformLocation(program, name)));
    return found;
  };
  const set = (name: string, value: UniformValue) => {
    if (typeof value === 'number') gl.uniform1f(location(name), value);
    else gl.uniform3f(location(name), value[0], value[1], value[2]);
  };

  return {
    resize(width, height) {
      const w = Math.max(1, Math.round(width));
      const h = Math.max(1, Math.round(height));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    },
    setColors(colors) {
      (['uBase', 'uColor1', 'uColor2', 'uColor3'] as const).forEach((name, i) => {
        const c = colors[i];
        if (c) set(name, c);
      });
    },
    draw(uniforms) {
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      for (const name in uniforms) set(name, uniforms[name]!);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
    dispose() {
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      // Release the context only on a real unmount (the canvas has left the document). React's
      // development remount reuses a connected canvas, and getContext would return the lost context.
      if (!canvas.isConnected) gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}
