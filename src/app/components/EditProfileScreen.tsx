import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, X, Plus } from 'lucide-react';
import { useAppState, TagCategory, TAG_CATEGORIES } from '../store/AppState';

/**
 * DEF-02 · HU10 — Editar información pública del perfil.
 *
 * Solo campos visibles hacia terceros (nombre, usuario, carrera, ubicación,
 * biografía, etiquetas académicas). El comportamiento de cuenta/privacidad
 * vive en Configuración (DEF-03), pantalla aparte.
 */

const CAREERS = [
  'Ing. Software', 'Ing. Industrial', 'Ing. Civil', 'Ing. Mecánica',
  'Medicina', 'Adm. Empresas', 'Mercadeo', 'Psicología', 'Derecho', 'Arquitectura',
];

const CATEGORY_ORDER: TagCategory[] = ['carrera', 'habilidad', 'interes'];

export function EditProfileScreen() {
  const navigate = useNavigate();
  const { profile, updateProfile } = useAppState();

  const [name, setName] = useState(profile.name);
  const [handle, setHandle] = useState(profile.handle);
  const [career, setCareer] = useState(profile.career);
  const [location, setLocation] = useState(profile.location);
  const [bio, setBio] = useState(profile.bio);
  const [tags, setTags] = useState(profile.tags);

  const [newTag, setNewTag] = useState('');
  const [newTagCat, setNewTagCat] = useState<TagCategory>('habilidad');
  const [nameError, setNameError] = useState<string | null>(null);

  const initial = (name.trim()[0] || 'C').toUpperCase();

  const addTag = () => {
    const label = newTag.trim();
    if (!label) return;
    if (tags.some((t) => t.label.toLowerCase() === label.toLowerCase())) {
      setNewTag('');
      return;
    }
    setTags((prev) => [...prev, { label, category: newTagCat }]);
    setNewTag('');
  };

  const removeTag = (label: string) => setTags((prev) => prev.filter((t) => t.label !== label));

  const save = () => {
    if (!name.trim()) {
      setNameError('El nombre es requerido');
      return;
    }
    const normalizedHandle = handle.trim()
      ? (handle.trim().startsWith('@') ? handle.trim() : '@' + handle.trim())
      : profile.handle;
    updateProfile({ name: name.trim(), handle: normalizedHandle, career, location: location.trim(), bio: bio.trim(), tags });
    navigate('/profile');
  };

  const label = 'block text-[13px] font-semibold text-[var(--ink)] mb-2 font-["DM_Sans",sans-serif]';
  const field =
    'w-full px-4 py-3 rounded-[12px] text-[15px] text-[var(--ink)] outline-none transition-all duration-200 ' +
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
        <h1 className="text-[17px] font-semibold text-[var(--ink)] font-['Space_Grotesk',sans-serif]">Editar perfil</h1>
        <button
          onClick={save}
          className="px-5 py-2 bg-[var(--brand)] text-[var(--on-brand)] font-semibold text-[14px] rounded-full hover:bg-[var(--brand-strong)] transition-colors"
        >
          Guardar
        </button>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto px-5 py-6 flex flex-col gap-5">
        {/* Avatar */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-[88px] h-[88px] rounded-[26px] bg-[var(--brand)] shadow-[0_4px_16px_rgba(214,40,40,0.3)] flex items-center justify-center">
            <span className="text-white font-['Space_Grotesk',sans-serif] font-bold text-[38px]">{initial}</span>
          </div>
          <span className="text-[12px] text-[var(--muted)] font-['DM_Sans',sans-serif]">
            La foto de perfil estará disponible al conectar el almacenamiento.
          </span>
        </div>

        <div>
          <label className={label}>Nombre</label>
          <input
            value={name}
            onChange={(e) => { setName(e.target.value); if (nameError) setNameError(null); }}
            placeholder="Tu nombre"
            className={field}
          />
          {nameError && <p className="mt-1.5 text-[12px] text-[var(--brand)] font-['DM_Sans',sans-serif]">{nameError}</p>}
        </div>

        <div>
          <label className={label}>Nombre de usuario</label>
          <input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@usuario" className={field} />
        </div>

        <div>
          <label className={label}>Carrera</label>
          <select value={career} onChange={(e) => setCareer(e.target.value)} className={field}>
            {!CAREERS.includes(career) && <option value={career}>{career}</option>}
            {CAREERS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label className={label}>Ubicación</label>
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ciudad, País" className={field} />
        </div>

        <div>
          <label className={label}>Biografía</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 240))}
            placeholder="Cuéntale a la comunidad sobre ti"
            rows={4}
            className={field + ' resize-none leading-relaxed'}
          />
          <p className="mt-1 text-right text-[11px] text-[var(--muted)] font-['DM_Sans',sans-serif]">{bio.length}/240</p>
        </div>

        {/* Etiquetas académicas (estudios/habilidades) */}
        <div>
          <label className={label}>Estudios y habilidades</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {tags.map((t) => {
              const cat = TAG_CATEGORIES[t.category];
              return (
                <span
                  key={t.label}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[13px] font-semibold border"
                  style={{ background: cat.bg, color: cat.text, borderColor: cat.border }}
                >
                  {t.label}
                  <button onClick={() => removeTag(t.label)} aria-label={`Quitar ${t.label}`}>
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              );
            })}
            {tags.length === 0 && <span className="text-[13px] text-[var(--muted)] font-['DM_Sans',sans-serif]">Aún no agregas etiquetas.</span>}
          </div>
          <div className="flex gap-2">
            <select
              value={newTagCat}
              onChange={(e) => setNewTagCat(e.target.value as TagCategory)}
              className={field + ' flex-none w-[120px] py-2.5'}
            >
              {CATEGORY_ORDER.map((c) => <option key={c} value={c}>{TAG_CATEGORIES[c].label}</option>)}
            </select>
            <input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
              placeholder="Agregar etiqueta"
              className={field + ' flex-1 py-2.5'}
            />
            <button
              onClick={addTag}
              className="flex-none w-11 rounded-[12px] bg-[var(--ink)] text-white flex items-center justify-center hover:bg-[#2C2523] transition-colors"
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
