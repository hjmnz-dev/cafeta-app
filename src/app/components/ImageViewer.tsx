import * as DialogPrimitive from '@radix-ui/react-dialog';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { stepIndex } from '../lib/posts';

/**
 * HU11 · Bug 1025: una imagen de la publicación ampliada a pantalla completa,
 * con flechas (y las teclas ← →) para pasar entre las demás. Radix lleva el
 * foco adentro, cierra con Escape y devuelve el foco a la imagen tocada.
 */
export function ImageViewer({
  images,
  index,
  onIndexChange,
  onClose,
}: {
  images: readonly string[];
  /** La imagen abierta; null con el visor cerrado. */
  index: number | null;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}) {
  const open = index !== null;
  const current = index ?? 0;
  const several = images.length > 1;
  const go = (delta: number) =>
    onIndexChange(stepIndex(current, delta, images.length));

  const arrow =
    'absolute top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors';

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => !next && onClose()}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-black/90" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          onKeyDown={(e) => {
            if (!several) return;
            if (e.key === 'ArrowRight') go(1);
            if (e.key === 'ArrowLeft') go(-1);
          }}
          className="fixed inset-0 z-[61] flex items-center justify-center outline-none"
        >
          <DialogPrimitive.Title className="sr-only">
            {several
              ? `Imagen ${current + 1} de ${images.length}`
              : 'Imagen de la publicación'}
          </DialogPrimitive.Title>
          {open && (
            <img
              src={images[current]}
              alt={`Imagen ${current + 1} de la publicación, ampliada`}
              className="w-full h-full object-contain p-4 sm:p-12"
            />
          )}
          <DialogPrimitive.Close
            aria-label="Cerrar imagen"
            className="absolute top-4 right-4 w-11 h-11 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
          >
            <X className="w-6 h-6" />
          </DialogPrimitive.Close>
          {several && (
            <>
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label="Imagen anterior"
                className={`${arrow} left-3`}
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                aria-label="Imagen siguiente"
                className={`${arrow} right-3`}
              >
                <ChevronRight className="w-6 h-6" />
              </button>
              <p
                aria-hidden
                className="absolute bottom-6 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/50 text-white text-[13px]"
              >
                {current + 1} / {images.length}
              </p>
            </>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
