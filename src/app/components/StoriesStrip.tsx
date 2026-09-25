import React from 'react';
import { Link, useLocation } from 'react-router';
import { useAppState, CURRENT_USER_ID } from '../store/AppState';
import { visibleStories } from '../lib/stories';
import { MyStoryAvatar } from './MyStoryAvatar';

/**
 * DEF-04 · HU13 — Tira de historias del feed.
 *
 * Muestra las historias vigentes de quienes el usuario sigue (HU13). Cuando no
 * hay ninguna de terceros se explica por qué, en vez de dejar un hueco.
 *
 * Lo propio no ocupa un círculo aparte: vive en el avatar de siempre (ver
 * MyStoryAvatar), que abre las historias propias o lleva a publicar según dónde
 * se toque. Tener dos círculos con la misma cara se leía como un duplicado.
 */
export function StoriesStrip() {
  const { stories, followingIds } = useAppState();
  const { pathname: from } = useLocation();
  const visibles = visibleStories(stories, { currentUserId: CURRENT_USER_ID, followingIds });
  const others = visibles.filter((s) => s.authorId !== CURRENT_USER_ID);
  const hasMine = visibles.some((s) => s.authorId === CURRENT_USER_ID);

  return (
    <div className="px-4 py-3 flex gap-3.5 overflow-x-auto no-scrollbar">
      {/* Tu historia: publicar (HU12) y, si ya hay una, verla (HU13) */}
      <div className="flex flex-col items-center gap-1.5 min-w-[68px]">
        <MyStoryAvatar size={62} />
        <span className="text-[11px] text-[var(--muted)] font-medium">Tu historia</span>
      </div>

      {others.length === 0 ? (
        <p className="self-center text-[12px] text-[var(--muted)] leading-snug max-w-[220px]">
          Sigue a alguien en <span className="font-semibold text-[var(--ink-2)]">Descubrir</span> para ver sus historias
          {hasMine ? '.' : ', o publica la tuya.'}
        </p>
      ) : (
        others.map((story) => (
          <Link
            key={story.id}
            to={`/stories/${story.id}`}
            state={{ from }}
            className="flex flex-col items-center gap-1.5 min-w-[68px]"
            aria-label={`Ver historia de ${story.authorName}`}
          >
            {/* Anillo de historia vigente */}
            <div className="w-[62px] h-[62px] rounded-full p-[2.5px]" style={{ background: 'var(--story-ring)' }}>
              <img
                src={story.authorAvatar}
                className="w-full h-full rounded-full object-cover border-2 border-[var(--surface)]"
                alt=""
              />
            </div>
            <span className="text-[11px] text-[var(--ink)] font-medium truncate w-[64px] text-center">
              {story.authorName.split(' ')[0]}
            </span>
          </Link>
        ))
      )}
    </div>
  );
}
