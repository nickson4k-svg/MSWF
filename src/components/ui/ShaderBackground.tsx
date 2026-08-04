'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

const vertexShaderSource = `
  attribute vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const fragmentShaderSource = `
  precision mediump float;

  uniform vec2 u_resolution;
  uniform float u_time;
  uniform vec3 u_color1;
  uniform vec3 u_color2;
  uniform vec3 u_color3;
  uniform int u_mode;

  float rand(vec2 co) {
    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
  }

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  void main() {
    vec2 st = gl_FragCoord.xy / u_resolution.xy;
    float aspect = u_resolution.x / u_resolution.y;
    vec2 uv = st;
    uv.x *= aspect;

    float t = u_time * 0.12;
    vec3 color = u_color1;

    if (u_mode == 0) {
      // FLUID MODE
      float n1 = noise(uv * 1.5 + vec2(t * 0.4, t * 0.2));
      float n2 = noise(uv * 2.2 - vec2(t * 0.3, t * 0.5));
      float n = mix(n1, n2, 0.5);
      color = mix(u_color1, u_color2, smoothstep(0.1, 0.6, n));
      color = mix(color, u_color3, smoothstep(0.5, 0.9, n));
    } else if (u_mode == 1) {
      // GRAIN CORNERS MODE
      float distTL = length(st - vec2(0.0, 1.0));
      float distBR = length(st - vec2(1.0, 0.0));
      color = mix(u_color1, u_color2, smoothstep(0.1, 1.1, distTL));
      color = mix(color, u_color3, smoothstep(0.1, 1.1, distBR));
    } else if (u_mode == 2) {
      // GRAIN WAVE MODE
      float wave = sin(st.x * 3.0 + st.y * 2.0 + t * 1.5) * 0.5 + 0.5;
      color = mix(u_color1, u_color2, wave);
      color = mix(color, u_color3, smoothstep(0.2, 0.8, noise(uv * 2.0 + t)));
    } else {
      // GRAIN BLOB MODE
      vec2 p1 = vec2(0.3 + 0.2 * sin(t * 0.7), 0.4 + 0.2 * cos(t * 0.5));
      vec2 p2 = vec2(0.7 + 0.2 * cos(t * 0.6), 0.6 + 0.2 * sin(t * 0.8));
      float d1 = smoothstep(0.65, 0.0, length(st - p1));
      float d2 = smoothstep(0.65, 0.0, length(st - p2));
      color = mix(u_color1, u_color2, d1);
      color = mix(color, u_color3, d2);
    }

    // Subtle background grain
    float grain = (rand(gl_FragCoord.xy + fract(u_time * 0.05)) - 0.5) * 0.035;
    color += grain;

    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
  }
`;

const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16) / 255,
    parseInt(result[2], 16) / 255,
    parseInt(result[3], 16) / 255
  ] : [0, 0, 0];
};

const THEMES: Record<string, string[]> = {
  default: ['#09090b', '#18181b', '#27272a'],
  ocean: ['#020617', '#1e3a8a', '#0891b2'],
  cyberpunk: ['#2e1065', '#be185d', '#3b0764'],
  forest: ['#022c22', '#047857', '#064e3b'],
  rose: ['#4c0519', '#e11d48', '#881337'],
};

export type ShaderType = 'fluid' | 'grain-corners' | 'grain-wave' | 'grain-blob';

const getShaderModeInt = (type: ShaderType): number => {
  switch (type) {
    case 'grain-corners': return 1;
    case 'grain-wave': return 2;
    case 'grain-blob': return 3;
    case 'fluid':
    default: return 0;
  }
};

export const ShaderBackground = ({
  theme,
  shaderType = 'fluid',
  isPaused = false,
}: {
  theme: string;
  shaderType?: ShaderType;
  isPaused?: boolean;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    if (isPaused) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', { 
      powerPreference: 'low-power', 
      preserveDrawingBuffer: false,
      alpha: false,
      antialias: false,
    });

    if (!gl) {
      console.warn('WebGL not supported');
      return;
    }

    const compileShader = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertexShader = compileShader(gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
    if (!vertexShader || !fragmentShader) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;

    gl.useProgram(program);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        -1.0, -1.0,
         1.0, -1.0,
        -1.0,  1.0,
        -1.0,  1.0,
         1.0, -1.0,
         1.0,  1.0,
      ]),
      gl.STATIC_DRAW
    );

    const positionLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
    const timeLocation = gl.getUniformLocation(program, 'u_time');
    const color1Location = gl.getUniformLocation(program, 'u_color1');
    const color2Location = gl.getUniformLocation(program, 'u_color2');
    const color3Location = gl.getUniformLocation(program, 'u_color3');
    const modeLocation = gl.getUniformLocation(program, 'u_mode');

    // Downscale internal resolution to 640x360 (360p) for ultra-light zero-lag 60fps rendering
    const resize = () => {
      const targetW = Math.min(640, Math.floor(window.innerWidth * 0.5));
      const targetH = Math.min(360, Math.floor(window.innerHeight * 0.5));
      canvas.width = Math.max(320, targetW);
      canvas.height = Math.max(240, targetH);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
    };

    window.addEventListener('resize', resize);
    resize();

    const colors = THEMES[theme] || THEMES.default;
    const rgb1 = hexToRgb(colors[0]);
    const rgb2 = hexToRgb(colors[1]);
    const rgb3 = hexToRgb(colors[2]);

    gl.uniform3f(color1Location, rgb1[0], rgb1[1], rgb1[2]);
    gl.uniform3f(color2Location, rgb2[0], rgb2[1], rgb2[2]);
    gl.uniform3f(color3Location, rgb3[0], rgb3[1], rgb3[2]);
    gl.uniform1i(modeLocation, getShaderModeInt(shaderType));

    let animationFrameId: number;
    const startTime = performance.now();
    let isHidden = false;

    const render = (time: number) => {
      if (isHidden) return;
      gl.uniform1f(timeLocation, (time - startTime) * 0.001);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animationFrameId = requestAnimationFrame(render);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        isHidden = true;
        cancelAnimationFrame(animationFrameId);
      } else {
        isHidden = false;
        animationFrameId = requestAnimationFrame(render);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    animationFrameId = requestAnimationFrame(render);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      gl.deleteBuffer(positionBuffer);
    };
  }, [theme, shaderType, isPaused]);

  if (!mounted) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full -z-10 transition-opacity duration-700"
      style={{ pointerEvents: 'none' }}
    />
  );
};
