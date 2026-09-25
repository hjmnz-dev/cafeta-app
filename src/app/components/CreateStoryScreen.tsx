import React, { useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { X, Image as ImageIcon, Clock } from 'lucide-react';
import { useAppState } from '../store/AppState';
import { toStorableImage } from '../lib/image';

/**
 * DEF-04 · HU12 — Crear historia.
 *
 * Se diferencia de crear publicación en que el contenido es efímero: se avisa
 * en pantalla que dura 24 h para que la naturaleza temporal sea explícita antes
 * de publicar, no una sorpresa al día siguiente. Una sola imagen, reducida como
 * en las publicaciones (ver lib/image.ts).
 */
export function CreateStoryScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, addStory } = useAppState();

  // Se publica desde el feed o desde el perfil: se vuelve a donde se estaba.
  const from = (location.state as { from?: string } | null)?.from ?? '/home';

  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const pickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    if (!picked) return;
    if (preview) URL.revokeObjectURL(preview);
    setFile(picked);
    setPreview(URL.createObjectURL(picked));
  };

  const clearImage = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
  };

  const canPublish = Boolean(text.trim()) || Boolean(file);

  const publish = async () => {
    if (!canPublish || publishing) return;
    setPublishing(true);

    const image = file ? await toStorableImage(file) : undefined;
    addStory({ text: text.trim(), image });

    if (preview) URL.revokeObjectURL(preview);
    navigate(from);
  };

  const initial = (profile.name.trim()[0] || 'C').toUpperCase();

  return (
    <div className="w-full h-full bg-[var(--surface)] flex flex-col">
      {/* Header propio */}
      <div className="px-4 pt-14 pb-3 flex items-center justify-between border-b border-[var(--line)]">
        <button
          onClick={() => navigate(-1)}
          aria-label="Cerrar"
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--surface-3)]"
        >
          <X className="w-5 h-5 text-[var(--ink)]" />
        </button>
        <h1 className="font-['Space_Grotesk',sans-serif] font-bold text-[17px] text-[var(--ink)]">
          Nueva historia
        </h1>
        <button
          onClick={publish}
          disabled={!canPublish || publishing}
          className={
            'h-9 px-4 rounded-full text-[14px] font-semibold transition-colors ' +
            (canPublish && !publishing
              ? 'bg-[var(--brand)] text-[var(--on-brand)] hover:bg-[var(--brand-strong)]'
              : 'bg-[var(--surface-3)] text-[var(--muted)] cursor-not-allowed')
          }
        >
          Publicar
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-4">
        {/* Aviso de caducidad: la historia es contenido temporal (HU12/HU13) */}
        <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-[14px] bg-[var(--surface-2)] border border-[var(--line)]">
          <Clock className="w-4 h-4 text-[var(--muted)] flex-none" />
          <p className="text-[13px] text-[var(--muted)]">
            Se mostrará a quienes te siguen durante{' '}
            <strong className="text-[var(--ink-2)]">24 horas</strong> y luego
            dejará de verse.
          </p>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-[var(--brand)] text-[var(--on-brand)] flex items-center justify-center font-semibold flex-none">
            {initial}
          </div>
          <textarea
            autoFocus
            aria-label="Texto de la historia"
            placeholder="¿Qué está pasando ahora mismo en el campus?"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="flex-1 min-h-[120px] resize-none text-[16px] text-[var(--ink)] placeholder:text-[var(--muted)] outline-none bg-transparent"
          />
        </div>

        {preview && (
          <div className="relative">
            <img
              src={preview}
              alt="Vista previa de la historia"
              className="w-full rounded-[18px] object-cover max-h-[320px]"
            />
            <button
              onClick={clearImage}
              aria-label="Quitar imagen"
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div>
          <button
            onClick={() => inputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-[var(--line)] text-[14px] font-medium text-[var(--ink-2)] hover:border-[var(--brand)] hover:text-[var(--brand)] transition-colors"
          >
            <ImageIcon className="w-[18px] h-[18px]" />
            {preview ? 'Cambiar imagen' : 'Agregar imagen'}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={pickImage}
            className="hidden"
          />
        </div>
      </div>
    </div>
  );
}
