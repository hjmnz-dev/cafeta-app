import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, Loader2, Send } from 'lucide-react';
import { clsx } from 'clsx';
import { toast } from 'sonner';
import { userMessageOf } from '../lib/http';
import {
  chronological,
  initialsOf,
  MESSAGE_CONTENT_MAX,
  messageTime,
} from '../lib/messages';
import { countChars } from '../lib/posts';
import {
  useConversation,
  useMarkRead,
  useMessages,
  useSendMessage,
} from '../store/conversations-queries';
import { useSession } from '../store/SessionStore';

/**
 * Una conversación (HU34, HU35 y HU38, spec 0008 decisión 25). El historial
 * sale de la API en orden cronológico; lo que llega por el socket entra a la
 * misma caché, así que aparece aquí sin recargar. Abrirla, o recibir algo con
 * ella abierta, la marca como leída.
 */
export function ConversationScreen() {
  const navigate = useNavigate();
  const { conversationId = '' } = useParams();
  const { user } = useSession();
  const conversation = useConversation(conversationId);
  const messages = useMessages(conversationId);
  const send = useSendMessage(conversationId);
  const markRead = useMarkRead(conversationId);
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const thread = chronological(messages.data?.pages ?? []);
  const newest = thread.at(-1);
  const markReadNow = markRead.mutate;

  // Al abrir y con cada mensaje nuevo: queda leída y se baja al final.
  useEffect(() => {
    if (!conversation.isSuccess) return;
    markReadNow();
    endRef.current?.scrollIntoView?.({ block: 'end' });
  }, [newest?.id, conversation.isSuccess, markReadNow]);

  const text = draft.trim();
  const tooLong = countChars(text) > MESSAGE_CONTENT_MAX;
  const canSend = text.length > 0 && !tooLong && !send.isPending;

  const submit = () => {
    if (!canSend) return;
    send.mutate(text, {
      onSuccess: () => setDraft(''),
      onError: (error) => toast.error(userMessageOf(error)),
    });
  };

  if (conversation.isError) {
    return (
      <div className="w-full h-full bg-[var(--app-bg)] flex flex-col">
        <Header title="Mensajes" onBack={() => navigate('/messages')} />
        <div className="flex-1 flex items-center justify-center px-8 text-center text-[var(--muted)]">
          {userMessageOf(conversation.error)}
        </div>
      </div>
    );
  }

  const other = conversation.data?.otherUser;

  return (
    <div className="w-full h-full bg-[var(--app-bg)] flex flex-col">
      <Header
        title={other?.displayName ?? ''}
        subtitle={other ? `@${other.handle}` : undefined}
        initials={other ? initialsOf(other.displayName) : undefined}
        onBack={() => navigate('/messages')}
      />

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.isPending && (
          <div className="py-8 flex justify-center" role="status">
            <Loader2
              className="w-5 h-5 text-[var(--muted)] animate-spin"
              aria-label="Cargando mensajes"
            />
          </div>
        )}

        {messages.isError && (
          <div className="py-8 flex flex-col items-center gap-2 text-center">
            <p className="text-[14px] text-[var(--muted)]">
              {userMessageOf(messages.error)}
            </p>
            <button
              onClick={() => void messages.refetch()}
              className="px-4 py-2 rounded-full text-[13px] font-semibold text-[var(--ink)] bg-[var(--surface-3)]"
            >
              Reintentar
            </button>
          </div>
        )}

        {messages.hasNextPage && (
          <div className="flex justify-center">
            <button
              onClick={() => void messages.fetchNextPage()}
              disabled={messages.isFetchingNextPage}
              className="px-4 py-2 rounded-full text-[13px] font-semibold text-[var(--ink)] bg-[var(--surface-3)] disabled:opacity-50"
            >
              {messages.isFetchingNextPage
                ? 'Cargando…'
                : 'Ver mensajes anteriores'}
            </button>
          </div>
        )}

        {messages.isSuccess && thread.length === 0 && (
          <p className="text-center text-[14px] text-[var(--muted)] py-8">
            Todavía no hay mensajes. Escribe el primero.
          </p>
        )}

        <ol className="space-y-4" aria-label="Historial de mensajes">
          {thread.map((msg) => {
            const mine = msg.senderId === user?.id;
            return (
              <li
                key={msg.id}
                className={clsx(
                  'flex flex-col',
                  mine ? 'items-end' : 'items-start',
                )}
              >
                <div
                  className={clsx(
                    'max-w-[75%] rounded-[20px] px-4 py-3 shadow-sm',
                    mine
                      ? 'bg-[var(--brand)] text-[var(--on-brand)] rounded-br-sm'
                      : 'bg-[var(--surface)] text-[var(--ink)] rounded-bl-sm',
                  )}
                >
                  <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
                    {msg.content}
                  </p>
                  <span
                    className={clsx(
                      'text-[11px] mt-1 block',
                      mine
                        ? 'text-[var(--on-brand)]/70'
                        : 'text-[var(--muted)]',
                    )}
                  >
                    {messageTime(msg.createdAt)}
                    {msg.editedAt && ' · Editado'}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
        <div ref={endRef} />
      </div>

      <div className="bg-[var(--surface)] border-t border-[var(--line-soft)] px-5 py-4 pb-24">
        {tooLong && (
          <p
            className="text-[12px] text-[var(--destructive)] mb-2"
            role="alert"
          >
            El mensaje pasa de {MESSAGE_CONTENT_MAX} caracteres.
          </p>
        )}
        <div className="flex items-center gap-3 bg-[var(--app-bg)] rounded-[24px] px-4 py-3 border border-[var(--line)]">
          <input
            type="text"
            aria-label="Escribe un mensaje"
            placeholder="Escribe un mensaje..."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            disabled={!conversation.isSuccess}
            className="flex-1 bg-transparent outline-none text-[15px] text-[var(--ink)] placeholder:text-[var(--muted)]"
          />
          <button
            onClick={submit}
            disabled={!canSend}
            aria-label="Enviar mensaje"
            className="w-8 h-8 bg-[var(--brand)] rounded-full flex items-center justify-center text-[var(--on-brand)] hover:bg-[var(--brand-strong)] transition-colors shadow-sm disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Header({
  title,
  subtitle,
  initials,
  onBack,
}: {
  title: string;
  subtitle?: string;
  initials?: string;
  onBack: () => void;
}) {
  return (
    <div className="bg-[var(--surface)] border-b border-[var(--line-soft)] px-5 py-4 pt-16 flex items-center gap-3">
      <button
        onClick={onBack}
        className="text-[var(--brand)]"
        aria-label="Volver a conversaciones"
      >
        <ArrowLeft className="w-6 h-6" />
      </button>
      {initials && (
        <div className="w-10 h-10 rounded-full bg-[var(--brand)] flex items-center justify-center text-[var(--on-brand)] font-semibold text-sm shadow-sm">
          {initials}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h2 className="font-['Space Grotesk',sans-serif] font-bold text-[16px] text-[var(--ink)] truncate">
          {title}
        </h2>
        {subtitle && (
          <p className="text-[var(--muted)] text-[13px] truncate">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
