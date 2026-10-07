import { toast } from 'sonner';
import { userMessageOf } from '../lib/http';
import type { PostView } from '../lib/posts-api';
import { toCardPost } from '../lib/posts';
import {
  useDeactivatePost,
  useDeletePost,
  useUpdatePost,
} from '../store/posts-queries';
import { PostCard, type LiveAuthorActions } from './PostCard';

/** Acciones del autor contra la API (spec 0008, decisión 17). */
function useAuthorActions(id: string): LiveAuthorActions {
  const update = useUpdatePost();
  const deactivate = useDeactivatePost();
  const remove = useDeletePost();
  const onError = (error: unknown) => toast.error(userMessageOf(error));
  return {
    edit: async (content) => {
      try {
        await update.mutateAsync({ id, content });
        toast.success('Publicación actualizada.');
        return true;
      } catch (error) {
        onError(error);
        return false;
      }
    },
    deactivate: () =>
      deactivate.mutate(id, {
        onSuccess: () => toast.success('Publicación desactivada.'),
        onError,
      }),
    remove: () =>
      remove.mutate(id, {
        onSuccess: () => toast.success('Publicación eliminada.'),
        onError,
      }),
    busy: update.isPending || deactivate.isPending || remove.isPending,
  };
}

function MyPostCard({ view, now }: { view: PostView; now: Date }) {
  const actions = useAuthorActions(view.id);
  return (
    <PostCard
      post={toCardPost(view, now)}
      live={{
        isMine: true,
        authorId: view.author.id,
        isAnnouncement: view.type === 'ANNOUNCEMENT',
        actions,
      }}
    />
  );
}

/** Una publicación de la API: con menú de autor si es mía. */
export function LivePostCard({
  view,
  now,
  isMine,
}: {
  view: PostView;
  now: Date;
  isMine: boolean;
}) {
  if (isMine) return <MyPostCard view={view} now={now} />;
  return (
    <PostCard
      post={toCardPost(view, now)}
      live={{
        isMine: false,
        authorId: view.author.id,
        isAnnouncement: view.type === 'ANNOUNCEMENT',
      }}
    />
  );
}
