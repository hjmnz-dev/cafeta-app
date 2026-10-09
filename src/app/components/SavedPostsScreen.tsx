import { useRef } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { useSavedPosts } from '../store/posts-queries';
import { LivePostList } from './LivePostList';

/**
 * HU25 · Mis publicaciones guardadas (spec 0009, decisión 19).
 *
 * La misma tarjeta del feed, de la guardada más reciente a la más antigua. Lo
 * que dejó de verse (autor desactivado o con bloqueo, publicación archivada)
 * no sale, y vuelve solo si vuelve a verse. Quitar una la saca de la lista sin
 * tocar la publicación original.
 */
export function SavedPostsScreen() {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const saved = useSavedPosts();

  return (
    <div className="w-full h-full bg-[var(--app-bg)] flex flex-col">
      <div className="h-[60px] flex items-center gap-3 px-4 border-b border-[var(--line)] bg-[var(--surface)] mt-12 flex-none">
        <button
          onClick={() => navigate('/profile')}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[var(--surface-3)] transition-colors"
          aria-label="Volver"
        >
          <ArrowLeft className="w-6 h-6 text-[var(--ink)]" />
        </button>
        <h1 className="text-[17px] font-semibold text-[var(--ink)] font-['Space_Grotesk',sans-serif]">
          Guardados
        </h1>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto pb-[100px]">
        <LivePostList
          query={saved}
          scrollRootRef={scrollRef}
          empty={
            <div className="px-5 py-10 text-center">
              <p className="font-bold text-[15px] text-[var(--ink)] mb-1">
                No tienes publicaciones guardadas
              </p>
              <p className="text-[13px] text-[var(--muted)] leading-relaxed mb-4">
                Toca el marcador de una publicación para guardarla y encontrarla
                aquí.
              </p>
              <button
                onClick={() => navigate('/discover')}
                className="px-5 py-2 rounded-full text-[13px] font-semibold text-[var(--on-brand)] bg-[var(--brand)] hover:bg-[var(--brand-strong)] transition-colors"
              >
                Explorar
              </button>
            </div>
          }
        />
      </div>
    </div>
  );
}
