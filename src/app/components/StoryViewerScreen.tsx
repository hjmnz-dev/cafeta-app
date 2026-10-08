import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Clock,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  authorSegment,
  playbackQueue,
  remainingLabel,
  STORY_DURATION_MS,
} from '../lib/stories';
import { useSession } from '../store/SessionStore';
import { useStoryTray } from '../store/stories-queries';
import { StoryAvatar } from './StoryAvatar';
import { StoryCommentsSheet } from './StoryCommentsSheet';
import { StoryEngagement } from './StoryEngagement';
import { StoryOwnerMenu } from './StoryOwnerMenu';

/**
 * HU13 · Ver una historia, contra la API (decisión 22).
 *
 * El visor es el punto más "Instagram" de la app: contenido a sangre, barra de
 * progreso y controles flotando encima. Va siempre en oscuro, en los dos temas,
 * porque aquí manda la imagen y cualquier superficie clara le robaría contraste.
 *
 * La reproducción es automática: cada historia dura 10 s, la barra de arriba
 * mide las historias *de quien se está viendo* (una franja por historia suya) y
 * al acabarse todas las que quedaban por ver, el visor se cierra solo. Editar y
 * desactivar (solo en la historia propia) viven en StoryOwnerMenu, que detiene
 * la reproducción mientras hay un menú o un diálogo abierto (decisión 23).
 * Reaccionar (fila de cinco en las ajenas, conteo en la propia) y comentar
 * viven en StoryEngagement y StoryCommentsSheet (decisión 24); la hoja de
 * comentarios también pausa. Las reglas de la cola y del tiempo restante viven
 * en lib/stories.
 */

const SCREEN = 'w-full h-full bg-[#0d0a09]';

