import React, { useState } from 'react';
import { Search, MoreVertical, Send, Image as ImageIcon, Mic, Pencil, EyeOff, Check, X } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAppState } from '../store/AppState';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

/**
 * Mensajería (FT07). Las conversaciones siguen siendo datos de demostración,
 * pero los mensajes viven en el store (DEF-06): enviarlos, editarlos (HU36) y
 * retirarlos (HU37) se refleja tanto en el hilo como en la vista previa de la
 * lista, que es donde antes se notaba que nada de esto funcionaba.
 */

interface Conversation {
  id: string;
  name: string;
  username: string;
  avatar: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
  online: boolean;
}

const CONVERSATIONS: Conversation[] = [
  {
    id: '1',
    name: 'María Rodríguez',
    username: '@mrodriguez',
    avatar: 'MR',
    lastMessage: '¿Tienes los apuntes de Estructuras de Datos?',
    timestamp: 'Ahora',
    unread: 2,
    online: true
  },
  {
    id: '2',
    name: 'Juan Pérez',
    username: '@jperez',
    avatar: 'JP',
    lastMessage: 'Claro, nos vemos en la biblioteca a las 3',
    timestamp: '5 min',
    unread: 0,
    online: true
  },
  {
    id: '3',
    name: 'Ana López',
    username: '@alopez',
    avatar: 'AL',
    lastMessage: 'Gracias por la ayuda con el proyecto!',
    timestamp: '2 h',
    unread: 0,
    online: false
  },
  {
    id: '4',
    name: 'Pedro Sánchez',
    username: '@psanchez',
    avatar: 'PS',
    lastMessage: '¿Vamos a estudiar juntos para el examen?',
    timestamp: '1 d',
    unread: 1,
    online: false
  },
  {
    id: '5',
    name: 'Laura Martínez',
    username: '@lmartinez',
    avatar: 'LM',
    lastMessage: 'Vi tu post sobre React, muy interesante',
    timestamp: '2 d',
    unread: 0,
    online: false
  }
];

