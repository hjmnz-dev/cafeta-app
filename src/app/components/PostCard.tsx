import { useState } from 'react';
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  FileText,
  Calendar,
  Code,
  Users,
  MoreHorizontal,
  Pencil,
  Eye,
  EyeOff,
  Trash2,
  X,
  MapPin,
  Flag,
  Ban,
  Check,
} from 'lucide-react';
import { useAppState, Post } from '../store/AppState';
import { ReportDialog } from './ReportDialog';

/**
 * DEF-09 · HU21/HU22/HU23 — Tarjeta de publicación.
 *
 * Es la única representación de una publicación en la app (feed, perfil y
 * búsqueda), para que el menú de autor (editar · desactivar · eliminar) se
 * comporte igual en todos lados. Las acciones solo se ofrecen sobre
 * publicaciones propias; la validación de autoría real vive en el store.
 *
 * Forma: fila de línea de tiempo al estilo Twitter —avatar a la izquierda,
 * nombre y tiempo en una línea, texto pegado y separadores en vez de tarjetas—
 * porque el contenido dominante son preguntas y avisos de clase. Lo visual
 * (imágenes a sangre, corazón que se llena) toma el lenguaje de Instagram,
 * que es donde la app se juega el "darse a conocer".
 */

/** Resalta palabras clave sin permitir HTML del contenido (evita inyección). */
function highlight(snippet: string) {
  return snippet
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(
      /function|let|for|if|return/g,
      '<span class="text-[var(--brand)]">$&</span>',
    )
    .replace(/\barr\b|\bmax\b|\bi\b/g, '<span class="text-sky-400">$&</span>');
}

