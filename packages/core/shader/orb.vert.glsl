#version 300 es
// A full-screen quad; vUv runs -1..1 across the orb's square.
in vec2 aPos;
out vec2 vUv;
void main() { vUv = aPos; gl_Position = vec4(aPos, 0.0, 1.0); }
