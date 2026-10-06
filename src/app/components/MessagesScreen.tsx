import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { MessageCircle, Search } from 'lucide-react';
import { toast } from 'sonner';
import type { ConversationView } from '../lib/conversations-api';
import { userMessageOf } from '../lib/http';
import { initialsOf } from '../lib/messages';
import { relativeTime } from '../lib/posts';
import { useInbox, useOpenConversation } from '../store/conversations-queries';
import { useSession } from '../store/SessionStore';
import { InfiniteListFooter } from './InfiniteListFooter';

/**
 * Bandeja de mensajes (HU33, spec 0008 decisión 25). Lista real de la API,
 * ordenada por el último mensaje y con un punto en las no leídas. Los mensajes
 * nuevos llegan por el socket (RealtimeProvider), que refresca esta lista.
 *
 * `/messages?to=<userId>` abre (o reusa) la conversación con esa persona y
 * salta a `/messages/<id>`; así la abren el perfil y la búsqueda.
 */
export function MessagesScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const to = searchParams.get('to');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const inbox = useInbox();
  const open = useOpenConversation();
  const { user } = useSession();
  const openConversation = open.mutate;

  useEffect(() => {
    if (!to) return;
    openConversation(to, {
      onSuccess: (conversation) =>
        navigate(`/messages/${conversation.id}`, { replace: true }),
      onError: (error) => {
        toast.error(userMessageOf(error));
        navigate('/messages', { replace: true });
      },
    });
  }, [to, openConversation, navigate]);

  const conversations = inbox.data?.pages.flatMap((p) => p.items) ?? [];
  const query = searchQuery.trim().toLowerCase();
  const visible = query
    ? conversations.filter(
        (c) =>
          c.otherUser.displayName.toLowerCase().includes(query) ||
          c.otherUser.handle.toLowerCase().includes(query),
      )
    : conversations;
  const now = new Date();
  // Se calcula aquí: dentro de la rama isSuccess, TypeScript estrecha error a never.
  const nextPageError = inbox.isFetchNextPageError
    ? userMessageOf(inbox.error)
    : null;

  return (
    <div className="w-full h-full bg-[var(--app-bg)] flex flex-col pb-[100px]">
      <div className="bg-[var(--surface)] border-b border-[var(--line-soft)] px-5 py-4 pt-16">
        <h1 className="font-['Space Grotesk',sans-serif] font-bold text-[24px] text-[var(--ink)] mb-4">
          Mensajes
        </h1>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted)]" />
          <input
            type="text"
            aria-label="Buscar conversaciones"
            placeholder="Buscar conversaciones..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-[var(--app-bg)] rounded-[16px] border border-[var(--line)] text-[15px] text-[var(--ink)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 transition-all"
          />
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {(inbox.isPending || to) && <InboxSkeleton />}

        {!to && inbox.isError && (
          <div className="px-5 py-10 flex flex-col items-center gap-3 text-center">
            <p className="text-[14px] text-[var(--muted)]">
              {userMessageOf(inbox.error)}
            </p>
            <button
              onClick={() => void inbox.refetch()}
              className="px-4 py-2 rounded-full text-[13px] font-semibold text-[var(--ink)] bg-[var(--surface-3)]"
            >
              Reintentar
            </button>
          </div>
        )}

        {!to && inbox.isSuccess && conversations.length === 0 && (
          <div className="px-8 py-14 flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-full bg-[var(--surface-3)] flex items-center justify-center">
              <MessageCircle className="w-7 h-7 text-[var(--muted)]" />
            </div>
            <h2 className="font-semibold text-[16px] text-[var(--ink)]">
              Aún no tienes conversaciones
            </h2>
            <p className="text-[14px] text-[var(--muted)]">
              Busca a alguien de tu comunidad y escríbele desde su perfil.
            </p>
            <button
              onClick={() => navigate('/search')}
              className="mt-1 px-5 py-2.5 rounded-full text-[14px] font-semibold bg-[var(--brand)] text-[var(--on-brand)]"
            >
              Buscar personas
            </button>
          </div>
        )}

        {!to && inbox.isSuccess && conversations.length > 0 && (
          <>
            {visible.length === 0 && (
              <p className="px-5 py-8 text-center text-[14px] text-[var(--muted)]">
                Ninguna conversación coincide con tu búsqueda.
              </p>
            )}
            <ul>
              {visible.map((conversation) => (
                <li key={conversation.id}>
                  <InboxRow
                    conversation={conversation}
                    mine={conversation.lastMessage?.senderId === user?.id}
                    now={now}
                    onOpen={() => navigate(`/messages/${conversation.id}`)}
                  />
                </li>
              ))}
            </ul>
            <InfiniteListFooter
              scrollRootRef={scrollRef}
              hasNextPage={inbox.hasNextPage}
              isFetchingNextPage={inbox.isFetchingNextPage}
              errorMessage={nextPageError}
              onLoadMore={() => void inbox.fetchNextPage()}
            />
          </>
        )}
      </div>
    </div>
  );
}

function InboxRow({
  conversation,
  mine,
  now,
  onOpen,
}: {
  conversation: ConversationView;
  mine: boolean;
  now: Date;
  onOpen: () => void;
}) {
  const { otherUser, lastMessage, unread } = conversation;
  const preview = lastMessage
    ? `${mine ? 'Tú: ' : ''}${lastMessage.content}`
    : 'Sin mensajes';
  return (
    <button
      onClick={onOpen}
      aria-label={`Conversación con ${otherUser.displayName}${unread ? ', sin leer' : ''}`}
      className="w-full px-5 py-4 flex items-center gap-3 hover:bg-[var(--surface)] transition-colors border-b border-[var(--line-soft)]"
    >
      <div className="w-[52px] h-[52px] flex-shrink-0 rounded-full bg-[var(--brand)] flex items-center justify-center text-[var(--on-brand)] font-semibold text-[16px] shadow-sm">
        {initialsOf(otherUser.displayName)}
      </div>
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-['Space Grotesk',sans-serif] font-semibold text-[15px] text-[var(--ink)] truncate">
            {otherUser.displayName}
          </h3>
          {lastMessage && (
            <span className="text-[12px] text-[var(--muted)] flex-shrink-0 ml-2">
              {relativeTime(lastMessage.createdAt, now)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <p
            className={
              unread
                ? 'text-[14px] text-[var(--ink)] font-semibold truncate flex-1 mr-2'
                : 'text-[14px] text-[var(--muted)] truncate flex-1 mr-2'
            }
          >
            {preview}
          </p>
          {unread && (
            <span
              data-testid="unread-dot"
              className="flex-shrink-0 w-2.5 h-2.5 bg-[var(--brand)] rounded-full"
            />
          )}
        </div>
      </div>
    </button>
  );
}

function InboxSkeleton() {
  return (
    <div role="status" aria-label="Cargando conversaciones">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="px-5 py-4 flex items-center gap-3 border-b border-[var(--line-soft)]"
        >
          <div className="w-[52px] h-[52px] rounded-full bg-[var(--surface-3)] animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-1/2 rounded bg-[var(--surface-3)] animate-pulse" />
            <div className="h-3 w-3/4 rounded bg-[var(--surface-3)] animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}
