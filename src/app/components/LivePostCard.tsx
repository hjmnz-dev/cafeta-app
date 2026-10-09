import { toast } from 'sonner';
import { userMessageOf } from '../lib/http';
import type { PostView } from '../lib/posts-api';
import { toCardPost } from '../lib/posts';
import {
  useArchivePost,
  useDeactivatePost,
  useDeletePost,
  useReactToPost,
  useSavePost,
  useReactivatePost,
  useRestorePost,
  useUpdatePost,
} from '../store/posts-queries';
import {
  PostCard,
  type LiveAuthorActions,
  type LiveReaction,
  type LiveSave,
} from './PostCard';

/** Mi reacción contra la API; si falla, se deshace sola y se avisa (spec 0009). */
function useLiveReaction(view: PostView): LiveReaction {
  const react = useReactToPost();
  return {
    mine: view.myReaction,
    busy: react.isPending,
    select: (type) =>
      react.mutate(
        { id: view.id, type, previous: view.myReaction },
        { onError: (error) => toast.error(userMessageOf(error)) },
      ),
  };
}

/** Guardar o quitar contra la API; si falla, se deshace sola y se avisa (spec 0009). */
function useLiveSave(view: PostView): LiveSave {
  const save = useSavePost();
  return {
    saved: view.savedByMe,
    busy: save.isPending,
    toggle: () =>
      save.mutate(
        { id: view.id, saved: !view.savedByMe },
        { onError: (error) => toast.error(userMessageOf(error)) },
      ),
  };
}

/** Acciones del autor contra la API (spec 0008, decisiones 17 y 18). */
function useAuthorActions(id: string): LiveAuthorActions {
  const update = useUpdatePost();
  const deactivate = useDeactivatePost();
  const reactivate = useReactivatePost();
  const archive = useArchivePost();
  const restore = useRestorePost();
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
    reactivate: () =>
      reactivate.mutate(id, {
        onSuccess: () => toast.success('Publicación reactivada.'),
        onError,
      }),
    archive: () =>
      archive.mutate(id, {
        onSuccess: () => toast.success('Publicación archivada.'),
        onError,
      }),
    restore: () =>
      restore.mutate(id, {
        onSuccess: () => toast.success('Publicación restaurada.'),
        onError,
      }),
    remove: () =>
      remove.mutate(id, {
        onSuccess: () => toast.success('Publicación eliminada.'),
        onError,
      }),
    busy:
      update.isPending ||
      deactivate.isPending ||
      reactivate.isPending ||
      archive.isPending ||
      restore.isPending ||
      remove.isPending,
  };
}

function MyPostCard({
  view,
  now,
  reaction,
}: {
  view: PostView;
  now: Date;
  reaction: LiveReaction;
}) {
  const actions = useAuthorActions(view.id);
  return (
    <PostCard
      post={toCardPost(view, now)}
      live={{
        isMine: true,
        authorId: view.author.id,
        isAnnouncement: view.type === 'ANNOUNCEMENT',
        state: view.state,
        actions,
        reaction,
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
  const reaction = useLiveReaction(view);
  const save = useLiveSave(view);
  if (isMine) return <MyPostCard view={view} now={now} reaction={reaction} />;
  return (
    <PostCard
      post={toCardPost(view, now)}
      live={{
        isMine: false,
        authorId: view.author.id,
        isAnnouncement: view.type === 'ANNOUNCEMENT',
        reaction,
        save,
      }}
    />
  );
}
