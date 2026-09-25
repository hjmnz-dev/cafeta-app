import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { X, ChevronLeft, ChevronRight, Pencil, EyeOff, Clock, Send, MessageCircle } from 'lucide-react';
import { useAppState, CURRENT_USER_ID } from '../store/AppState';
import {
  visibleStories, visibleComments, reactionCounts, remainingLabel, isVigente,
  playbackQueue, authorSegment, STORY_REACTIONS, STORY_DURATION_MS,
} from '../lib/stories';

/**
 * DEF-04 · HU13-HU19 — Ver una historia e interactuar con ella.
 *
 * Reúne en una pantalla todo lo que se puede hacer sobre una historia porque
 * son acciones sobre el mismo contenido efímero: verla mientras esté vigente,
 * reaccionar, comentar, y —si es propia— editarla o desactivarla.
 *
 * El visor es el punto más "Instagram" de la app: contenido a sangre, barra de
 * progreso y acciones flotando encima. Va siempre en oscuro, en los dos temas,
 * porque aquí manda la imagen y cualquier superficie clara le robaría contraste.
 *
 * La reproducción es automática: cada historia dura 10 s, la barra de arriba
 * mide las historias *de quien se está viendo* (una franja por historia suya) y
 * al acabarse todas las que quedaban por ver, el visor se cierra solo. El
 * temporizador se pausa mientras se escribe o se edita, para no cerrar la
 * pantalla en medio de un comentario. Las reglas de vigencia viven en
 * lib/stories.
 */

/** Fondo de las historias sin imagen: degradado de marca. */
const TEXT_STORY_BG = 'linear-gradient(160deg, var(--brand-strong) 0%, var(--brand) 55%, #ff6a52 100%)';

