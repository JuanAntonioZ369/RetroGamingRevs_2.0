/**
 * gamepadSupport.js — Web Gamepad API (edge detection + combos)
 * Cada botón dispara UNA SOLA VEZ por presión. Debe soltarse para volver a disparar.
 * Uso: const { initGamepad } = require('./gamepadSupport')
 *      initGamepad({ up, down, left, right, confirm, back, y, start, select,
 *                    combo_select_start, combo_start_circle })
 */

const BUTTON_MAP = {
  0:  'confirm',  // A / Cruz
  1:  'back',     // B / Círculo
  2:  'x',        // X / Cuadrado
  3:  'y',        // Y / Triángulo
  8:  'select',   // Select / Share
  9:  'start',    // Start / Options
  12: 'up',       // D-Pad ↑
  13: 'down',     // D-Pad ↓
  14: 'left',     // D-Pad ←
  15: 'right',    // D-Pad →
};

// Combos: todos los botones deben estar presionados al mismo tiempo
const COMBO_MAP = [
  { buttons: [8, 9], name: 'combo_select_start'  }, // Select + Start → cerrar juego
  { buttons: [9, 1], name: 'combo_start_circle'  }, // Start + Círculo → alt-tab / minimizar
];

let callbacks    = {};
let wasPressed   = {};   // boolean por índice de botón
let comboFired   = {};   // boolean por nombre de combo
let axisActive   = {};   // boolean por clave de eje
let rafId        = null;

function initGamepad(cbs = {}) {
  callbacks  = cbs;
  wasPressed = {};
  comboFired = {};
  axisActive = {};

  window.addEventListener('gamepadconnected', () => {
    if (!rafId) loop();
  });

  window.addEventListener('gamepaddisconnected', () => {
    const any = Array.from(navigator.getGamepads ? navigator.getGamepads() : []).some(g => g !== null);
    if (!any && rafId) { cancelAnimationFrame(rafId); rafId = null; }
  });

  // Mando ya conectado antes de cargar la página
  const existing = Array.from(navigator.getGamepads ? navigator.getGamepads() : []).filter(Boolean);
  if (existing.length > 0 && !rafId) loop();
}

function loop() {
  const gamepads = Array.from(navigator.getGamepads ? navigator.getGamepads() : []);

  for (const gp of gamepads) {
    if (!gp) continue;

    // ── 1. Detectar combos primero ──────────────────────────────
    const inCombo = new Set(); // botones que forman un combo activo
    for (const combo of COMBO_MAP) {
      const allDown = combo.buttons.every(i => gp.buttons[i]?.pressed);
      if (allDown) {
        combo.buttons.forEach(i => inCombo.add(i));
        if (!comboFired[combo.name]) {
          comboFired[combo.name] = true;
          if (callbacks[combo.name]) callbacks[combo.name](gp);
        }
      } else {
        comboFired[combo.name] = false;
      }
    }

    // ── 2. Botones individuales (edge: solo al presionar, no al mantener) ──
    gp.buttons.forEach((btn, idx) => {
      const action = BUTTON_MAP[idx];
      if (!action) { wasPressed[idx] = btn.pressed; return; }

      // Si el botón forma parte de un combo activo, ignorarlo individualmente
      if (inCombo.has(idx)) { wasPressed[idx] = btn.pressed; return; }

      // Disparar solo en el flanco de bajada (not pressed → pressed)
      if (btn.pressed && !wasPressed[idx]) {
        if (callbacks[action]) callbacks[action](gp);
      }
      wasPressed[idx] = btn.pressed;
    });

    // ── 3. Ejes analógicos (edge detection igual) ───────────────
    const THRESHOLD = 0.5;
    const AXIS_ACTIONS = [
      { key: 'ax_l', axis: 0, dir: -1, action: 'left'  },
      { key: 'ax_r', axis: 0, dir:  1, action: 'right' },
      { key: 'ax_u', axis: 1, dir: -1, action: 'up'    },
      { key: 'ax_d', axis: 1, dir:  1, action: 'down'  },
    ];
    for (const a of AXIS_ACTIONS) {
      const val    = gp.axes[a.axis] ?? 0;
      const active = a.dir < 0 ? val < -THRESHOLD : val > THRESHOLD;
      if (active && !axisActive[a.key]) {
        if (callbacks[a.action]) callbacks[a.action](gp);
      }
      axisActive[a.key] = active;
    }
  }

  rafId = requestAnimationFrame(loop);
}

function stopGamepad() {
  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
}

function getGamepadsState() {
  return Array.from(navigator.getGamepads ? navigator.getGamepads() : []).filter(Boolean);
}

module.exports = { initGamepad, stopGamepad, getGamepadsState, BUTTON_MAP };