/** Cuenta compacta al estilo de una línea de tiempo: 1.2k en vez de 1204. */
function compact(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1).replace('.0', '')}k` : String(n);
}

export function PostCard({ post }: { post: Post }) {
  const {
    isOwnPost,
    editPost,
    deactivatePost,
    reactivatePost,
    deletePost,
    togglePostReaction,
    blockUser,
    reportPost,
    hasReported,
  } = useAppState();
  const own = isOwnPost(post.id);

  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(post.content);
  const [confirming, setConfirming] = useState<null | 'deactivate' | 'delete'>(
    null,
  );
  const [reporting, setReporting] = useState(false);
  const reported = hasReported('post', post.id);

  const startEdit = () => {
    setDraft(post.content);
    setEditing(true);
    setMenuOpen(false);
  };

  const saveEdit = () => {
    const content = draft.trim();
    if (!content) return;
    editPost(post.id, content);
    setEditing(false);
  };

  const images = post.images ?? [];

  return (
    <article
      data-testid={`post-${post.id}`}
      className="relative bg-[var(--surface)] px-4 py-3.5 border-b border-[var(--line-soft)]"
    >
      <div className="flex gap-3">
        <img
          src={post.authorAvatar}
          className="w-11 h-11 rounded-full object-cover bg-[var(--surface-3)] flex-none"
          alt={post.authorName}
        />

        <div className="flex-1 min-w-0 flex flex-col gap-2">
          {/* Una sola línea de identidad: nombre · carrera · tiempo */}
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-['Space_Grotesk',sans-serif] font-bold text-[15px] text-[var(--ink)] leading-tight">
                  {post.authorName}
                </span>
                <span className="text-[var(--brand)] font-semibold text-[11px] bg-[var(--tint)] px-2 py-0.5 rounded-md">
                  {post.career}
                </span>
                <span className="text-[var(--muted)] text-[12px]">
                  · {post.time}
                  {post.edited && ' · Editado'}
                </span>
                {!post.active && (
                  <span className="text-[var(--muted)] font-semibold text-[11px] bg-[var(--surface-3)] px-2 py-0.5 rounded-md">
                    Desactivada
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={`Opciones de la publicación de ${post.authorName}`}
              aria-expanded={menuOpen}
              className="w-7 h-7 -mr-1 -mt-0.5 flex-none flex items-center justify-center rounded-full hover:bg-[var(--surface-3)] transition-colors"
            >
              <MoreHorizontal className="w-[18px] h-[18px] text-[var(--muted)]" />
            </button>
          </div>

          {/* Contenido */}
          {editing ? (
            <div className="flex flex-col gap-3">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                aria-label="Editar contenido de la publicación"
                maxLength={500}
                className="w-full min-h-[100px] bg-[var(--surface-2)] border border-[var(--line)] rounded-[16px] p-3 text-[15px] text-[var(--ink)] leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
              />
              <div className="flex items-center justify-end gap-2">
                <span className="mr-auto text-[12px] text-[var(--muted)]">
                  {draft.length}/500
                </span>
                <button
                  onClick={() => setEditing(false)}
                  className="px-4 py-2 rounded-full text-[13px] font-semibold text-[var(--muted)] bg-[var(--surface-3)] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveEdit}
                  disabled={!draft.trim()}
                  className="px-5 py-2 rounded-full text-[13px] font-semibold text-[var(--on-brand)] bg-[var(--brand)] hover:bg-[var(--brand-strong)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Guardar
                </button>
              </div>
            </div>
          ) : (
            post.content && (
              <p className="text-[var(--ink)] text-[15px] leading-[1.45] whitespace-pre-wrap break-words">
                {post.content}
              </p>
            )
          )}

          {post.location && (
            <div className="flex items-center gap-1.5 text-[var(--muted)]">
              <MapPin className="w-[14px] h-[14px]" />
              <span className="text-[12px] font-medium">{post.location}</span>
            </div>
          )}

          {/* Imágenes: marco único a sangre, como en Instagram */}
          {images.length > 0 && (
            <div
              className={
                'rounded-[18px] overflow-hidden border border-[var(--line-soft)] ' +
                (images.length === 1 ? '' : 'grid grid-cols-2 gap-[2px]')
              }
            >
              {images.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt={'Imagen ' + (i + 1) + ' de la publicación'}
                  className={
                    'w-full object-cover bg-[var(--surface-3)] ' +
                    (images.length === 1 ? 'max-h-[440px]' : 'aspect-square')
                  }
                />
              ))}
            </div>
          )}

          {/* Adjuntos por tipo de publicación (HU21) */}
          {post.type === 'pdf' && (
            <div className="bg-[var(--surface-2)] border border-[var(--line)] rounded-[16px] p-3 flex items-center gap-3">
              <div className="w-11 h-11 bg-[var(--tint)] rounded-[12px] flex items-center justify-center text-[var(--brand)] flex-none">
                <FileText className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[13px] text-[var(--ink)] truncate">
                  {post.resourceTitle}
                </p>
                <p className="text-[var(--muted)] text-[11px]">
                  {post.resourceSize} • PDF
                </p>
              </div>
              <button
                className="w-8 h-8 bg-[var(--surface)] border border-[var(--line)] rounded-full flex items-center justify-center flex-none"
                aria-label="Descargar recurso"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--brand)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </button>
            </div>
          )}

          {post.type === 'event' && (
            <div className="rounded-[16px] p-4 flex flex-col gap-2.5 relative overflow-hidden bg-[#1b1413] border border-white/10">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--brand)] rounded-full blur-[40px] opacity-25 -mr-10 -mt-10" />
              <div className="flex items-center gap-2 relative">
                <Calendar className="w-4 h-4 text-[var(--brand-bright)]" />
                <span className="text-white font-semibold text-[13px]">
                  {post.eventDate}
                </span>
              </div>
              <div className="flex items-center gap-2 relative">
                <span className="w-1 h-1 bg-[var(--surface)]/40 rounded-full" />
                <span className="text-white/70 text-[13px]">
                  {post.eventLocation}
                </span>
              </div>
              <button className="relative w-full bg-[var(--brand)] text-[var(--on-brand)] rounded-xl py-2.5 text-[13px] font-semibold mt-1">
                Confirmar asistencia
              </button>
            </div>
          )}

          {post.type === 'code' && post.codeSnippet && (
            <div className="rounded-[16px] p-4 text-[12.5px] font-mono overflow-x-auto relative bg-[#15100f] border border-white/10">
              <div className="absolute top-3 right-3">
                <Code className="w-4 h-4 text-white/40" />
              </div>
              <pre className="text-white/80">
                <code
                  dangerouslySetInnerHTML={{
                    __html: highlight(post.codeSnippet),
                  }}
                />
              </pre>
            </div>
          )}

          {post.type === 'study-group' && (
            <div className="bg-[var(--tint)] border border-[var(--brand)]/25 rounded-[16px] p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 bg-[var(--surface)] rounded-[12px] flex items-center justify-center text-[var(--brand)] flex-none">
                  <Users className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-['Space_Grotesk',sans-serif] font-bold text-[14px] text-[var(--ink)] truncate">
                    {post.groupName}
                  </p>
                  <p className="text-[var(--brand)] font-medium text-[11px]">
                    {post.spotsAvailable} cupos disponibles
                  </p>
                </div>
              </div>
              <button className="bg-[var(--brand)] text-[var(--on-brand)] px-4 py-2 rounded-full text-[12px] font-semibold flex-none">
                Unirme
              </button>
            </div>
          )}

          {/* Interacciones (se conservan al editar, HU22) */}
          <div className="flex items-center justify-between pt-1 -ml-1.5">
            <div className="flex items-center gap-1">
              <button
                className="flex items-center gap-1.5 px-1.5 py-1 rounded-full group"
                aria-label="Comentar"
              >
                <MessageCircle className="w-[19px] h-[19px] text-[var(--muted)] group-hover:text-[var(--brand)] transition-colors" />
                <span className="text-[var(--muted)] text-[13px] font-medium">
                  {compact(post.comments)}
                </span>
              </button>

              {/* HU28 — Reaccionar: la marca propia se distingue del conteo total */}
              <button
                onClick={() => togglePostReaction(post.id)}
                aria-label={post.liked ? 'Quitar reacción' : 'Me gusta'}
                aria-pressed={Boolean(post.liked)}
                className="flex items-center gap-1.5 px-1.5 py-1 rounded-full group"
              >
                <Heart
                  className={
                    'w-[19px] h-[19px] transition-all ' +
                    (post.liked
                      ? 'text-[var(--brand)] fill-[var(--brand)] scale-110'
                      : 'text-[var(--muted)] group-hover:text-[var(--brand)]')
                  }
                />
                <span
                  className={
                    'text-[13px] font-medium ' +
                    (post.liked ? 'text-[var(--brand)]' : 'text-[var(--muted)]')
                  }
                >
                  {compact(post.likes)}
                </span>
              </button>

              <button
                className="flex items-center px-1.5 py-1 rounded-full group"
                aria-label="Compartir"
              >
                <Share2 className="w-[18px] h-[18px] text-[var(--muted)] group-hover:text-[var(--ink)] transition-colors" />
              </button>
            </div>

            <button
              className="group px-1.5 py-1"
              aria-label="Guardar en marcadores"
            >
              <Bookmark className="w-[18px] h-[18px] text-[var(--muted)] group-hover:text-[var(--brand)] transition-colors" />
            </button>
          </div>
        </div>
      </div>

      {/* Menú: acciones de autor (HU22/HU23) o de moderación (HU53/HU56) */}
      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute top-12 right-4 z-50 bg-[var(--surface)] rounded-2xl shadow-[var(--shadow-pop)] border border-[var(--line)] overflow-hidden w-[210px]">
            {!own && (
              <>
                <button
                  onClick={() => {
                    setReporting(true);
                    setMenuOpen(false);
                  }}
                  disabled={reported}
                  className="w-full px-4 py-3 flex items-center gap-3 text-[14px] text-[var(--ink)] hover:bg-[var(--surface-2)] transition-colors disabled:text-[var(--muted)]"
                >
                  {reported ? (
                    <Check className="w-4 h-4 text-[var(--muted)]" />
                  ) : (
                    <Flag className="w-4 h-4 text-[var(--muted)]" />
                  )}
                  {reported ? 'Publicación reportada' : 'Reportar publicación'}
                </button>
                <button
                  onClick={() => {
                    blockUser(post.authorId);
                    setMenuOpen(false);
                  }}
                  className="w-full px-4 py-3 flex items-center gap-3 text-[14px] text-[var(--brand)] hover:bg-[var(--tint)] transition-colors border-t border-[var(--line-soft)]"
                >
                  <Ban className="w-4 h-4" />
                  Bloquear a {post.authorName.split(' ')[0]}
                </button>
              </>
            )}
            {own && (
              <>
                <button
                  onClick={startEdit}
                  className="w-full px-4 py-3 flex items-center gap-3 text-[14px] text-[var(--ink)] hover:bg-[var(--surface-2)] transition-colors"
                >
                  <Pencil className="w-4 h-4 text-[var(--muted)]" />
                  Editar
                </button>
                {post.active ? (
                  <button
                    onClick={() => {
                      setConfirming('deactivate');
                      setMenuOpen(false);
                    }}
                    className="w-full px-4 py-3 flex items-center gap-3 text-[14px] text-[var(--ink)] hover:bg-[var(--surface-2)] transition-colors border-t border-[var(--line-soft)]"
                  >
                    <EyeOff className="w-4 h-4 text-[var(--muted)]" />
                    Desactivar
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      reactivatePost(post.id);
                      setMenuOpen(false);
                    }}
                    className="w-full px-4 py-3 flex items-center gap-3 text-[14px] text-[var(--ink)] hover:bg-[var(--surface-2)] transition-colors border-t border-[var(--line-soft)]"
                  >
                    <Eye className="w-4 h-4 text-[var(--muted)]" />
                    Reactivar
                  </button>
                )}
                <button
                  onClick={() => {
                    setConfirming('delete');
                    setMenuOpen(false);
                  }}
                  className="w-full px-4 py-3 flex items-center gap-3 text-[14px] text-[var(--brand)] hover:bg-[var(--tint)] transition-colors border-t border-[var(--line-soft)]"
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar
                </button>
              </>
            )}
          </div>
        </>
      )}

      {/* HU56 — Reportar publicación */}
      {reporting && (
        <ReportDialog
          title="Reportar publicación"
          subject={`Publicación de ${post.authorName}`}
          onClose={() => setReporting(false)}
          onConfirm={(reason) => {
            reportPost(post.id, reason);
            setReporting(false);
          }}
        />
      )}

      {/* Confirmación — desactivar (baja lógica) o eliminar (permanente) */}
      {confirming && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-6"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-[var(--surface)] w-full max-w-[330px] p-5 rounded-3xl shadow-[var(--shadow-pop)]">
            <div className="flex items-start justify-between mb-2">
              <h2 className="text-[17px] font-semibold text-[var(--ink)] font-['Space_Grotesk',sans-serif]">
                {confirming === 'deactivate'
                  ? 'Desactivar publicación'
                  : 'Eliminar publicación'}
              </h2>
              <button onClick={() => setConfirming(null)} aria-label="Cerrar">
                <X className="w-5 h-5 text-[var(--muted)]" />
              </button>
            </div>
            <p className="text-[14px] text-[var(--muted)] leading-relaxed mb-5">
              {confirming === 'deactivate'
                ? 'Dejará de aparecer en el feed y solo tú la verás en tu perfil. No se borra el contenido.'
                : 'Se borrará de forma permanente junto con sus interacciones. Esta acción no se puede deshacer.'}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirming(null)}
                className="flex-1 py-2.5 rounded-full text-[14px] font-semibold text-[var(--muted)] bg-[var(--surface-3)] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (confirming === 'deactivate') deactivatePost(post.id);
                  else deletePost(post.id);
                  setConfirming(null);
                }}
                className="flex-1 py-2.5 rounded-full text-[14px] font-semibold text-[var(--on-brand)] bg-[var(--brand)] hover:bg-[var(--brand-strong)] transition-colors"
              >
                {confirming === 'deactivate' ? 'Desactivar' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
