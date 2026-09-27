import { useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { X, Smile, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { CAMPUS_LOCATIONS } from '../lib/campus-locations';
import { messageForCode } from '../lib/error-messages';
import { userMessageOf } from '../lib/http';
import type { CampusLocation } from '../lib/posts-api';
import { countChars, POST_CONTENT_MAX } from '../lib/posts';
import { useCareers, useCreatePost } from '../store/posts-queries';
import { useSession } from '../store/SessionStore';

/**
 * Crear publicación de texto contra la API (spec 0005, HU20 solo texto).
 *
 * Imágenes, video y la etiqueta de carrera vuelven con sus funcionalidades;
 * la pestaña de carrera sale de la carrera del autor. Si la API falla, el
 * texto y la ubicación se quedan como estaban.
 */
export function CreatePostScreen() {
  const navigate = useNavigate();
  const { user } = useSession();
  const careers = useCareers();
  const createPost = useCreatePost();
  const [postText, setPostText] = useState('');
  const [location, setLocation] = useState<CampusLocation | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  // Candado del envío: varios toques seguidos llegan antes de que isPending
  // se refleje en el botón, y solo debe salir una petición.
  const sending = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const name = user?.profile.displayName ?? '';
  const careerName =
    careers.data?.find((c) => c.id === user?.profile.careerId)?.name ?? '';
  const used = countChars(postText);
  const tooLong = used > POST_CONTENT_MAX;
  const publishing = createPost.isPending;

  const handlePost = () => {
    if (sending.current || tooLong) return;
    if (!postText.trim()) {
      toast.error(messageForCode('POST_CONTENT_REQUIRED'));
      return;
    }
    sending.current = true;
    createPost.mutate(
      { content: postText, location: location ?? undefined },
      {
        onSuccess: () => navigate('/home'),
        onError: (error) => toast.error(userMessageOf(error)),
        onSettled: () => {
          sending.current = false;
        },
      },
    );
  };

  const initial = (name.trim()[0] || 'C').toUpperCase();

  const focusTextarea = () => {
    textareaRef.current?.focus();
  };

  const addEmoji = (emoji: string) => {
    setPostText(postText + emoji);
    setShowEmojiPicker(false);
  };

  // Emojis comunes para redes sociales
  const popularEmojis = [
    '😀',
    '😃',
    '😄',
    '😁',
    '😅',
    '😂',
    '🤣',
    '😊',
    '😇',
    '🙂',
    '🙃',
    '😉',
    '😌',
    '😍',
    '🥰',
    '😘',
    '😗',
    '😙',
    '😚',
    '😋',
    '😛',
    '😝',
    '😜',
    '🤪',
    '🤨',
    '🧐',
    '🤓',
    '😎',
    '🤩',
    '🥳',
    '😏',
    '😒',
    '😞',
    '😔',
    '😟',
    '😕',
    '🙁',
    '☹️',
    '😣',
    '😖',
    '😫',
    '😩',
    '🥺',
    '😢',
    '😭',
    '😤',
    '😠',
    '😡',
    '🤬',
    '🤯',
    '😳',
    '🥵',
    '🥶',
    '😱',
    '😨',
    '😰',
    '😥',
    '😓',
    '🤗',
    '🤔',
    '🤭',
    '🤫',
    '🤥',
    '😶',
    '😐',
    '😑',
    '😬',
    '🙄',
    '😯',
    '😦',
    '😧',
    '😮',
    '😲',
    '🥱',
    '😴',
    '🤤',
    '😪',
    '😵',
    '🤐',
    '🥴',
    '🤢',
    '🤮',
    '🤧',
    '😷',
    '🤒',
    '🤕',
    '🤑',
    '🤠',
    '👍',
    '👎',
    '👏',
    '🙌',
    '👐',
    '🤝',
    '🙏',
    '✌️',
    '🤞',
    '🤟',
    '🤘',
    '🤙',
    '💪',
    '🦾',
    '🦿',
    '🦵',
    '❤️',
    '🧡',
    '💛',
    '💚',
    '💙',
    '💜',
    '🖤',
    '🤍',
    '💔',
    '❣️',
    '💕',
    '💞',
    '💓',
    '💗',
    '💖',
    '💘',
    '🔥',
    '✨',
    '💫',
    '⭐',
    '🌟',
    '💥',
    '💯',
    '✅',
    '🎉',
    '🎊',
    '🎈',
    '🎁',
    '🏆',
    '🥇',
    '🥈',
    '🥉',
  ];

  return (
    <div className="w-full h-full bg-[var(--surface)] flex flex-col">
      {/* Header */}
      <div className="h-[60px] flex items-center justify-between px-4 border-b border-[var(--line-soft)] mt-12">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[var(--surface-2)] transition-colors"
        >
          <X className="w-6 h-6 text-[var(--ink-2)]" />
        </button>
        <h1 className="text-lg font-semibold text-[var(--ink)] font-['Space Grotesk',sans-serif]">
          Nueva Publicación
        </h1>
        <button
          onClick={handlePost}
          disabled={tooLong || publishing}
          className="px-5 py-2 bg-[var(--brand)] text-[var(--on-brand)] font-medium text-[14px] rounded-full disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--brand-strong)] transition-colors"
        >
          {publishing ? 'Publicando…' : 'Publicar'}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4" onClick={focusTextarea}>
        {/* User Info */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--brand)] to-[var(--brand-strong)] flex items-center justify-center flex-shrink-0">
            <span className="text-white font-semibold text-lg">{initial}</span>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-[var(--ink)]">{name}</h3>
            <p className="text-xs text-[var(--muted)]">{careerName}</p>
          </div>
        </div>

        {/* Text Area */}
        <textarea
          ref={textareaRef}
          value={postText}
          onChange={(e) => setPostText(e.target.value)}
          placeholder="¿Qué está pasando en INTEC?"
          className="w-full min-h-[200px] text-[15px] text-[var(--ink)] placeholder-[var(--muted)] resize-none focus:outline-none font-['DM_Sans',sans-serif] leading-relaxed"
          aria-label="Texto de la publicación"
          autoFocus
        />

        {/* Location Display */}
        {location && (
          <div className="mt-4 flex items-center gap-2 px-4 py-3 bg-[var(--tint)] rounded-xl">
            <MapPin className="w-4 h-4 text-[var(--brand)]" />
            <span className="text-sm text-[var(--ink)]">{location}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLocation(null);
              }}
              className="ml-auto"
            >
              <X className="w-4 h-4 text-[var(--muted)] hover:text-[var(--brand)] transition-colors" />
            </button>
          </div>
        )}
      </div>

      {/* Bottom Actions */}
      <div className="border-t border-[var(--line-soft)] px-4 py-3 bg-[var(--surface)]">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            aria-label="Agregar emoji"
            className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-[var(--tint)] transition-colors group"
          >
            <Smile className="w-5 h-5 text-[var(--muted)] group-hover:text-[var(--brand)] transition-colors" />
          </button>
          <button
            onClick={() => setShowLocationModal(!showLocationModal)}
            aria-label="Agregar ubicación"
            className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-[var(--tint)] transition-colors group"
          >
            <MapPin className="w-5 h-5 text-[var(--muted)] group-hover:text-[var(--brand)] transition-colors" />
          </button>
          <div className="flex-1"></div>
          <span
            data-testid="char-count"
            className={
              'text-sm ' +
              (tooLong
                ? 'text-[var(--brand)] font-semibold'
                : 'text-[var(--muted)]')
            }
          >
            {used}/{POST_CONTENT_MAX}
          </span>
        </div>
      </div>

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div
          className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50"
          onClick={() => setShowEmojiPicker(false)}
        >
          <div
            className="bg-[var(--surface)] w-full max-w-[390px] p-6 rounded-t-3xl md:rounded-3xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[var(--ink)] font-['Space Grotesk',sans-serif]">
                Selecciona un Emoji
              </h2>
              <button
                onClick={() => setShowEmojiPicker(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--surface-2)] transition-colors"
              >
                <X className="w-5 h-5 text-[var(--muted)]" />
              </button>
            </div>

            <div className="grid grid-cols-8 gap-2 max-h-[300px] overflow-y-auto p-2">
              {popularEmojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => addEmoji(emoji)}
                  className="text-2xl p-2 rounded-lg hover:bg-[var(--tint)] transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Location Modal */}
      {showLocationModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50"
          onClick={() => setShowLocationModal(false)}
        >
          <div
            className="bg-[var(--surface)] w-full max-w-[390px] p-6 rounded-t-3xl md:rounded-3xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-[var(--ink)] font-['Space Grotesk',sans-serif]">
                Agregar Ubicación
              </h2>
              <button
                onClick={() => setShowLocationModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--surface-2)] transition-colors"
              >
                <X className="w-5 h-5 text-[var(--muted)]" />
              </button>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {CAMPUS_LOCATIONS.map((loc) => (
                <button
                  key={loc}
                  onClick={() => {
                    setLocation(loc);
                    setShowLocationModal(false);
                  }}
                  className={`w-full text-left px-4 py-3 rounded-xl transition-all ${
                    location === loc
                      ? 'bg-[var(--tint)] border-2 border-[var(--brand)]'
                      : 'bg-[var(--surface-3)] hover:bg-[var(--surface-3)]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <MapPin
                      className={`w-5 h-5 ${location === loc ? 'text-[var(--brand)]' : 'text-[var(--muted)]'}`}
                    />
                    <span className="text-[14px] font-medium text-[var(--ink)]">
                      {loc}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
