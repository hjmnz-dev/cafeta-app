import { useState, useRef, useEffect } from 'react';
import { Heart, Loader2, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { userMessageOf } from '../lib/http';
import { Link, useSearchParams } from 'react-router';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { CafetaAppIcon } from './Logo';
import { LivePostList } from './LivePostList';
import { StoriesStrip } from './StoriesStrip';
import {
  headerAfterScroll,
  HEADER_SETTLE_MS,
  INITIAL_HEADER_SCROLL,
  type HeaderScroll,
} from '../lib/header-scroll';
import { orderCareerTabs } from '../lib/posts';
import { useCareers, useFeed } from '../store/posts-queries';
import { useExplorePosts } from '../store/search-queries';
import { useSession } from '../store/SessionStore';
import { useStoryTray } from '../store/stories-queries';
import { NotificationsBell } from './NotificationsBell';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

/**
 * Feed (spec 0005): "Para ti" y una pestaña por carrera, con la elegida en la
 * dirección (`/home?carrera=<id>`) para que sobreviva a recargar y a volver.
 */
export function FeedScreen() {
  const { user } = useSession();
  const [params] = useSearchParams();
  const careers = useCareers();
  const tabs = orderCareerTabs(
    careers.data ?? [],
    user?.profile.careerId ?? null,
  );
  const requested = params.get('carrera');
  // Ausente o fuera de la lista: "Para ti". Mientras llega la lista, se espera
  // para no pedir "Para ti" de más.
  const selected = tabs.find((c) => c.id === requested) ?? null;
  const feed = useFeed(
    selected?.id ?? null,
    requested === null || !careers.isPending,
  );

  const [showHeader, setShowHeader] = useState(true);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLAnchorElement>(null);

  // Al abrir /home?carrera=<id> la pestaña puede quedar fuera de la fila:
  // se trae a la vista (depende de que la lista ya esté para encontrarla).
  const selectedId = selected?.id ?? null;
  useEffect(() => {
    activeTabRef.current?.scrollIntoView?.({
      block: 'nearest',
      inline: 'center',
    });
  }, [selectedId]);

  // Bug 1035: lo que "Podría gustarte" son publicaciones reales de otras
  // personas (las de explorar), con reaccionar y comentar de verdad.
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const suggestions = useExplorePosts(showSuggestions);

  // La marca y los accesos se recogen al bajar y vuelven al subir, para que la
  // lectura del feed gane alto; las pestañas de carrera se quedan siempre.
  // Bug 1053: la decisión vive en headerAfterScroll (umbral, ancla y una
  // pausa tras cada cambio) y el estado del scroll en un ref, para no volver
  // a suscribirse en cada evento.
  const headerScroll = useRef<HeaderScroll>(INITIAL_HEADER_SCROLL);
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const next = headerAfterScroll(
        headerScroll.current,
        container.scrollTop,
        performance.now(),
      );
      headerScroll.current = next;
      setShowHeader(next.shown);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  /** Abrir un panel devuelve la cabecera a su sitio: cuelga de ella. */
  const openPanel = () => {
    headerScroll.current = {
      ...headerScroll.current,
      shown: true,
      settledAt: performance.now() + HEADER_SETTLE_MS,
    };
    setShowHeader(true);
    setShowSuggestions(!showSuggestions);
  };

  const closePanels = () => setShowSuggestions(false);

  // Bug 1070: tocar la marca vuelve arriba y actualiza el feed y las
  // historias, con aviso mientras carga y si falla (lo ya cargado se queda).
  const tray = useStoryTray();
  const [refreshing, setRefreshing] = useState(false);
  const refresh = async () => {
    if (refreshing) return;
    scrollContainerRef.current?.scrollTo?.({ top: 0, behavior: 'smooth' });
    setRefreshing(true);
    const [posts, stories] = await Promise.all([
      feed.refetch(),
      tray.refetch(),
    ]);
    setRefreshing(false);
    const error = posts.error ?? stories.error;
    if (error) toast.error(userMessageOf(error));
    else toast.success('Feed actualizado');
  };

  const panelCard =
    'absolute top-full left-4 right-4 mt-2 bg-[var(--surface)] rounded-2xl shadow-[var(--shadow-pop)] border border-[var(--line)] overflow-hidden z-50';

  return (
    <div
      ref={scrollContainerRef}
      className="w-full h-full bg-[var(--surface)] pb-[100px] overflow-y-auto no-scrollbar relative [overflow-anchor:none]"
    >
      {/*
        Cabecera pegajosa DENTRO del contenedor con scroll: antes iba `fixed`
        contra la ventana, así que se salía del marco redondeado del teléfono.
        Aquí la recorta el marco y además acompaña al scroll.
      */}
      <header className="sticky top-0 z-40 bg-[var(--surface)]/95 backdrop-blur-md">
        {/* Hueco de la barra de estado del marco, que va por encima (z-50) */}
        <div className="h-12" />

        <div
          className={cn(
            'px-4 flex items-center justify-between overflow-hidden transition-all duration-300 ease-out',
            showHeader ? 'h-[52px] opacity-100' : 'h-0 opacity-0',
          )}
        >
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={refreshing}
            aria-label={
              refreshing ? 'Actualizando el feed' : 'Actualizar el feed'
            }
            aria-busy={refreshing}
            className="flex items-center gap-2 rounded-xl"
          >
            {refreshing ? (
              <span className="w-[30px] h-[30px] flex items-center justify-center">
                <Loader2
                  data-testid="feed-refreshing"
                  className="w-6 h-6 text-[var(--brand)] animate-spin"
                  aria-hidden="true"
                />
              </span>
            ) : (
              <CafetaAppIcon size={30} tone="red" radius={10} />
            )}
            <span className="font-['Space_Grotesk',sans-serif] font-bold text-[20px] text-[var(--ink)] tracking-[-0.045em] lowercase">
              cafeta
            </span>
          </button>
          <div className="flex items-center gap-4">
            {/* Entrada a la búsqueda global (DEF-07 · HU41/HU42) */}
            <Link to="/search" aria-label="Buscar">
              <Search
                className="w-[22px] h-[22px] text-[var(--ink)]"
                strokeWidth={2}
              />
            </Link>
            <NotificationsBell />
            <button onClick={openPanel} aria-label="Sugerencias para ti">
              <Heart
                className="w-[22px] h-[22px] text-[var(--ink)]"
                strokeWidth={2}
              />
            </button>
          </div>
        </div>

        {/* Filtro por carrera (HU11): pestañas, para que se lea como una sola
            línea de tiempo con secciones y no como etiquetas sueltas. */}
        <div className="px-1 flex gap-1 overflow-x-auto no-scrollbar border-b border-[var(--line-soft)]">
          {[{ id: null, name: 'Para ti' }, ...tabs].map((c) => {
            const active = c.id === selectedId;
            return (
              <Link
                to={c.id ? `/home?carrera=${c.id}` : '/home'}
                key={c.id ?? 'para-ti'}
                ref={active ? activeTabRef : undefined}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative px-3.5 py-3 text-[14px] whitespace-nowrap transition-colors',
                  active
                    ? 'text-[var(--ink)] font-bold'
                    : 'text-[var(--muted)] font-medium hover:text-[var(--ink-2)]',
                )}
              >
                {c.name}
                {active && (
                  <span className="absolute left-3 right-3 bottom-0 h-[3px] rounded-full bg-[var(--brand)]" />
                )}
              </Link>
            );
          })}
        </div>

        {/* Paneles: cuelgan de la cabecera visible, no de la parte superior del
            contenido, para que sigan a la vista aunque se haya bajado. */}
        {showSuggestions && (
          <div className={panelCard} onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-[var(--line-soft)] flex items-center justify-between">
              <h3 className="font-['Space_Grotesk',sans-serif] font-bold text-[16px] text-[var(--ink)]">
                Podría gustarte
              </h3>
              <button onClick={closePanels} aria-label="Cerrar sugerencias">
                <X className="w-5 h-5 text-[var(--muted)]" />
              </button>
            </div>
            <div ref={suggestionsRef} className="max-h-[420px] overflow-y-auto">
              <LivePostList
                query={suggestions}
                scrollRootRef={suggestionsRef}
                empty={
                  <p className="px-4 py-6 text-center text-[14px] text-[var(--muted)]">
                    Aún no hay publicaciones de otras personas para sugerirte.
                  </p>
                }
              />
            </div>
          </div>
        )}
      </header>

      {/* Velo para cerrar los paneles tocando fuera. Va dentro del marco, así
          que se recorta con él en vez de cubrir toda la ventana. */}
      {showSuggestions && (
        <div
          className="absolute inset-0 bg-black/40 z-30"
          onClick={closePanels}
        />
      )}

      {/* Historias vigentes (DEF-04 · FT04) */}
      <div className="border-b border-[var(--line-soft)]">
        <StoriesStrip />
      </div>

      {/* Publicaciones reales (spec 0005) */}
      <div>
        <LivePostList
          query={feed}
          scrollRootRef={scrollContainerRef}
          empty={
            selected ? (
              <EmptyFeed
                title={`Nadie de ${selected.name} ha publicado todavía`}
                detail="Cuando alguien de esta carrera publique, lo verás aquí."
              />
            ) : (
              <EmptyFeed
                title="Tu feed está vacío"
                detail="Sigue a otros estudiantes para ver aquí lo que publican."
                action
              />
            )
          }
        />
      </div>
    </div>
  );
}

function EmptyFeed({
  title,
  detail,
  action = false,
}: {
  title: string;
  detail: string;
  action?: boolean;
}) {
  return (
    <div className="bg-[var(--surface)] px-5 py-10 text-center flex flex-col items-center">
      <p className="font-['Space_Grotesk',sans-serif] font-bold text-[15px] text-[var(--ink)] mb-1">
        {title}
      </p>
      <p className="text-[13px] text-[var(--muted)] leading-relaxed">
        {detail}
      </p>
      {action && (
        <Link
          to="/discover"
          className="mt-4 px-5 py-2 rounded-full text-[13px] font-semibold text-[var(--on-brand)] bg-[var(--brand)] hover:bg-[var(--brand-strong)] transition-colors"
        >
          Descubrir estudiantes
        </Link>
      )}
    </div>
  );
}