export function MessagesScreen() {
  const { conversationMessages, sendMessage, editMessage, deactivateMessage } = useAppState();

  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');

  const filteredConversations = CONVERSATIONS.filter(conv =>
    conv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedConversation = CONVERSATIONS.find(c => c.id === selectedChat);

  const send = () => {
    const text = messageInput.trim();
    if (!text || !selectedChat) return;
    sendMessage(selectedChat, text);
    setMessageInput('');
  };

  const saveEdit = () => {
    const text = editDraft.trim();
    if (!text || !editingId) return;
    editMessage(editingId, text);
    setEditingId(null);
  };

  if (selectedChat && selectedConversation) {
    const messages = conversationMessages(selectedChat);

    return (
      <div className="w-full h-full bg-[var(--app-bg)] flex flex-col">
        {/* Chat Header */}
        <div className="bg-[var(--surface)] border-b border-[var(--line-soft)] px-5 py-4 pt-16 flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <button onClick={() => setSelectedChat(null)} className="text-[var(--brand)]" aria-label="Volver a conversaciones">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-[var(--brand)] flex items-center justify-center text-[var(--on-brand)] font-semibold text-sm shadow-sm">
                {selectedConversation.avatar}
              </div>
              {selectedConversation.online && (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-[var(--ok)] border-2 border-white rounded-full"></div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-['Space Grotesk',sans-serif] font-bold text-[16px] text-[var(--ink)] truncate">{selectedConversation.name}</h2>
              <p className="text-[var(--muted)] text-[13px]">{selectedConversation.online ? 'En línea' : 'Desconectado'}</p>
            </div>
          </div>
          <button className="w-9 h-9 flex items-center justify-center text-[var(--muted)] hover:bg-[var(--app-bg)] rounded-full transition-colors">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {messages.length === 0 && (
            <p className="text-center text-[14px] text-[var(--muted)] py-8">
              No hay mensajes en esta conversación todavía.
            </p>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={cn("flex flex-col", msg.sentByMe ? "items-end" : "items-start")}>
              <div className={cn(
                "max-w-[75%] rounded-[20px] px-4 py-3 shadow-sm",
                msg.sentByMe
                  ? "bg-[var(--brand)] text-[var(--on-brand)] rounded-br-sm"
                  : "bg-[var(--surface)] text-[var(--ink)] rounded-bl-sm"
              )}>
                {editingId === msg.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      aria-label="Editar mensaje"
                      value={editDraft}
                      onChange={(e) => setEditDraft(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                      className="bg-[var(--surface)]/95 text-[var(--ink)] rounded-[12px] px-3 py-1.5 text-[15px] outline-none min-w-[150px]"
                    />
                    <button onClick={saveEdit} aria-label="Guardar cambios del mensaje" className="text-[var(--on-brand)]/90 hover:text-[var(--on-brand)]">
                      <Check className="w-[18px] h-[18px]" />
                    </button>
                    <button onClick={() => setEditingId(null)} aria-label="Cancelar edición" className="text-[var(--on-brand)]/90 hover:text-[var(--on-brand)]">
                      <X className="w-[18px] h-[18px]" />
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="text-[15px] leading-relaxed">{msg.text}</p>
                    <span className={cn(
                      "text-[11px] mt-1 block",
                      msg.sentByMe ? "text-[var(--on-brand)]/70" : "text-[var(--muted)]"
                    )}>
                      {msg.time}{msg.edited && ' · Editado'}
                    </span>
                  </>
                )}
              </div>

              {/* Acciones sobre mensajes propios (HU36/HU37) */}
              {msg.sentByMe && editingId !== msg.id && (
                <div className="flex gap-1 mt-1">
                  <button
                    onClick={() => { setEditingId(msg.id); setEditDraft(msg.text); }}
                    aria-label={`Editar mensaje: ${msg.text}`}
                    className="flex items-center gap-1 text-[11px] text-[var(--muted)] hover:text-[var(--brand)] px-2 py-1 rounded-full transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Editar
                  </button>
                  <button
                    onClick={() => deactivateMessage(msg.id)}
                    aria-label={`Retirar mensaje: ${msg.text}`}
                    className="flex items-center gap-1 text-[11px] text-[var(--muted)] hover:text-[var(--brand)] px-2 py-1 rounded-full transition-colors"
                  >
                    <EyeOff className="w-3.5 h-3.5" /> Retirar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Message Input */}
        <div className="bg-[var(--surface)] border-t border-[var(--line-soft)] px-5 py-4 pb-24">
          <div className="flex items-center gap-3 bg-[var(--app-bg)] rounded-[24px] px-4 py-3 border border-[var(--line)]">
            <button className="text-[var(--muted)] hover:text-[var(--brand)] transition-colors" aria-label="Adjuntar imagen">
              <ImageIcon className="w-5 h-5" />
            </button>
            <input
              type="text"
              aria-label="Escribe un mensaje"
              placeholder="Escribe un mensaje..."
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              className="flex-1 bg-transparent outline-none text-[15px] text-[var(--ink)] placeholder:text-[var(--muted)]"
            />
            <button className="text-[var(--muted)] hover:text-[var(--brand)] transition-colors" aria-label="Grabar audio">
              <Mic className="w-5 h-5" />
            </button>
            <button
              onClick={send}
              disabled={!messageInput.trim()}
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

  return (
    <div className="w-full h-full bg-[var(--app-bg)] flex flex-col pb-[100px]">
      {/* Header */}
      <div className="bg-[var(--surface)] border-b border-[var(--line-soft)] px-5 py-4 pt-16">
        <h1 className="font-['Space Grotesk',sans-serif] font-bold text-[24px] text-[var(--ink)] mb-4">Mensajes</h1>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted)]" />
          <input
            type="text"
            placeholder="Buscar conversaciones..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-[var(--app-bg)] rounded-[16px] border border-[var(--line)] text-[15px] text-[var(--ink)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 transition-all"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.map((conversation) => {
          // La vista previa sale del hilo real: si se retira el último mensaje,
          // la lista deja de anunciarlo (HU37).
          const thread = conversationMessages(conversation.id);
          const preview = thread.length > 0 ? thread[thread.length - 1].text : 'Sin mensajes';

          return (
            <button
              key={conversation.id}
              onClick={() => setSelectedChat(conversation.id)}
              className="w-full px-5 py-4 flex items-center gap-3 hover:bg-[var(--surface)] transition-colors border-b border-[var(--line-soft)]"
            >
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className="w-[52px] h-[52px] rounded-full bg-[var(--brand)] flex items-center justify-center text-[var(--on-brand)] font-semibold text-[16px] shadow-sm">
                  {conversation.avatar}
                </div>
                {conversation.online && (
                  <div className="absolute bottom-0 right-0 w-4 h-4 bg-[var(--ok)] border-2 border-white rounded-full"></div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-['Space Grotesk',sans-serif] font-semibold text-[15px] text-[var(--ink)] truncate">{conversation.name}</h3>
                  <span className="text-[12px] text-[var(--muted)] flex-shrink-0 ml-2">{conversation.timestamp}</span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-[14px] text-[var(--muted)] truncate flex-1 mr-2">{preview}</p>
                  {conversation.unread > 0 && (
                    <span className="flex-shrink-0 w-5 h-5 bg-[var(--brand)] text-[var(--on-brand)] text-[11px] font-bold rounded-full flex items-center justify-center shadow-sm">
                      {conversation.unread}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
