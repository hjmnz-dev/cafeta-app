/**
 * Preparación de imágenes para publicarlas sin backend.
 *
 * Las publicaciones viven en localStorage (~5 MB en total), así que una foto de
 * cámara tal cual (3-8 MB) no cabe. Antes de guardarla se reduce el lado mayor
 * y se recomprime a JPEG; el resultado es un data URL que sobrevive a la
 * recarga. Con backend real esto se sustituye por una subida y una URL.
 */

/** Lado máximo (px) y calidad JPEG del recomprimido. */
const MAX_SIDE = 1080;
const QUALITY = 0.72;

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Si el entorno no decodifica la imagen no llega ni load ni error, así que
    // el temporizador evita que publicar se quede colgado.
    const timer = setTimeout(
      () => reject(new Error('Tiempo agotado al leer la imagen')),
      5000,
    );
    img.onload = () => {
      clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timer);
      reject(new Error('No se pudo leer la imagen'));
    };
    img.src = src;
  });
}

/**
 * Devuelve la imagen como data URL, reducida si hace falta. Si el navegador no
 * puede recomprimir (canvas no disponible), devuelve el original: es preferible
 * publicar algo pesado a perder la imagen.
 */
export async function toStorableImage(file: File): Promise<string> {
  const original = await readAsDataURL(file);
  try {
    const img = await loadImage(original);
    const largest = Math.max(img.width, img.height);
    const scale = largest > MAX_SIDE ? MAX_SIDE / largest : 1;

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale) || 1;
    canvas.height = Math.round(img.height * scale) || 1;

    const ctx = canvas.getContext('2d');
    if (!ctx) return original;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const compressed = canvas.toDataURL('image/jpeg', QUALITY);
    return compressed.length < original.length ? compressed : original;
  } catch {
    return original;
  }
}
