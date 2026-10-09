import { MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { userMessageOf } from '../lib/http';
import { nextReaction, REACTIONS } from '../lib/reactions';
import type { StoryView } from '../lib/stories-api';
import { useReactToStory } from '../store/stories-queries';

/**
 * HU16 y HU17 · Reaccionar y comentar una historia (spec 0009, decisión 24).
 *
 * En la historia de otra persona hay una fila con las cinco reacciones: tocar
 * una la pone o la cambia, y tocar la que ya tengo la quita. En la propia solo
 * se ve cuántas reacciones tiene (la API no da ese conteo a los demás). El
 * botón de comentarios abre la hoja con el panel; aquí no se pide nada.
 */

function countLabel(count: number): string {
  if (count === 0) return 'Aún sin reacciones';
  return count === 1 ? '1 reacción' : `${count} reacciones`;
}

export function StoryEngagement({
  story,
  isMine,
  commentsOpen,
  onToggleComments,
}: {
  story: StoryView;
  isMine: boolean;
  commentsOpen: boolean;
  onToggleComments: () => void;
}) {
  const react = useReactToStory();

  const choose = (tapped: (typeof REACTIONS)[number]['type']) =>
    react.mutate(
      {
        id: story.id,
        type: nextReaction(story.myReaction, tapped),
        previous: story.myReaction,
      },
      { onError: (error) => toast.error(userMessageOf(error)) },
    );

  return (
    <div className="relative px-3 pb-2 flex items-center justify-between gap-2">
      {isMine ? (
        <p className="text-white/80 text-[13px]" data-testid="story-reactions">
          {countLabel(story.reactionCount ?? 0)}
        </p>
      ) : (
        <div
          role="group"
          aria-label="Reaccionar a la historia"
          className="flex gap-1"
        >
          {REACTIONS.map((reaction) => (
            <button
              key={reaction.type}
              type="button"
              onClick={() => choose(reaction.type)}
              disabled={react.isPending}
              aria-label={reaction.label}
              aria-pressed={story.myReaction === reaction.type}
              className={
                'w-9 h-9 rounded-full flex items-center justify-center text-[19px] leading-none transition-transform hover:scale-110 disabled:opacity-60 ' +
                (story.myReaction === reaction.type
                  ? 'bg-white/25 ring-2 ring-white'
                  : 'hover:bg-white/15')
              }
            >
              <span aria-hidden="true">{reaction.emoji}</span>
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onToggleComments}
        aria-expanded={commentsOpen}
        className="h-9 px-3 rounded-full flex items-center gap-1.5 text-white/90 text-[13px] hover:bg-white/15 transition-colors"
      >
        <MessageCircle className="w-[18px] h-[18px]" aria-hidden="true" />
        Comentarios ({story.commentCount})
      </button>
    </div>
  );
}
