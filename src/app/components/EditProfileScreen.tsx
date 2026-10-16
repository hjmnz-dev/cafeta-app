import { useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Camera, X, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { messageForCode } from '../lib/error-messages';
import { userMessageOf } from '../lib/http';
import { checkMediaFile, kindOf } from '../lib/media';
import {
  TAG_CATEGORIES,
  API_TAG_CATEGORIES,
  BIO_MAX,
  PROFILE_TAGS_MAX,
  tagCategoryOf,
} from '../lib/profiles';
import type { ProfileTag, ProfileView } from '../lib/profiles-api';
import { useCareers, useUploadFile } from '../store/posts-queries';
import { useProfile, useUpdateProfile } from '../store/profiles-queries';
import { useSession } from '../store/SessionStore';
import { ProfileAvatar } from './ProfileAvatar';

/**
 * HU10 — Editar la información pública del perfil contra la API (decisión 14).
 *
 * Nombre, carrera, ubicación, biografía, etiquetas y foto. El usuario no se
 * edita aquí: lo fija el registro. La foto se sube apenas se elige (decisión
 * 13) y solo se guarda en el perfil al tocar "Guardar". El comportamiento de
 * cuenta y privacidad vive en Configuración.
 */

const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';

const CATEGORY_LABEL: Readonly<Record<ProfileTag['category'], string>> = {
  CAREER: TAG_CATEGORIES.carrera.label,
  SKILL: TAG_CATEGORIES.habilidad.label,
  INTEREST: TAG_CATEGORIES.interes.label,
};

const sameTag = (a: ProfileTag, b: ProfileTag) =>
  a.label.toLowerCase() === b.label.toLowerCase();

export function EditProfileScreen() {
  const navigate = useNavigate();
  const { user } = useSession();
  const profile = useProfile(user?.id ?? '', Boolean(user));

  if (!profile.data) {
    return (
      <div className="w-full h-full bg-[var(--surface)] flex flex-col items-center justify-center gap-3 px-6 text-center">
        {profile.isError ? (
          <>
            <p className="text-[14px] text-[var(--ink)]">
              No pudimos cargar tu perfil.
            </p>
            <button
              onClick={() => void profile.refetch()}
              className="px-5 py-2 rounded-full bg-[var(--brand)] text-[var(--on-brand)] text-[14px] font-semibold"
            >
              Reintentar
            </button>
          </>
        ) : (
          <p role="status" className="text-[14px] text-[var(--muted)]">
            Cargando tu perfil…
          </p>
        )}
        <button
          onClick={() => navigate('/profile')}
          className="text-[13px] text-[var(--muted)] underline"
        >
          Volver al perfil
        </button>
      </div>
    );
  }

  return <EditProfileForm profile={profile.data} />;
}

function EditProfileForm({ profile }: { profile: ProfileView }) {
  const navigate = useNavigate();
  const careers = useCareers();
  const updateProfile = useUpdateProfile(profile.id);
  const uploadFile = useUploadFile();
  const fileInput = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(profile.displayName);
  const [careerId, setCareerId] = useState(profile.careerId ?? '');
  const [location, setLocation] = useState(profile.location ?? '');
  const [bio, setBio] = useState(profile.bio ?? '');
  const [tags, setTags] = useState<readonly ProfileTag[]>(profile.tags);
  // undefined = la foto no cambia; null = quitarla; texto = clave recién subida.
  const [avatarKey, setAvatarKey] = useState<string | null | undefined>();
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl);

  const [newTag, setNewTag] = useState('');
  const [newTagCat, setNewTagCat] = useState<ProfileTag['category']>('SKILL');
  const [nameError, setNameError] = useState<string | null>(null);

  const uploading = uploadFile.isPending;
  const saving = updateProfile.isPending;
  const careerOptions = careers.data ?? [];

  const addTag = () => {
    const label = newTag.trim();
    if (!label) return;
    const tag: ProfileTag = { label, category: newTagCat };
    if (tags.some((t) => sameTag(t, tag))) {
      toast.error(messageForCode('TAG_DUPLICATED'));
      return;
    }
    if (tags.length >= PROFILE_TAGS_MAX) {
      toast.error(`Máximo ${PROFILE_TAGS_MAX} etiquetas.`);
      return;
    }
    setTags((prev) => [...prev, tag]);
    setNewTag('');
  };

  const removeTag = (tag: ProfileTag) =>
    setTags((prev) => prev.filter((t) => !sameTag(t, tag)));

  const pickPhoto = (file: File | undefined) => {
    if (!file) return;
    const problem =
      kindOf(file.type) === 'IMAGE'
        ? checkMediaFile(file)
        : 'UNSUPPORTED_MEDIA_TYPE';
    if (problem) {
      toast.error(messageForCode(problem));
      return;
    }
    uploadFile.mutate(file, {
      onSuccess: (uploaded) => {
        setAvatarKey(uploaded.key);
        setAvatarUrl(uploaded.url);
      },
      onError: (error) => toast.error(userMessageOf(error)),
    });
  };

  const removePhoto = () => {
    setAvatarKey(null);
    setAvatarUrl(null);
  };

  const save = () => {
    if (saving || uploading) return;
    if (!name.trim()) {
      setNameError('El nombre es requerido');
      return;
    }
    updateProfile.mutate(
      {
        displayName: name.trim(),
        bio: bio.trim() || null,
        location: location.trim() || null,
        ...(careerId ? { careerId } : {}),
        tags: tags.map(({ label, category }) => ({ label, category })),
        ...(avatarKey !== undefined ? { avatarKey } : {}),
      },
      {
        onSuccess: () => navigate('/profile'),
        onError: (error) => toast.error(userMessageOf(error)),
      },
    );
  };

  const label =
    'block text-[13px] font-semibold text-[var(--ink)] mb-2 font-["DM_Sans",sans-serif]';
  const field =
    'px-4 py-3 rounded-[12px] text-[15px] text-[var(--ink)] outline-none transition-all duration-200 ' +
    "placeholder:text-[var(--muted)] font-['DM_Sans',sans-serif] bg-[var(--surface-3)] border-2 border-transparent focus:bg-[var(--surface)] focus:border-[var(--brand)]";

  return (
    <div className="w-full h-full bg-[var(--surface)] flex flex-col">
      {/* Header */}
      <div className="h-[60px] flex items-center justify-between px-4 border-b border-[var(--line)] mt-12 flex-none">
        <button
          onClick={() => navigate('/profile')}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[var(--surface-3)] transition-colors"
          aria-label="Volver"
        >
          <ArrowLeft className="w-6 h-6 text-[var(--ink)]" />
        </button>
        <h1 className="text-[17px] font-semibold text-[var(--ink)] font-['Space_Grotesk',sans-serif]">
          Editar perfil
        </h1>
        <button
          onClick={save}
          disabled={saving || uploading}
          className="px-5 py-2 bg-[var(--brand)] text-[var(--on-brand)] font-semibold text-[14px] rounded-full hover:bg-[var(--brand-strong)] transition-colors disabled:opacity-60"
        >
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto px-5 py-6 flex flex-col gap-5">
        {/* Foto */}
        <div className="flex flex-col items-center gap-3">
          <ProfileAvatar
            url={avatarUrl}
            name={name}
            size={88}
            radius={26}
            className="shadow-[0_4px_16px_rgba(214,40,40,0.3)]"
          />
          <input
            ref={fileInput}
            type="file"
            accept={IMAGE_ACCEPT}
            className="hidden"
            data-testid="avatar-input"
            onChange={(e) => {
              pickPhoto(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--brand)] disabled:opacity-60"
            >
              <Camera className="w-4 h-4" />
              {uploading ? 'Subiendo…' : 'Cambiar foto'}
            </button>
            {avatarUrl && (
              <button
                type="button"
                onClick={removePhoto}
                className="text-[13px] font-semibold text-[var(--muted)]"
              >
                Quitar foto
              </button>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="profile-name" className={label}>
            Nombre
          </label>
          <input
            id="profile-name"
            value={name}
            maxLength={60}
            onChange={(e) => {
              setName(e.target.value);
              if (nameError) setNameError(null);
            }}
            placeholder="Tu nombre"
            className={field + ' w-full'}
          />
          {nameError && (
            <p
              role="alert"
              className="mt-1.5 text-[12px] text-[var(--brand)] font-['DM_Sans',sans-serif]"
            >
              {nameError}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="profile-handle" className={label}>
            Nombre de usuario
          </label>
          <input
            id="profile-handle"
            value={`@${profile.handle}`}
            readOnly
            disabled
            className={field + ' w-full opacity-70'}
          />
        </div>

        <div>
          <label htmlFor="profile-career" className={label}>
            Carrera
          </label>
          <select
            id="profile-career"
            value={careerId}
            onChange={(e) => setCareerId(e.target.value)}
            className={field + ' w-full'}
          >
            {!careerId && <option value="">Sin carrera</option>}
            {careerOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="profile-location" className={label}>
            Ubicación
          </label>
          <input
            id="profile-location"
            value={location}
            maxLength={120}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Ciudad, País"
            className={field + ' w-full'}
          />
        </div>

        <div>
          <label htmlFor="profile-bio" className={label}>
            Biografía
          </label>
          <textarea
            id="profile-bio"
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX))}
            placeholder="Cuéntale a la comunidad sobre ti"
            rows={4}
            className={field + ' w-full resize-none leading-relaxed'}
          />
          <p className="mt-1 text-right text-[11px] text-[var(--muted)] font-['DM_Sans',sans-serif]">
            {bio.length}/{BIO_MAX}
          </p>
        </div>

        {/* Etiquetas académicas (estudios/habilidades) */}
        <div>
          <label htmlFor="profile-new-tag" className={label}>
            Estudios y habilidades
          </label>
          <div className="flex flex-wrap gap-2 mb-3">
            {tags.map((t) => {
              const cat = TAG_CATEGORIES[tagCategoryOf(t.category)];
              return (
                <span
                  key={`${t.category}:${t.label}`}
                  title={cat.label}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[13px] font-semibold border"
                  style={{
                    background: cat.bg,
                    color: cat.text,
                    borderColor: cat.border,
                  }}
                >
                  <span className="sr-only">{cat.label}: </span>
                  {t.label}
                  <button
                    onClick={() => removeTag(t)}
                    aria-label={`Quitar ${t.label}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              );
            })}
            {tags.length === 0 && (
              <span className="text-[13px] text-[var(--muted)] font-['DM_Sans',sans-serif]">
                Aún no agregas etiquetas.
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <select
              aria-label="Categoría de la etiqueta"
              value={newTagCat}
              onChange={(e) =>
                setNewTagCat(e.target.value as ProfileTag['category'])
              }
              className={field + ' flex-none w-[120px] py-2.5'}
            >
              {API_TAG_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABEL[c]}
                </option>
              ))}
            </select>
            <input
              id="profile-new-tag"
              value={newTag}
              maxLength={40}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag();
                }
              }}
              placeholder="Agregar etiqueta"
              className={field + ' flex-1 min-w-0 py-2.5'}
            />
            <button
              onClick={addTag}
              className="flex-none w-11 rounded-[12px] bg-[var(--brand)] text-[var(--on-brand)] flex items-center justify-center hover:bg-[var(--brand-strong)] transition-colors"
              aria-label="Agregar etiqueta"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="h-6" />
      </div>
    </div>
  );
}
