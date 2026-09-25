import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router';
import { X, Image as ImageIcon, Video, Smile, MapPin } from 'lucide-react';
import { useAppState } from '../store/AppState';
import { toStorableImage, MAX_IMAGES } from '../lib/image';

/**
 * DEF-09 · HU21 — Crear publicación.
 *
 * La publicación se registra en el estado de la app (AppState) y aparece de
 * inmediato en el feed y en el perfil del autor. Las imágenes se reducen y se
 * guardan con la publicación (ver lib/image.ts); los videos siguen siendo solo
 * vista previa porque necesitan almacenamiento en servidor.
 */

interface MediaFile {
  id: string;
  file: File;
  preview: string;
  type: 'image' | 'video';
}

export function CreatePostScreen() {
  const navigate = useNavigate();
  const { profile, addPost } = useAppState();
  const [postText, setPostText] = useState('');
  const [selectedCareer, setSelectedCareer] = useState('');
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [location, setLocation] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Mismo vocabulario de carreras que el filtro del feed y el perfil.
  const careers = [
    'Ing. Software',
    'Ing. Industrial',
    'Ing. Civil',
    'Ing. Mecánica',
    'Medicina',
    'Adm. Empresas',
    'Mercadeo',
    'Psicología',
    'Derecho',
    'Arquitectura'
  ];

  const intecLocations = [
    'Campus Principal',
    'Biblioteca',
    'Cafetería INTEC',
    'Laboratorio de Computación',
    'Auditorio',
    'Cancha Deportiva',
    'Área de Parqueo',
    'Centro de Estudiantes'
  ];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    // Tope de imágenes por publicación (cada una se guarda en localStorage).
    const room = MAX_IMAGES - mediaFiles.filter((f) => f.type === 'image').length;
    const newFiles = Array.from(files)
      .slice(0, Math.max(0, room))
      .map((file) => ({
        id: Math.random().toString(36).substr(2, 9),
        file,
        preview: URL.createObjectURL(file),
        type: 'image' as const
      }));
    setMediaFiles((prev) => [...prev, ...newFiles]);
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newFiles = Array.from(files).map((file) => ({
        id: Math.random().toString(36).substr(2, 9),
        file,
        preview: URL.createObjectURL(file),
        type: 'video' as const
      }));
      setMediaFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeMedia = (id: string) => {
    setMediaFiles((prev) => {
      const fileToRemove = prev.find((f) => f.id === id);
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter((f) => f.id !== id);
    });
  };

  const images = mediaFiles.filter((m) => m.type === 'image');
  const hasVideo = mediaFiles.some((m) => m.type === 'video');
  const canPost = Boolean(postText.trim()) || images.length > 0;

  const handlePost = async () => {
    if (!canPost || publishing) return;
    setPublishing(true);

    // Reducir las imágenes antes de guardarlas (localStorage es pequeño).
    const stored = await Promise.all(images.map((m) => toStorableImage(m.file)));

    addPost({
      career: selectedCareer || profile.career,
      time: 'ahora',
      type: 'text',
      content: postText.trim(),
      location: location || undefined,
      images: stored.length > 0 ? stored : undefined,
    });

    // Liberar las vistas previas: ya no se usan (los videos no se publican).
    mediaFiles.forEach((file) => URL.revokeObjectURL(file.preview));

    navigate('/home');
  };

  const initial = (profile.name.trim()[0] || 'C').toUpperCase();

  const focusTextarea = () => {
    textareaRef.current?.focus();
  };

  const addEmoji = (emoji: string) => {
    setPostText(postText + emoji);
    setShowEmojiPicker(false);
  };

  // Emojis comunes para redes sociales
  const popularEmojis = [
    '😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊',
    '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘',
    '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪',
    '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒',
    '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖',
    '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡',
    '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰',
    '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶',
    '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮',
    '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴',
    '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠',
    '👍', '👎', '👏', '🙌', '👐', '🤝', '🙏', '✌️',
    '🤞', '🤟', '🤘', '🤙', '💪', '🦾', '🦿', '🦵',
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍',
    '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘',
    '🔥', '✨', '💫', '⭐', '🌟', '💥', '💯', '✅',
    '🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🥈', '🥉'
  ];

  return (
    <div className="w-full h-full bg-[var(--surface)] flex flex-col">
      {/* Hidden file inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleImageUpload}
        className="hidden"
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        multiple
        onChange={handleVideoUpload}
        className="hidden"
      />

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
          disabled={!canPost || publishing}
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
            <h3 className="font-semibold text-[var(--ink)]">{profile.name}</h3>
            <p className="text-xs text-[var(--muted)]">{selectedCareer || profile.career}</p>
          </div>
        </div>

        {/* Text Area */}
        <textarea
          ref={textareaRef}
          value={postText}
          onChange={(e) => setPostText(e.target.value)}
          placeholder="¿Qué está pasando en INTEC?"
          className="w-full min-h-[200px] text-[15px] text-[var(--ink)] placeholder-[var(--muted)] resize-none focus:outline-none font-['DM_Sans',sans-serif] leading-relaxed"
          autoFocus
          maxLength={500}
        />

        {/* Media Preview Grid - Estilo Instagram */}
        {mediaFiles.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            {mediaFiles.map((media) => (
              <div key={media.id} className="relative aspect-square rounded-xl overflow-hidden bg-[var(--surface-3)]">
                {media.type === 'image' ? (
                  <img
                    src={media.preview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <video
                    src={media.preview}
                    className="w-full h-full object-cover"
                    controls={false}
                  />
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeMedia(media.id);
                  }}
                  className="absolute top-2 right-2 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center hover:bg-black/80 transition-colors"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
                {media.type === 'video' && (
                  <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 rounded text-white text-xs font-medium">
                    VIDEO
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {hasVideo && (
          <p className="mt-3 text-xs text-[var(--muted)]">
            Los videos todavía no se publican: quedan solo como vista previa.
          </p>
        )}
        {images.length >= MAX_IMAGES && (
          <p className="mt-1 text-xs text-[var(--muted)]">Máximo {MAX_IMAGES} imágenes por publicación.</p>
        )}

        {/* Career Selector */}
        <div className="mt-6">
          <label className="block text-sm font-medium text-[var(--ink-2)] mb-2">
            Etiqueta tu carrera (opcional)
          </label>
          <select
            value={selectedCareer}
            onChange={(e) => setSelectedCareer(e.target.value)}
            className="w-full px-4 py-3 bg-[var(--surface-3)] border-0 rounded-xl text-[14px] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)] transition-all"
          >
            <option value="">Selecciona una carrera</option>
            {careers.map((career) => (
              <option key={career} value={career}>
                {career}
              </option>
            ))}
          </select>
        </div>

        {/* Location Display */}
        {location && (
          <div className="mt-4 flex items-center gap-2 px-4 py-3 bg-[var(--tint)] rounded-xl">
            <MapPin className="w-4 h-4 text-[var(--brand)]" />
            <span className="text-sm text-[var(--ink)]">{location}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLocation('');
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
            onClick={(e) => {
              e.stopPropagation();
              imageInputRef.current?.click();
            }}
            className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-[var(--tint)] transition-colors group"
          >
            <ImageIcon className="w-5 h-5 text-[var(--muted)] group-hover:text-[var(--brand)] transition-colors" />
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              videoInputRef.current?.click();
            }}
            className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-[var(--tint)] transition-colors group"
          >
            <Video className="w-5 h-5 text-[var(--muted)] group-hover:text-[var(--brand)] transition-colors" />
          </button>
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-[var(--tint)] transition-colors group"
          >
            <Smile className="w-5 h-5 text-[var(--muted)] group-hover:text-[var(--brand)] transition-colors" />
          </button>
          <button
            onClick={() => setShowLocationModal(!showLocationModal)}
            className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-[var(--tint)] transition-colors group"
          >
            <MapPin className="w-5 h-5 text-[var(--muted)] group-hover:text-[var(--brand)] transition-colors" />
          </button>
          <div className="flex-1"></div>
          <span className="text-sm text-[var(--muted)]">
            {postText.length}/500
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
              {intecLocations.map((loc) => (
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
                    <MapPin className={`w-5 h-5 ${location === loc ? 'text-[var(--brand)]' : 'text-[var(--muted)]'}`} />
                    <span className="text-[14px] font-medium text-[var(--ink)]">{loc}</span>
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