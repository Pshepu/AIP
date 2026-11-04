// Lector de códigos de barra con la cámara.
// Usa el lector propio del teléfono (BarcodeDetector) si existe; si no, usa ZXing.

const NATIVE_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf', 'qr_code'];

let zxingPromise;
export function loadZxing() {
  if (window.ZXing) return Promise.resolve(window.ZXing);
  if (!zxingPromise) {
    zxingPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'vendor/zxing.min.js';
      s.onload = () => resolve(window.ZXing);
      s.onerror = () => { zxingPromise = null; reject(new Error('No se pudo cargar el lector')); };
      document.head.appendChild(s);
    });
  }
  return zxingPromise;
}

async function makeNativeDetector() {
  if (!('BarcodeDetector' in window)) return null;
  try {
    const supported = await window.BarcodeDetector.getSupportedFormats();
    const formats = NATIVE_FORMATS.filter((f) => supported.includes(f));
    if (!formats.length) return null;
    return new window.BarcodeDetector({ formats });
  } catch (_) {
    return null;
  }
}

/**
 * Enciende la cámara en el <video> y llama a onCode(texto) cuando lee un código.
 * Devuelve un control: { stop(), resume(), setTorch(bool), hasTorch }.
 */
export async function startScanner(video, onCode) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    const e = new Error('Este navegador no permite usar la cámara.');
    e.code = 'nocamera';
    throw e;
  }
  let paused = false;
  let stopped = false;
  let timer = null;
  let zreader = null;
  let lastCode = '';
  let lastTime = 0;

  const emit = (text) => {
    if (paused || stopped || !text) return;
    const now = Date.now();
    if (text === lastCode && now - lastTime < 2500) return;
    lastCode = text; lastTime = now;
    paused = true;
    onCode(String(text).trim());
  };

  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: false,
  });
  const track = stream.getVideoTracks()[0];
  let caps = {};
  try { caps = track.getCapabilities ? track.getCapabilities() : {}; } catch (_) {}
  // intenta enfoque continuo
  try { if (caps.focusMode && caps.focusMode.includes('continuous')) await track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }); } catch (_) {}

  video.setAttribute('playsinline', '');
  video.muted = true;

  const detector = await makeNativeDetector();
  if (detector) {
    video.srcObject = stream;
    await video.play().catch(() => {});
    let busy = false;
    timer = setInterval(async () => {
      if (busy || paused || stopped || video.readyState < 2) return;
      busy = true;
      try {
        const codes = await detector.detect(video);
        if (codes && codes.length) emit(codes[0].rawValue);
      } catch (_) { /* sigue intentando */ }
      busy = false;
    }, 180);
  } else {
    const ZXing = await loadZxing();
    const hints = new Map();
    const F = ZXing.BarcodeFormat;
    hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [F.EAN_13, F.EAN_8, F.UPC_A, F.UPC_E, F.CODE_128, F.CODE_39, F.ITF, F.QR_CODE]);
    hints.set(ZXing.DecodeHintType.TRY_HARDER, true);
    zreader = new ZXing.BrowserMultiFormatReader(hints, 250);
    zreader.decodeFromStream(stream, video, (result) => {
      if (result) emit(result.getText());
    });
  }

  return {
    hasTorch: !!caps.torch,
    async setTorch(on) {
      try { await track.applyConstraints({ advanced: [{ torch: !!on }] }); return true; } catch (_) { return false; }
    },
    resume() { paused = false; lastCode = ''; },
    stop() {
      stopped = true;
      clearInterval(timer);
      try { zreader && zreader.reset(); } catch (_) {}
      stream.getTracks().forEach((t) => t.stop());
      video.srcObject = null;
    },
  };
}

export function cameraErrorText(err) {
  const n = err && (err.name || err.code);
  if (n === 'NotAllowedError' || n === 'SecurityError') {
    return 'No diste permiso para usar la cámara. Toca el candado junto a la dirección (arriba) o ve a Ajustes del teléfono → Apps → Chrome → Permisos → Cámara, y permite el acceso.';
  }
  if (n === 'NotFoundError' || n === 'OverconstrainedError') return 'No se encontró una cámara en este equipo.';
  if (n === 'NotReadableError') return 'La cámara está siendo usada por otra app. Ciérrala e intenta de nuevo.';
  if (n === 'nocamera') return 'Este navegador no permite usar la cámara. Abre AIP en Chrome.';
  return 'No se pudo encender la cámara. Puedes escribir el código a mano.';
}