export function StoryViewerScreen() {
  const { storyId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  /**
   * Pantalla desde la que se abrió la historia. Cerrar debe devolver ahí —al
   * perfil si se abrió desde el perfil— y no siempre al feed. Se arrastra al
   * pasar de una historia a otra para no perderlo por el camino.
   */
  const from = (location.state as { from?: string } | null)?.from ?? '/home';
  const goBack = () => navigate(from);
  const {
    stories, followingIds, profile, isOwnStory,
    editStory, deactivateStory, reactToStory,
    addStoryComment, editStoryComment, deactivateStoryComment,
  } = useAppState();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [confirmOff, setConfirmOff] = useState(false);
  const [comment, setComment] = useState('');
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState('');
  const [showComments, setShowComments] = useState(true);

  const visibles = visibleStories(stories, { currentUserId: CURRENT_USER_ID, followingIds });
  const story = stories.find((s) => s.id === storyId);

  // Vencida, desactivada o de alguien a quien no se sigue: no se muestra (HU13).
  const available = Boolean(story) && isVigente(story!) && visibles.some((s) => s.id === story!.id);

  // Cola de reproducción y tramo del autor actual (lo que mide la barra).
  const queue = playbackQueue(visibles);
  const queueIndex = queue.findIndex((s) => s.id === storyId);
  const prev = queue[queueIndex - 1];
  const next = queue[queueIndex + 1];
  const nextId = next?.id ?? null;

  // El temporizador no corre mientras se escribe o se edita: cerrar la pantalla
  // en medio de un comentario sería perder lo escrito.
  const paused = editing || confirmOff || editingComment !== null || comment.trim().length > 0;

  useEffect(() => {
    if (!available || paused) return;
    const timer = setTimeout(() => {
      // Se acabaron las historias por ver: se cierra el visor.
      if (nextId) navigate(`/stories/${nextId}`, { replace: true, state: { from } });
      else navigate(from);
    }, STORY_DURATION_MS);
    return () => clearTimeout(timer);
  }, [storyId, nextId, paused, available, from, navigate]);

  if (!story || !available) {
    return (
      <div className="w-full h-full bg-[#0d0a09] flex flex-col items-center justify-center gap-4 px-8 text-center">
        <Clock className="w-10 h-10 text-white/50" />
        <p className="text-white text-[16px]">Esta historia ya no está disponible.</p>
        <p className="text-white/60 text-[14px]">Las historias se muestran solo durante 24 horas.</p>
        <button
          onClick={goBack}
          className="mt-2 h-11 px-6 rounded-full bg-white text-[#171313] text-[15px] font-semibold"
        >
          Volver
        </button>
      </div>
    );
  }

  const own = isOwnStory(story.id);
  const segment = authorSegment(queue, story.authorId);
  const segmentIndex = segment.findIndex((s) => s.id === story.id);
  const myReaction = story.reactions[CURRENT_USER_ID];
  const comments = visibleComments(story);
  const counts = reactionCounts(story);

  const saveEdit = () => {
    const text = draft.trim();
    if (!text) return;
    editStory(story.id, text);
    setEditing(false);
  };

  const sendComment = () => {
    const text = comment.trim();
    if (!text) return;
    addStoryComment(story.id, text);
    setComment('');
    setShowComments(true);
  };

  const saveComment = (commentId: string) => {
    const text = commentDraft.trim();
    if (!text) return;
    editStoryComment(story.id, commentId, text);
    setEditingComment(null);
  };

  const iconButton = 'w-9 h-9 rounded-full flex items-center justify-center text-white/85 hover:bg-[var(--surface)]/15 transition-colors';

  return (
    <div className="w-full h-full bg-[#0d0a09] flex flex-col relative overflow-hidden">
      {/* Contenido a sangre */}
      <div className="absolute inset-0">
        {story.image ? (
          <img src={story.image} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full" style={{ background: TEXT_STORY_BG }} />
        )}
        {/* Velos: sostienen la legibilidad de cabecera y acciones sobre la foto */}
        <div className="absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-black/70 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black/85 to-transparent" />
      </div>

      {/* Barra de progreso: una franja por historia de este autor. Con una sola
          historia hay una sola franja, que se llena mientras se ve. */}
      <div className="relative px-3 pt-12 flex gap-1" aria-hidden>
        {segment.map((s, i) => (
          <span key={s.id} className="flex-1 h-[3px] rounded-full bg-[var(--surface)]/25 overflow-hidden">
            {i < segmentIndex && <span className="block h-full w-full rounded-full bg-[var(--surface)]" />}
            {i === segmentIndex && (
              <span
                key={s.id + String(paused)}
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

      {/* Cabecera: autor, vigencia y acciones de autor (HU14/HU15) */}
      <div className="relative px-3 py-2.5 flex items-center gap-2.5">
        <img src={story.authorAvatar} alt={story.authorName} className="w-9 h-9 rounded-full object-cover bg-[var(--surface)]/10 flex-none" />
        <div className="flex-1 min-w-0">
          <p className="text-white text-[14px] font-semibold truncate">{story.authorName}</p>
          <p className="text-white/70 text-[11px]">
            {remainingLabel(story)}
            {story.edited && ' · Editada'}
          </p>
        </div>
        {own && (
          <>
            <button onClick={() => { setDraft(story.text); setEditing(true); }} aria-label="Editar historia" className={iconButton}>
              <Pencil className="w-[18px] h-[18px]" />
            </button>
            <button onClick={() => setConfirmOff(true)} aria-label="Desactivar historia" className={iconButton}>
              <EyeOff className="w-[18px] h-[18px]" />
            </button>
          </>
        )}
        <button onClick={goBack} aria-label="Cerrar" className={iconButton}>
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Texto de la historia, sobre el contenido */}
      <div className="relative flex-1 min-h-0 flex flex-col justify-center px-5">
        {editing ? (
          <div className="bg-[var(--surface)] rounded-[18px] p-3">
            <textarea
              autoFocus
              aria-label="Editar texto de la historia"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="w-full min-h-[90px] resize-none text-[15px] text-[#171313] outline-none bg-transparent"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditing(false)} className="px-4 py-2 rounded-full text-[14px] font-semibold text-[#8a807c] bg-[#f1ece9]">
                Cancelar
              </button>
              <button onClick={saveEdit} className="px-4 py-2 rounded-full text-[14px] font-semibold text-white bg-[#d62828]">
                Guardar
              </button>
            </div>
          </div>
        ) : (
          story.text && (
            <p
              className={
                'text-white leading-snug drop-shadow-[0_2px_10px_rgba(0,0,0,0.55)] ' +
                (story.image ? 'text-[17px]' : "text-[26px] font-['Space_Grotesk',sans-serif] font-bold text-center")
              }
            >
              {story.text}
            </p>
          )
        )}
      </div>

      {/* Navegación entre historias vigentes */}
      <div className="relative px-3 flex items-center justify-between">
        <button
          onClick={() => prev && navigate(`/stories/${prev.id}`, { state: { from } })}
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
          onClick={() => next && navigate(`/stories/${next.id}`, { state: { from } })}
          disabled={!next}
          aria-label="Historia siguiente"
          className={iconButton + ' disabled:opacity-25'}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Reacciones rápidas (HU16) */}
      <div className="relative px-4 pt-3">
        <div className="flex gap-1.5">
          {STORY_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => reactToStory(story.id, emoji)}
              aria-label={`Reaccionar con ${emoji}`}
              aria-pressed={myReaction === emoji}
              className={
                'w-10 h-10 rounded-full text-[19px] flex items-center justify-center transition-transform ' +
                (myReaction === emoji ? 'bg-[var(--surface)] scale-110' : 'bg-[var(--surface)]/15 hover:bg-[var(--surface)]/25')
              }
            >
              {emoji}
            </button>
          ))}
        </div>
        {counts.length > 0 && (
          <p className="mt-2 text-white/75 text-[13px]">
            {counts.map((r) => `${r.emoji} ${r.count}`).join('   ')}
          </p>
        )}
      </div>

      {/* Comentarios (HU17-HU19) */}
      <div className="relative px-4 pt-3">
        <button
          onClick={() => setShowComments((v) => !v)}
          aria-expanded={showComments}
          className="flex items-center gap-2 text-white/75 text-[13px] font-semibold"
        >
          <MessageCircle className="w-4 h-4" />
          Comentarios ({comments.length})
        </button>

        {showComments && (
          <div className="mt-2 max-h-[150px] overflow-y-auto no-scrollbar flex flex-col gap-2">
            {comments.length === 0 && <p className="text-white/50 text-[13px]">Todavía no hay comentarios.</p>}

            {comments.map((c) => {
              const mine = c.authorId === CURRENT_USER_ID;
              return (
                <div key={c.id} className="bg-[var(--surface)]/12 backdrop-blur-sm rounded-[14px] px-3.5 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-white text-[13px] font-semibold">{c.authorName}</p>
                    {mine && editingComment !== c.id && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => { setEditingComment(c.id); setCommentDraft(c.text); }}
                          aria-label={`Editar comentario de ${c.authorName}`}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white/75 hover:bg-[var(--surface)]/15"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deactivateStoryComment(story.id, c.id)}
                          aria-label={`Desactivar comentario de ${c.authorName}`}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white/75 hover:bg-[var(--surface)]/15"
                        >
                          <EyeOff className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {editingComment === c.id ? (
                    <div className="mt-2">
                      <input
                        autoFocus
                        aria-label="Editar comentario"
                        value={commentDraft}
                        onChange={(e) => setCommentDraft(e.target.value)}
                        className="w-full bg-white rounded-[12px] px-3 py-2 text-[14px] text-[#171313] outline-none"
                      />
                      <div className="flex justify-end gap-2 mt-2">
                        <button onClick={() => setEditingComment(null)} className="px-3 py-1.5 rounded-full text-[13px] font-semibold text-white/75">
                          Cancelar
                        </button>
                        <button onClick={() => saveComment(c.id)} className="px-3 py-1.5 rounded-full text-[13px] font-semibold text-white bg-[#d62828]">
                          Guardar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-white/90 text-[13.5px] mt-0.5">
                      {c.text}
                      {c.edited && <span className="text-white/50 text-[12px]"> · Editado</span>}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Caja de comentario */}
      <div className="relative px-4 py-3 flex items-center gap-2 flex-none">
        <input
          aria-label="Escribe un comentario"
          placeholder={`Comenta como ${profile.name}...`}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendComment()}
          className="flex-1 bg-[var(--surface)]/15 border border-white/25 rounded-full px-4 py-2.5 text-[15px] text-white placeholder:text-white/50 outline-none focus:bg-[var(--surface)]/25"
        />
        <button
          onClick={sendComment}
          disabled={!comment.trim()}
          aria-label="Enviar comentario"
          className="w-11 h-11 rounded-full bg-[#d62828] text-white flex items-center justify-center disabled:opacity-40 flex-none"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>

      {/* Confirmación de baja lógica (HU15) */}
      {confirmOff && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-6" role="dialog" aria-modal="true">
          <div className="bg-[var(--surface)] w-full max-w-[330px] p-5 rounded-3xl shadow-[var(--shadow-pop)]">
            <h2 className="text-[17px] font-semibold text-[var(--ink)] font-['Space_Grotesk',sans-serif] mb-2">
              Desactivar historia
            </h2>
            <p className="text-[14px] text-[var(--muted)] leading-relaxed mb-5">
              Dejará de mostrarse a tus seguidores. Su registro se conserva para trazabilidad.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmOff(false)}
                className="flex-1 py-2.5 rounded-full text-[14px] font-semibold text-[var(--muted)] bg-[var(--surface-3)] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => { deactivateStory(story.id); setConfirmOff(false); goBack(); }}
                className="flex-1 py-2.5 rounded-full text-[14px] font-semibold text-[var(--on-brand)] bg-[var(--brand)] hover:bg-[var(--brand-strong)] transition-colors"
              >
                Desactivar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
