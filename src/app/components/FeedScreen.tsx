import React, { useState, useRef, useEffect } from 'react';
import { Bell, Heart, MessageSquare, Search, X } from 'lucide-react';
import { Link } from 'react-router';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { CafetaAppIcon } from './Logo';
import { PostCard } from './PostCard';
import { StoriesStrip } from './StoriesStrip';
import { useAppState } from '../store/AppState';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const CAREERS = ["Todas", "Ing. Software", "Ing. Industrial", "Ing. Civil", "Medicina", "Adm. Empresas"];

const AVATARS = [
  "https://images.unsplash.com/photo-1611695434369-a8f5d76ceb7b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx5b3VuZyUyMG1hbiUyMHNtaWxlJTIwcG9ydHJhaXR8ZW58MXx8fHwxNzczODg2OTQ3fDA&ixlib=rb-4.1.0&q=80&w=1080",
  "https://images.unsplash.com/photo-1557353425-09253747c2bf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx5b3VuZyUyMG1hbiUyMHNtaWxlJTIwcG9ydHJhaXR8ZW58MXx8fHwxNzczODg2OTQ3fDA&ixlib=rb-4.1.0&q=80&w=1080",
  "https://images.unsplash.com/photo-1570078070514-1f84a3cf1736?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx1bml2ZXJzaXR5JTIwc3R1ZGVudCUyMGhpc3BhbmljfGVufDF8fHx8MTc3Mzg4Njk0Nnww&ixlib=rb-4.1.0&q=80&w=1080"
];

