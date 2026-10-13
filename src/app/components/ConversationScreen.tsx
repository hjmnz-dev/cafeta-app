import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  ArrowLeft,
  Check,
  Loader2,
  Pencil,
  Send,
  Trash2,
  X,
} from 'lucide-react';
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
  useDeactivateMessage,
  useEditMessage,
  useMarkRead,
  useMessages,
  useSendMessage,
} from '../store/conversations-queries';
import { useSession } from '../store/SessionStore';

/**
 * Una conversación (HU34, HU35 y HU38, spec 0008 decisión 25 y 26). El historial
 * sale de la API en orden cronológico; lo que llega por el socket entra a la
 * misma caché, así que aparece aquí sin recargar. Abrirla, o recibir algo con
 * ella abierta, la marca como leída. Los mensajes propios se pueden editar y eliminar.
 */
export function ConversationScreen() {
  const navigate = useNavigate();
  const { conversationId = '' } = useParams();
  const { user } = useSession();
  const conversation = useConversation(conversationId);
  const messages = useMessages(conversationId);
  const send = useSendMessage(conversationId);
  const edit = useEditMessage(conversationId);
  const deactivate = useDeactivateMessage(conversationId);
  const markRead = useMarkRead(conversationId);
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
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

  const startEdit = (id: string, currentContent: string) => {
    setEditingId(id);
    setEditDraft(currentContent);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft('');
  };

  const saveEdit = (id: string) => {
    const trimmed = editDraft.trim();
    if (!trimmed) {
      toast.error('El mensaje no puede estar vacío');
      return;
    }
    if (countChars(trimmed) > MESSAGE_CONTENT_MAX) {
      toast.error(`El mensaje pasa de ${MESSAGE_CONTENT_MAX} caracteres`);
      return;
    }
    edit.mutate(
      { messageId: id, content: trimmed },
      {
        onSuccess: () => cancelEdit(),
        onError: (error) => toast.error(userMessageOf(error)),
      },
    );
  };

  const removeMessage = (id: string) => {
    if (!window.confirm('¿Deseas eliminar este mensaje?')) return;
    deactivate.mutate(id, {
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
            const isEditing = editingId === msg.id;

            return (
              <li
                key={msg.id}
                className={clsx(
                  'flex flex-col group',
                  mine ? 'items-end' : 'items-start',
                )}
              >
                <div
                  className={clsx(
                    'max-w-[85%] rounded-[20px] px-4 py-3 shadow-sm relative',
                    mine
                      ? 'bg-[var(--brand)] text-[var(--on-brand)] rounded-br-sm'
                      : 'bg-[var(--surface)] text-[var(--ink)] rounded-bl-sm',
                  )}
                >
                  {isEditing ? (
                    <div className="flex flex-col gap-2 min-w-[220px]">
                      <input
                        type="text"
                        aria-label="Editar mensaje"
                        value={editDraft}
                        onChange={(e) => setEditDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEdit(msg.id);
                          if (e.key === 'Escape') cancelEdit();
                        }}
                        autoFocus
                        disabled={edit.isPending}
                        className="w-full bg-[var(--surface)] text-[var(--ink)] px-3 py-1.5 rounded-lg text-[14px] outline-none"
                      />
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={cancelEdit}
                          disabled={edit.isPending}
                          aria-label="Cancelar edición"
                          className="px-2 py-1 text-[12px] rounded-md bg-black/10 hover:bg-black/20 font-medium"
                        >
                          <X className="w-3.5 h-3.5 inline mr-1" />
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => saveEdit(msg.id)}
                          disabled={edit.isPending}
                          aria-label="Guardar mensaje"
                          className="px-2.5 py-1 text-[12px] rounded-md bg-[var(--surface-3)] text-[var(--ink)] hover:bg-[var(--surface-2)] font-semibold shadow-xs"
                        >
                          <Check className="w-3.5 h-3.5 inline mr-1" />
                          {edit.isPending ? 'Guardando…' : 'Guardar'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words flex-1">
                          {msg.content}
                        </p>
                        {mine && (
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 ml-2 self-start shrink-0">
                            <button
                              type="button"
                              onClick={() => startEdit(msg.id, msg.content)}
                              aria-label="Editar mensaje"
                              title="Editar mensaje"
                              className="p-1 rounded hover:bg-black/10 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5 opacity-80 hover:opacity-100" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeMessage(msg.id)}
                              disabled={deactivate.isPending}
                              aria-label="Eliminar mensaje"
                              title="Eliminar mensaje"
                              className="p-1 rounded hover:bg-black/10 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5 opacity-80 hover:opacity-100" />
                            </button>
                          </div>
                        )}
                      </div>
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
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
        <div ref={endRef} />
      </div>

      <div className="bg-[var(--surface)] border-t border-[var(--line-soft)] px-4 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
        {tooLong && (
          <p
            className="text-[12px] text-[var(--destructive)] mb-2"
            role="alert"
          >
            El mensaje pasa de {MESSAGE_CONTENT_MAX} caracteres.
          </p>
        )}
        <div className="flex items-center gap-2 bg-[var(--app-bg)] rounded-full pl-4 pr-1.5 py-1.5 border border-[var(--line)]">
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
