import { useRef } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { useArchivedPosts } from '../store/posts-queries';
import { LivePostList } from './LivePostList';

/**
 * Mis publicaciones archivadas y desactivadas (HU21, HU23; spec 0008,
 * funcionalidad 18). Solo las ve su autor; desde la tarjeta se restauran
 * (archivadas) o se reactivan (desactivadas).
 */
export function ArchivedPostsScreen() {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const archived = useArchivedPosts();

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
          Archivadas
        </h1>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto pb-[100px]">
        <LivePostList
          query={archived}
          scrollRootRef={scrollRef}
          empty={
            <div className="px-5 py-10 text-center">
              <p className="font-bold text-[15px] text-[var(--ink)] mb-1">
                No tienes publicaciones archivadas
              </p>
              <p className="text-[13px] text-[var(--muted)] leading-relaxed">
                Archiva una publicación desde su menú para ocultarla de tu
                perfil sin borrarla. Aquí también verás las que desactives.
              </p>
            </div>
          }
        />
      </div>
    </div>
  );
}