export function FeedScreen({ filter = "Todas" }: { filter?: string }) {
  const isSoftware = filter === "Ing. Software";
  const { posts: allPosts, isBlocked } = useAppState();

  // El feed solo muestra publicaciones activas (HU23: las desactivadas
  // desaparecen para todos y quedan visibles solo en el perfil del autor) y
  // omite a los usuarios bloqueados (HU53).
  const posts = allPosts.filter(
    (p) => p.active && !isBlocked(p.authorId) && (filter === "Todas" || p.career === filter),
  );

  const [showHeader, setShowHeader] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Notificaciones de solicitudes de seguimiento
  const followRequests = [
    {
      id: 1,
      user: 'Ana Martínez',
      avatar: AVATARS[0],
      career: 'Medicina',
      time: '5m',
      mutualFriends: 3
    },
    {
      id: 2,
      user: 'Pedro Sánchez',
      avatar: AVATARS[1],
      career: 'Ing. Civil',
      time: '1h',
      mutualFriends: 8
    }
  ];

  // Sugerencias de publicaciones
  const postSuggestions = [
    {
      id: 1,
      user: 'Laura Fernández',
      avatar: AVATARS[2],
      career: 'Administración',
      content: 'Tips para el examen final de Contabilidad 💼',
      time: '30m'
    },
    {
      id: 2,
      user: 'Roberto Díaz',
      avatar: AVATARS[0],
      career: 'Ing. Software',
      content: 'Nueva biblioteca de React que están usando en las empresas tech 🚀',
      time: '2h'
    }
  ];

  // La marca y los accesos se recogen al bajar y vuelven al subir, para que la
  // lectura del feed gane alto; las pestañas de carrera se quedan siempre.
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const currentScrollY = container.scrollTop;

      if (currentScrollY <= 10) {
        setShowHeader(true);
      } else if (currentScrollY > lastScrollY + 4) {
        setShowHeader(false);
      } else if (currentScrollY < lastScrollY - 4) {
        setShowHeader(true);
      }

      setLastScrollY(currentScrollY);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  /** Abrir un panel devuelve la cabecera a su sitio: cuelga de ella. */
  const openPanel = (panel: 'notifications' | 'suggestions') => {
    setShowHeader(true);
    setShowNotifications(panel === 'notifications' ? !showNotifications : false);
    setShowSuggestions(panel === 'suggestions' ? !showSuggestions : false);
  };

  const closePanels = () => {
    setShowNotifications(false);
    setShowSuggestions(false);
  };

  const panelCard = 'absolute top-full left-4 right-4 mt-2 bg-[var(--surface)] rounded-2xl shadow-[var(--shadow-pop)] border border-[var(--line)] overflow-hidden z-50';

  return (
    <div
      ref={scrollContainerRef}
      className="w-full h-full bg-[var(--surface)] pb-[100px] overflow-y-auto no-scrollbar relative"
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
          <div className="flex items-center gap-2">
            <CafetaAppIcon size={30} tone="red" radius={10} />
            <span className="font-['Space_Grotesk',sans-serif] font-bold text-[20px] text-[var(--ink)] tracking-[-0.045em] lowercase">cafeta</span>
          </div>
          <div className="flex items-center gap-4">
            {/* Entrada a la búsqueda global (DEF-07 · HU41/HU42) */}
            <Link to="/search" aria-label="Buscar">
              <Search className="w-[22px] h-[22px] text-[var(--ink)]" strokeWidth={2} />
            </Link>
            <button onClick={() => openPanel('notifications')} aria-label="Solicitudes de seguimiento" className="relative">
              <Bell className="w-[22px] h-[22px] text-[var(--ink)]" strokeWidth={2} />
              <span className="absolute -top-0.5 -right-0.5 w-[9px] h-[9px] bg-[var(--brand)] rounded-full border-2 border-[var(--surface)]" />
            </button>
            <button onClick={() => openPanel('suggestions')} aria-label="Sugerencias para ti">
              <Heart className="w-[22px] h-[22px] text-[var(--ink)]" strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Filtro por carrera (HU11): pestañas, para que se lea como una sola
            línea de tiempo con secciones y no como etiquetas sueltas. */}
        <div className="px-1 flex gap-1 overflow-x-auto no-scrollbar border-b border-[var(--line-soft)]">
          {CAREERS.map((c) => {
            const active = isSoftware ? c === "Ing. Software" : c === filter;
            return (
              <Link
                to={c === "Ing. Software" ? "/home/software" : "/home"}
                key={c}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  "relative px-3.5 py-3 text-[14px] whitespace-nowrap transition-colors",
                  active ? "text-[var(--ink)] font-bold" : "text-[var(--muted)] font-medium hover:text-[var(--ink-2)]"
                )}
              >
                {c === 'Todas' ? 'Para ti' : c}
                {active && <span className="absolute left-3 right-3 bottom-0 h-[3px] rounded-full bg-[var(--brand)]" />}
              </Link>
            );
          })}
        </div>

        {/* Paneles: cuelgan de la cabecera visible, no de la parte superior del
            contenido, para que sigan a la vista aunque se haya bajado. */}
        {showNotifications && (
          <div className={panelCard} onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-[var(--line-soft)] flex items-center justify-between">
              <h3 className="font-['Space_Grotesk',sans-serif] font-bold text-[16px] text-[var(--ink)]">
                Solicitudes de seguimiento
              </h3>
              <button onClick={closePanels} aria-label="Cerrar solicitudes">
                <X className="w-5 h-5 text-[var(--muted)]" />
              </button>
            </div>
            <div className="max-h-[360px] overflow-y-auto">
              {followRequests.map((request) => (
                <div key={request.id} className="px-4 py-3 border-b border-[var(--line-soft)] last:border-0">
                  <div className="flex items-start gap-3">
                    <img src={request.avatar} className="w-12 h-12 rounded-full object-cover" alt={request.user} />
                    <div className="flex-1">
                      <p className="font-semibold text-[14px] text-[var(--ink)]">{request.user}</p>
                      <p className="text-[12px] text-[var(--muted)]">{request.career} · {request.mutualFriends} amigos en común</p>
                      <p className="text-[11px] text-[var(--muted)] mt-1">{request.time}</p>
                      <div className="flex gap-2 mt-3">
                        <button className="flex-1 bg-[var(--brand)] text-[var(--on-brand)] py-2 rounded-lg text-[13px] font-semibold hover:bg-[var(--brand-strong)] transition-colors">
                          Aceptar
                        </button>
                        <button className="flex-1 bg-[var(--surface-3)] text-[var(--muted)] py-2 rounded-lg text-[13px] font-semibold transition-colors">
                          Rechazar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
            <div className="max-h-[360px] overflow-y-auto">
              {postSuggestions.map((suggestion) => (
                <div key={suggestion.id} className="px-4 py-3 border-b border-[var(--line-soft)] last:border-0">
                  <div className="flex items-start gap-3">
                    <img src={suggestion.avatar} className="w-12 h-12 rounded-full object-cover" alt={suggestion.user} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-[14px] text-[var(--ink)]">{suggestion.user}</p>
                        <p className="text-[11px] text-[var(--muted)]">{suggestion.time}</p>
                      </div>
                      <p className="text-[12px] text-[var(--muted)] mb-2">{suggestion.career}</p>
                      <p className="text-[13px] text-[var(--ink)] leading-relaxed">{suggestion.content}</p>
                      <div className="flex items-center gap-4 mt-3">
                        <button className="flex items-center gap-1.5 text-[var(--brand)]">
                          <Heart className="w-4 h-4" />
                          <span className="text-[12px] font-medium">Me gusta</span>
                        </button>
                        <button className="flex items-center gap-1.5 text-[var(--muted)]">
                          <MessageSquare className="w-4 h-4" />
                          <span className="text-[12px] font-medium">Comentar</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Velo para cerrar los paneles tocando fuera. Va dentro del marco, así
          que se recorta con él en vez de cubrir toda la ventana. */}
      {(showNotifications || showSuggestions) && (
        <div className="absolute inset-0 bg-black/40 z-30" onClick={closePanels} />
      )}

      {isSoftware && (
        <p className="px-4 py-2.5 text-[12px] text-[var(--muted)] border-b border-[var(--line-soft)]">
          {posts.length} {posts.length === 1 ? 'publicación' : 'publicaciones'} en Ing. Software
        </p>
      )}

      {/* Historias vigentes (DEF-04 · FT04) */}
      <div className="border-b border-[var(--line-soft)]">
        <StoriesStrip />
      </div>

      {/* Publicaciones (DEF-09) — el menú de autor vive en <PostCard /> */}
      <div>
        {posts.length === 0 ? (
          <div className="bg-[var(--surface)] px-5 py-10 text-center">
            <p className="font-['Space_Grotesk',sans-serif] font-bold text-[15px] text-[var(--ink)] mb-1">
              Todavía no hay publicaciones
            </p>
            <p className="text-[13px] text-[var(--muted)] leading-relaxed">
              {isSoftware
                ? 'Nadie ha publicado en Ing. Software por ahora. ¡Sé el primero!'
                : 'Cuando publiques algo, aparecerá aquí.'}
            </p>
          </div>
        ) : (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </div>
    </div>
  );
}
