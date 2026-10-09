import { useRef, useState } from 'react';
import {
  Settings,
  Archive,
  Edit2,
  MapPin,
  Grid,
  Folder,
  Bookmark,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  useAppState,
  TAG_CATEGORIES,
  CURRENT_USER_ID,
} from '../store/AppState';
import { tagCategoryOf } from '../lib/profiles';
import { PostCard } from './PostCard';
import { LivePostList } from './LivePostList';
import { useUserPostCount, useUserPosts } from '../store/posts-queries';
import { useProfile } from '../store/profiles-queries';
import { useSession } from '../store/SessionStore';
import { MyStoryAvatar } from './MyStoryAvatar';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

/** Estado vacío de una pestaña del perfil: dice qué falta y cómo llenarlo. */
function EmptyTab({
  title,
  detail,
  action,
}: {
  title: string;
  detail: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="bg-[var(--surface)] rounded-[22px] px-5 py-10 text-center shadow-[var(--shadow-card)]">
      <p className="font-['Space Grotesk',sans-serif] font-bold text-[15px] text-[var(--ink)] mb-1">
        {title}
      </p>
      <p className="text-[13px] text-[var(--muted)] leading-relaxed mb-4">
        {detail}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-5 py-2.5 rounded-full text-[13px] font-semibold text-[var(--on-brand)] bg-[var(--brand)] hover:bg-[var(--brand-strong)] transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

export function ProfileScreen() {
  const [activeTab, setActiveTab] = useState<'posts' | 'resources' | 'saved'>(
    'posts',
  );
  const navigate = useNavigate();
  const { posts } = useAppState();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Mis publicaciones y su conteo vienen de la API (spec 0005); cabecera,
  // recursos y guardados siguen con AppState hasta sus funcionalidades.
  const { user } = useSession();
  const myLivePosts = useUserPosts(user?.id);
  const postCount = useUserPostCount(user?.id);
  // Seguidores y seguidos reales (decisión 16); tocarlos abre Mi red.
  const myProfile = useProfile(user?.id ?? '', Boolean(user));
  const me = myProfile.data;
  const counts = me?.counts;
  const myPosts = posts.filter((p) => p.authorId === CURRENT_USER_ID);

  // Recursos: publicaciones propias que aportan material de estudio.
  const myResources = myPosts.filter(
    (p) => p.active && (p.type === 'pdf' || p.type === 'study-notes'),
  );

  return (
    <div
      ref={scrollRef}
      className="w-full h-full bg-[var(--app-bg)] pb-[100px] overflow-y-auto"
    >
      {/* Cabecera: sin portada. El banner rojo ocupaba un tercio de la pantalla
          para no decir nada que no esté ya en el perfil; las cifras suben junto
          al avatar, que es donde se leen de un vistazo. */}
      <div className="px-5 pt-14 pb-2 flex items-center justify-between gap-3">
        <p className="text-[var(--brand)] text-[13px] font-semibold truncate">
          {me?.careerName ?? 'INTEC'} · INTEC
        </p>
        <div className="flex items-center flex-none">
          <button
            onClick={() => navigate('/profile/archived')}
            className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--ink)] hover:bg-[var(--surface-3)] transition-colors"
            aria-label="Publicaciones archivadas"
          >
            <Archive className="w-[20px] h-[20px]" />
          </button>
          <button
            onClick={() => navigate('/settings')}
            className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--ink)] hover:bg-[var(--surface-3)] transition-colors"
            aria-label="Configuración"
          >
            <Settings className="w-[20px] h-[20px]" />
          </button>
        </div>
      </div>

      <div className="px-5 pb-6">
        {/* Avatar y cifras, en la misma línea (DEF-08: todas salen del estado
            real salvo los seguidores, que no existen sin backend). */}
        <div className="flex items-center gap-4 mb-4">
          {/* La foto es el acceso a las historias: tocarla las abre, el "+"
              lleva a publicar otra (DEF-04 · HU12/HU13). */}
          <MyStoryAvatar size={78} />
          <div className="flex-1 min-w-0 flex justify-between gap-0.5">
            {[
              {
                testid: 'stat-posts',
                value: postCount.data?.count ?? '–',
                label: 'Publicaciones',
                to: undefined as string | undefined,
              },
              {
                testid: 'stat-followers',
                value: counts?.followers.toLocaleString('es') ?? '–',
                label: 'Seguidores',
                to: '/network?tab=followers',
              },
              {
                testid: 'stat-following',
                value: counts?.following.toLocaleString('es') ?? '–',
                label: 'Siguiendo',
                to: '/network?tab=following',
              },
            ].map((stat) => (
              <button
                key={stat.label}
                type="button"
                onClick={() => stat.to && navigate(stat.to)}
                disabled={!stat.to}
                className="flex-1 flex flex-col items-center gap-0.5 min-w-0 rounded-[10px] enabled:hover:bg-[var(--surface-3)] disabled:cursor-default"
              >
                <span
                  data-testid={stat.testid}
                  className="font-['Space_Grotesk',sans-serif] font-bold text-[17px] text-[var(--ink)]"
                >
                  {stat.value}
                </span>
                <span className="text-[var(--muted)] text-[10px] font-medium whitespace-nowrap">
                  {stat.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Name and Handle */}
        <div className="mb-4">
          <h1 className="font-['Space Grotesk',sans-serif] font-bold text-[24px] text-[var(--ink)] leading-tight mb-1">
            {me?.displayName ?? user?.profile.displayName}
          </h1>
          <p className="text-[var(--muted)] text-[15px] font-medium">
            @{me?.handle ?? user?.profile.handle}
          </p>
        </div>

        {/* Bio — si está vacía se guía en vez de dejar el hueco */}
        {me?.bio?.trim() ? (
          <p className="text-[var(--ink)] text-[15px] leading-relaxed mb-4 break-words">
            {me.bio}
          </p>
        ) : (
          <p className="text-[var(--muted)] text-[15px] italic leading-relaxed mb-4">
            Aún no has escrito una biografía.
          </p>
        )}

        {/* Tags — color por categoría (carrera / habilidad / interés). Ver leyenda abajo. */}
        {me && me.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {me.tags.map((t) => {
              const cat = TAG_CATEGORIES[tagCategoryOf(t.category)];
              return (
                <span
                  key={`${t.category}:${t.label}`}
                  className="px-3 py-1 rounded-full text-[13px] font-semibold border shadow-sm"
                  style={{
                    background: cat.bg,
                    color: cat.text,
                    borderColor: cat.border,
                  }}
                >
                  {t.label}
                </span>
              );
            })}
          </div>
        )}

        {/* Leyenda de categorías (resuelve el significado de los colores) */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-6">
          {(['carrera', 'habilidad', 'interes'] as const).map((c) => (
            <div key={c} className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ background: TAG_CATEGORIES[c].text }}
              />
              <span className="text-[11px] text-[var(--muted)] font-medium">
                {TAG_CATEGORIES[c].label}
              </span>
            </div>
          ))}
        </div>

        {/* Info Icons */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[var(--muted)] text-[13px] font-medium mb-6">
          {me?.location?.trim() && (
            <div className="flex items-center gap-1.5 min-w-0">
              <MapPin className="w-4 h-4 flex-none" />
              <span className="truncate">{me.location}</span>
            </div>
          )}
        </div>

        {/* Editar perfil, a lo ancho: es la acción principal de esta pantalla */}
        <button
          onClick={() => navigate('/profile/edit')}
          className="w-full h-[40px] mb-5 border-2 border-[var(--brand)] text-[var(--brand)] rounded-full font-semibold text-[14px] flex items-center justify-center gap-1.5 hover:bg-[var(--tint)] transition-colors"
        >
          <Edit2 className="w-[14px] h-[14px]" />
          <span>Editar perfil</span>
        </button>

        {/* Tab Bar */}
        <div className="flex w-full border-b border-[var(--line)] mb-4 relative">
          <button
            onClick={() => setActiveTab('posts')}
            className={cn(
              'flex-1 pb-4 flex items-center justify-center gap-2 font-semibold text-[15px] transition-colors relative',
              activeTab === 'posts'
                ? 'text-[var(--brand)]'
                : 'text-[var(--muted)]',
            )}
          >
            <Grid className="w-[18px] h-[18px]" />
            Posts
            {activeTab === 'posts' && (
              <div className="absolute bottom-0 left-0 w-full h-[3px] bg-[var(--brand)] rounded-t-full shadow-[0_-2px_8px_rgba(214,40,40,0.5)]"></div>
            )}
          </button>

          <button
            onClick={() => setActiveTab('resources')}
            className={cn(
              'flex-1 pb-4 flex items-center justify-center gap-2 font-semibold text-[15px] transition-colors relative',
              activeTab === 'resources'
                ? 'text-[var(--brand)]'
                : 'text-[var(--muted)]',
            )}
          >
            <Folder className="w-[18px] h-[18px]" />
            Recursos
            {activeTab === 'resources' && (
              <div className="absolute bottom-0 left-0 w-full h-[3px] bg-[var(--brand)] rounded-t-full shadow-[0_-2px_8px_rgba(214,40,40,0.5)]"></div>
            )}
          </button>

          <button
            onClick={() => setActiveTab('saved')}
            className={cn(
              'flex-1 pb-4 flex items-center justify-center gap-2 font-semibold text-[15px] transition-colors relative',
              activeTab === 'saved'
                ? 'text-[var(--brand)]'
                : 'text-[var(--muted)]',
            )}
          >
            <Bookmark className="w-[18px] h-[18px]" />
            Guardados
            {activeTab === 'saved' && (
              <div className="absolute bottom-0 left-0 w-full h-[3px] bg-[var(--brand)] rounded-t-full shadow-[0_-2px_8px_rgba(214,40,40,0.5)]"></div>
            )}
          </button>
        </div>

        {/* Publicaciones propias, de la API (spec 0005) */}
        {activeTab === 'posts' && (
          <div className="-mx-5 border-t border-[var(--line-soft)]">
            <LivePostList
              query={myLivePosts}
              scrollRootRef={scrollRef}
              empty={
                <div className="px-5">
                  <EmptyTab
                    title="Aún no has publicado nada"
                    detail="Comparte apuntes, dudas o eventos con tu carrera."
                    action={{
                      label: 'Crear publicación',
                      onClick: () => navigate('/create-post'),
                    }}
                  />
                </div>
              }
            />
          </div>
        )}

        {/* Recursos: material propio real (PDF y apuntes), no fotos de relleno */}
        {activeTab === 'resources' &&
          (myResources.length === 0 ? (
            <EmptyTab
              title="No has compartido recursos"
              detail="Los apuntes y PDF que publiques aparecerán aquí."
              action={{
                label: 'Compartir un recurso',
                onClick: () => navigate('/create-post'),
              }}
            />
          ) : (
            <div className="-mx-5 border-t border-[var(--line-soft)]">
              {myResources.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          ))}

        {/* Guardados: sin marcadores todavía; se dice, en vez de rellenar */}
        {activeTab === 'saved' && (
          <EmptyTab
            title="No tienes publicaciones guardadas"
            detail="Usa el marcador de una publicación para guardarla y encontrarla aquí."
          />
        )}
      </div>
    </div>
  );
}