export function StoryViewerScreen() {
  const { storyId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSession();
  const [muted, setMuted] = useState(true);
  // Con un menú, un diálogo o la hoja de comentarios abiertos no avanza solo;
  // al cerrarlos, la barra y el temporizador arrancan de nuevo (restart cambia
  // la clave de la franja).
  const [menuBusy, setMenuBusy] = useState(false);
  const [commentsFor, setCommentsFor] = useState<string | null>(null);
  const [restart, setRestart] = useState(0);
  const handleBusy = useCallback((busy: boolean) => {
    setMenuBusy(busy);
    if (!busy) setRestart((count) => count + 1);
  }, []);
  const toggleComments = (storyId: string) => {
    if (commentsFor === storyId) setRestart((count) => count + 1);
    setCommentsFor(commentsFor === storyId ? null : storyId);
  };

  /**
   * Pantalla desde la que se abrió la historia. Cerrar debe devolver ahí —al
   * perfil si se abrió desde el perfil— y no siempre al feed. Se arrastra al
   * pasar de una historia a otra para no perderlo por el camino.
   */
  const from = (location.state as { from?: string } | null)?.from ?? '/home';
  const goBack = () => navigate(from);

  const tray = useStoryTray();
  const queue = playbackQueue(tray.data?.groups ?? []);
  const index = queue.findIndex((entry) => entry.story.id === storyId);
  const entry = queue[index];
  const prev = queue[index - 1];
  const next = queue[index + 1];
  const nextId = next?.story.id ?? null;
  const commentsOpen = entry !== undefined && commentsFor === entry.story.id;
  const paused = menuBusy || commentsOpen;

  useEffect(() => {
    if (!entry || paused) return;
    const timer = setTimeout(() => {
      // Se acabaron las historias por ver: se cierra el visor.
      if (nextId)
        navigate(`/stories/${nextId}`, { replace: true, state: { from } });
      else navigate(from);
    }, STORY_DURATION_MS);
    return () => clearTimeout(timer);
  }, [entry, nextId, from, navigate, paused]);

  if (tray.isPending) {
    return (
      <div className={`${SCREEN} flex items-center justify-center`}>
        <p className="text-white/70 text-[14px]">Cargando historia…</p>
      </div>
    );
  }

  if (tray.isError) {
    return (
      <div
        className={`${SCREEN} flex flex-col items-center justify-center gap-4 px-8 text-center`}
      >
        <p className="text-white text-[16px]">
          No pudimos cargar las historias.
        </p>
        <button
          onClick={() => void tray.refetch()}
          className="h-11 px-6 rounded-full bg-white text-[#171313] text-[15px] font-semibold"
        >
          Reintentar
        </button>
        <button onClick={goBack} className="text-white/70 text-[14px]">
          Volver
        </button>
      </div>
    );
  }

  // Vencida, desactivada o de alguien a quien no se sigue: no hay nada que ver (HU13).
  if (!entry) {
    return (
      <div
        className={`${SCREEN} flex flex-col items-center justify-center gap-4 px-8 text-center`}
      >
        <Clock className="w-10 h-10 text-white/50" />
        <p className="text-white text-[16px]">
          Esta historia ya no está disponible.
        </p>
        <p className="text-white/60 text-[14px]">
          Las historias se muestran solo durante 24 horas.
        </p>
        <button
          onClick={goBack}
          className="mt-2 h-11 px-6 rounded-full bg-white text-[#171313] text-[15px] font-semibold"
        >
          Volver
        </button>
      </div>
    );
  }

  const { story, author } = entry;
  const segment = authorSegment(queue, author.id);
  const segmentIndex = segment.findIndex((e) => e.story.id === story.id);
  const isVideo = story.media.mediaType === 'VIDEO';

  const iconButton =
    'w-9 h-9 rounded-full flex items-center justify-center text-white/85 hover:bg-[var(--surface)]/15 transition-colors';

  return (
    <div className={`${SCREEN} flex flex-col relative overflow-hidden`}>
      {/* Contenido a sangre */}
      <div className="absolute inset-0">
        {isVideo ? (
          <video
            key={story.id}
            src={story.media.url}
            className="w-full h-full object-cover"
            autoPlay
            loop
            playsInline
            muted={muted}
          />
        ) : (
          <img
            src={story.media.url}
            alt=""
            className="w-full h-full object-cover"
          />
        )}
        {/* Velos: sostienen la legibilidad de cabecera y texto sobre la foto */}
        <div className="absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-black/70 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black/85 to-transparent" />
      </div>

      {/* Barra de progreso: una franja por historia de este autor. Con una sola
          historia hay una sola franja, que se llena mientras se ve. */}
      <div className="relative px-3 pt-12 flex gap-1" aria-hidden>
        {segment.map((e, i) => (
          <span
            key={e.story.id}
            className="flex-1 h-[3px] rounded-full bg-[var(--surface)]/25 overflow-hidden"
          >
            {i < segmentIndex && (
              <span className="block h-full w-full rounded-full bg-[var(--surface)]" />
            )}
            {i === segmentIndex && (
              <span
                key={`${e.story.id}-${restart}`}
                className="block h-full w-0 rounded-full bg-[var(--surface)]"
                style={{
                  animation: `story-progress ${STORY_DURATION_MS}ms linear forwards`,
                  animationPlayState: paused ? 'paused' : 'running',
                }}
              />
            )}
          </span>
        ))}
      </div>

      {/* Cabecera: autor y vigencia */}
      <div className="relative px-3 py-2.5 flex items-center gap-2.5">
        <StoryAvatar
          url={author.avatarUrl}
          name={author.displayName}
          className="w-9 h-9 flex-none text-[15px]"
        />
        <div className="flex-1 min-w-0">
          <p className="text-white text-[14px] font-semibold truncate">
            {author.displayName}
          </p>
          <p className="text-white/70 text-[11px]">
            {remainingLabel(story.expiresAt)}
            {story.editedAt && ' · Editada'}
          </p>
        </div>
        {isVideo && (
          <button
            onClick={() => setMuted((value) => !value)}
            aria-label={muted ? 'Activar sonido' : 'Silenciar'}
            className={iconButton}
          >
            {muted ? (
              <VolumeX className="w-[18px] h-[18px]" />
            ) : (
              <Volume2 className="w-[18px] h-[18px]" />
            )}
          </button>
        )}
        {user?.id === author.id && (
          <StoryOwnerMenu
            story={story}
            onBusyChange={handleBusy}
            onDeactivated={goBack}
          />
        )}
        <button onClick={goBack} aria-label="Cerrar" className={iconButton}>
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Texto de la historia, sobre el contenido */}
      <div className="relative flex-1 min-h-0 flex flex-col justify-end px-5 pb-4">
        {story.text && (
          <p className="text-white text-[17px] leading-snug drop-shadow-[0_2px_10px_rgba(0,0,0,0.55)]">
            {story.text}
          </p>
        )}
      </div>

      <StoryEngagement
        story={story}
        isMine={user?.id === author.id}
        commentsOpen={commentsOpen}
        onToggleComments={() => toggleComments(story.id)}
      />

      {/* Navegación entre historias vigentes */}
      <div className="relative px-3 pb-8 flex items-center justify-between">
        <button
          onClick={() =>
            prev && navigate(`/stories/${prev.story.id}`, { state: { from } })
          }
          disabled={!prev}
          aria-label="Historia anterior"
          className={iconButton + ' disabled:opacity-25'}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-white/60 text-[12px]">
          {segmentIndex + 1} de {segment.length}
        </span>
        <button
          onClick={() =>
            next && navigate(`/stories/${next.story.id}`, { state: { from } })
          }
          disabled={!next}
          aria-label="Historia siguiente"
          className={iconButton + ' disabled:opacity-25'}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {commentsOpen && (
        <StoryCommentsSheet
          story={story}
          onClose={() => toggleComments(story.id)}
        />
      )}
    </div>
  );
}
