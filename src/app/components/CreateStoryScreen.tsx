import { useRef, useState, type ChangeEvent } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { X, Image as ImageIcon, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { messageForCode } from '../lib/error-messages';
import { userMessageOf } from '../lib/http';
import { checkMediaFile, kindOf } from '../lib/media';
import { countChars } from '../lib/posts';
import { STORY_TEXT_MAX } from '../lib/stories';
import type { UploadView } from '../lib/uploads-api';
import { useUploadFile } from '../store/posts-queries';
import { useSession } from '../store/SessionStore';
import { useCreateStory } from '../store/stories-queries';
import { StoryAvatar } from './StoryAvatar';

/**
 * HU12 · Crear historia, contra la API (decisión 22).
 *
 * Se diferencia de crear publicación en que el contenido es efímero: se avisa
 * en pantalla que dura 24 h para que la naturaleza temporal sea explícita antes
 * de publicar, no una sorpresa al día siguiente. La imagen o el video son
 * obligatorios (se suben a la API al elegirlos) y el texto es opcional.
 */

/** Una historia lleva imagen o video, nunca un documento. */
const STORY_ACCEPT =
  'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm';

export function CreateStoryScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSession();
  const uploadFile = useUploadFile();
  const createStory = useCreateStory();

  // Se publica desde el feed o desde el perfil: se vuelve a donde se estaba.
  const from = (location.state as { from?: string } | null)?.from ?? '/home';

  const [text, setText] = useState('');
  const [media, setMedia] = useState<UploadView | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const used = countChars(text);
  const tooLong = used > STORY_TEXT_MAX;
  const uploading = uploadFile.isPending;
  const publishing = createStory.isPending;
  const canPublish = Boolean(media) && !uploading && !publishing && !tooLong;

  const pickMedia = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Permite elegir el mismo archivo otra vez después de quitarlo.
    event.target.value = '';
    if (!file) return;
    const problem = checkMediaFile(file);
    if (problem) {
      toast.error(messageForCode(problem));
      return;
    }
    if (kindOf(file.type) === 'DOCUMENT') {
      toast.error(messageForCode('STORY_MEDIA_INVALID'));
      return;
    }
    uploadFile.mutate(file, {
      onSuccess: (uploaded) => setMedia(uploaded),
      onError: (error) => toast.error(userMessageOf(error)),
    });
  };

  const publish = () => {
    if (!media || !canPublish) return;
    createStory.mutate(
      { mediaKey: media.key, text: text.trim() ? text.trim() : undefined },
      {
        onSuccess: () => navigate(from),
        onError: (error) => toast.error(userMessageOf(error)),
      },
    );
  };

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
          disabled={!canPublish}
          className={
            'h-9 px-4 rounded-full text-[14px] font-semibold transition-colors ' +
            (canPublish
              ? 'bg-[var(--brand)] text-[var(--on-brand)] hover:bg-[var(--brand-strong)]'
              : 'bg-[var(--surface-3)] text-[var(--muted)] cursor-not-allowed')
          }
        >
          {publishing ? 'Publicando…' : 'Publicar'}
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

        {media ? (
          <div className="relative">
            {media.mediaType === 'VIDEO' ? (
              <video
                src={media.url}
                controls
                muted
                aria-label="Vista previa de la historia"
                className="w-full rounded-[18px] max-h-[320px] bg-black"
              />
            ) : (
              <img
                src={media.url}
                alt="Vista previa de la historia"
                className="w-full rounded-[18px] object-cover max-h-[320px]"
              />
            )}
            <button
              onClick={() => setMedia(null)}
              aria-label="Quitar archivo"
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div>
            <button
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="w-full flex items-center justify-center gap-2 px-4 py-10 rounded-[18px] border-2 border-dashed border-[var(--line)] text-[14px] font-medium text-[var(--ink-2)] hover:border-[var(--brand)] hover:text-[var(--brand)] transition-colors disabled:opacity-60"
            >
              <ImageIcon className="w-[18px] h-[18px]" />
              {uploading ? 'Subiendo…' : 'Elige una imagen o un video'}
            </button>
            <p className="mt-2 text-[12px] text-[var(--muted)]">
              Imagen JPG, PNG, WebP o GIF (hasta 5 MB), o video MP4 o WebM
              (hasta 25 MB). Es obligatorio.
            </p>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={STORY_ACCEPT}
          aria-label="Archivo de la historia"
          onChange={pickMedia}
          className="hidden"
        />

        <div className="flex items-start gap-3">
          <StoryAvatar
            url={user?.profile.avatarUrl ?? null}
            name={user?.profile.displayName ?? ''}
            className="w-10 h-10 flex-none"
          />
          <div className="flex-1">
            <textarea
              aria-label="Texto de la historia"
              placeholder="Agrega un texto (opcional)"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full min-h-[96px] resize-none text-[16px] text-[var(--ink)] placeholder:text-[var(--muted)] outline-none bg-transparent"
            />
            <p
              className={
                'text-right text-[12px] ' +
                (tooLong
                  ? 'text-[var(--brand)] font-semibold'
                  : 'text-[var(--muted)]')
              }
            >
              {used}/{STORY_TEXT_MAX}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
