import React, { createContext, useContext, useEffect, useState } from 'react';

/**
 * Estado de aplicación en el cliente (sin backend todavía).
 *
 * Persiste perfil y preferencias en localStorage para que los cambios de
 * "Editar perfil" (DEF-02) y "Configuración" (DEF-03) se reflejen de inmediato
 * en lo que ven terceros (ProfileScreen) y sobrevivan a recargas.
 *
 * Cuando exista el backend, basta reemplazar los setters por llamadas a la API
 * manteniendo la misma forma de datos.
 */

export interface Profile {
  name: string;
  handle: string;
  bio: string;
  career: string;
  location: string;
  joined: string;
  /** Etiquetas académicas ("estudios aprendidos"). Ver categoría en TAG_CATEGORIES. */
  tags: { label: string; category: TagCategory }[];
}

export type TagCategory = 'carrera' | 'habilidad' | 'interes';

export type ProfileVisibility = 'public' | 'followers' | 'private';

/** Apariencia de la app. El oscuro es el predeterminado del producto. */
export type Theme = 'dark' | 'light';

export interface Settings {
  visibility: ProfileVisibility;
  theme: Theme;
}

/** Otro usuario del directorio (para perfiles de terceros y seguimiento). */
export interface DirectoryUser {
  id: string;
  name: string;
  handle: string;
  career: string;
  bio: string;
  avatar: string;
  visibility: ProfileVisibility;
  followers: number;
  following: number;
  posts: number;
  tags: { label: string; category: TagCategory }[];
}

/** Estado de la relación de seguimiento del usuario actual hacia otro. */
export type FollowState = 'none' | 'following' | 'pending';

/** Id del usuario autenticado (el "yo"). Sin backend, es fijo. */
export const CURRENT_USER_ID = 'me';

export type PostType =
  'text' | 'study-notes' | 'pdf' | 'event' | 'code' | 'study-group';

export interface Post {
  id: string;
  authorId: string; // 'me' = publicación propia (habilita editar/eliminar)
  authorName: string;
  /** HU50: el autor tiene la insignia de cuenta verificada. */
  authorVerified?: boolean;
  authorAvatar: string;
  career: string;
  time: string;
  type: PostType;
  content: string;
  likes: number;
  comments: number;
  active: boolean; // baja lógica (HU23: "Desactivar")
  edited: boolean; // marca de "Editado" (HU22)
  // Campos por tipo (opcionales)
  resourceTitle?: string;
  resourceSize?: string;
  eventDate?: string;
  eventLocation?: string;
  codeSnippet?: string;
  groupName?: string;
  spotsAvailable?: number;
  /** Ubicación opcional en el campus (HU21). */
  location?: string;
  /** Imágenes adjuntas: data URL en el prototipo, enlace de Blob con la API. */
  images?: string[];
  /** Video adjunto (enlace de Blob, spec 0008 decisión 13). */
  videoUrl?: string;
  /** PDF adjunto (enlace de Blob, spec 0008 decisión 13). */
  documentUrl?: string;
}

/**
 * Mensaje de una conversación privada (FT07). Igual que en publicaciones e
 * historias, editar deja marca y retirar es una baja lógica: el registro se
 * conserva para trazabilidad (HU36/HU37).
 */
export interface Message {
  id: string;
  conversationId: string;
  text: string;
  /** Enviado por el usuario actual → habilita editar y retirar. */
  sentByMe: boolean;
  time: string;
  edited: boolean; // HU36
  active: boolean; // HU37
}

interface AppStateValue {
  profile: Profile;
  updateProfile: (patch: Partial<Profile>) => void;
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;
  /** Directorio de otros usuarios. */
  users: DirectoryUser[];
  getUser: (id: string) => DirectoryUser | undefined;
  /** Estado de seguimiento del usuario actual hacia `id`. */
  followState: (id: string) => FollowState;
  /** Seguir (HU26): perfiles privados quedan como solicitud 'pending'. */
  followUser: (id: string) => void;
  /** Dejar de seguir o cancelar solicitud (HU27). */
  unfollowUser: (id: string) => void;
  /** Ids que el usuario actual sigue (para el efecto en el feed, HU11). */
  followingIds: string[];
  // ── Publicaciones (DEF-09) ──
  posts: Post[];
  /** ¿La publicación es del usuario actual? (validación de autoría) */
  isOwnPost: (id: string) => boolean;
  /** Editar publicación propia (HU22), conservando interacciones. */
  editPost: (id: string, content: string) => void;
  /** Desactivar publicación propia — baja lógica (HU23). */
  deactivatePost: (id: string) => void;
  /** Revertir la baja lógica: vuelve a estar visible para todos (HU23). */
  reactivatePost: (id: string) => void;
  /** Eliminar publicación propia — borrado físico permanente (HU23, decisión de negocio). */
  deletePost: (id: string) => void;
  // ── Mensajería (DEF-06 · HU35-HU37) ──
  messages: Message[];
  /** Mensajes visibles de una conversación (los retirados no se muestran). */
  conversationMessages: (conversationId: string) => Message[];
  /** Enviar mensaje a una conversación (HU35). */
  sendMessage: (conversationId: string, text: string) => void;
  /** Editar un mensaje propio (HU36). */
  editMessage: (id: string, text: string) => void;
  /** Retirar un mensaje propio de la conversación — baja lógica (HU37). */
  deactivateMessage: (id: string) => void;
  // ── Seguridad y moderación (DEF-12 · FT11) ──
  /** Ids bloqueados por el usuario actual. */
  blockedIds: string[];
  isBlocked: (id: string) => boolean;
  /** Bloquear a un usuario: deja de seguirlo y oculta su contenido (HU53). */
  blockUser: (id: string) => void;
  /** Desbloquear (HU54). No restaura el seguimiento anterior. */
  unblockUser: (id: string) => void;
}

const DEFAULT_PROFILE: Profile = {
  name: 'Carlos Gómez',
  handle: '@cgomez_intec',
  bio: 'Estudiante de Ingeniería de Software. Apasionado por el desarrollo web y las inteligencias artificiales. 🚀 Buscando compañeros para proyectos.',
  career: 'Ing. Software',
  location: 'Santo Domingo, RD',
  joined: 'Sep 2022',
  tags: [
    { label: 'Ing. Software', category: 'carrera' },
    { label: 'Frontend', category: 'habilidad' },
    { label: 'ReactJS', category: 'habilidad' },
    { label: 'Diseño UI', category: 'interes' },
  ],
};

const DEFAULT_SETTINGS: Settings = {
  visibility: 'public',
  theme: 'dark',
};

const AV = (id: string) =>
  `https://images.unsplash.com/${id}?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400`;

/** Directorio de usuarios de demostración (reemplazable por la API). */
const SAMPLE_USERS: DirectoryUser[] = [
  {
    id: 'maria',
    name: 'María Rodríguez',
    handle: '@mrodriguez',
    career: 'Medicina',
    bio: 'Estudiante de Medicina. Apuntes, grupos de estudio y café. ☕',
    avatar: AV('photo-1557353425-09253747c2bf'),
    visibility: 'public',
    followers: 842,
    following: 310,
    posts: 27,
    tags: [
      { label: 'Medicina', category: 'carrera' },
      { label: 'Anatomía', category: 'habilidad' },
    ],
  },
  {
    id: 'juan',
    name: 'Juan Pérez',
    handle: '@jperez',
    career: 'Ing. Industrial',
    bio: 'Ing. Industrial. Optimizando procesos y horarios de estudio.',
    avatar: AV('photo-1611695434369-a8f5d76ceb7b'),
    visibility: 'public',
    followers: 512,
    following: 280,
    posts: 40,
    tags: [
      { label: 'Ing. Industrial', category: 'carrera' },
      { label: 'Lean', category: 'interes' },
    ],
  },
  {
    id: 'laura',
    name: 'Laura Batista',
    handle: '@lbatista',
    career: 'Ing. Software',
    bio: 'Frontend en formación. Buscando equipo para el proyecto final.',
    avatar: AV('photo-1570078070514-1f84a3cf1736'),
    visibility: 'private',
    followers: 1204,
    following: 190,
    posts: 63,
    tags: [
      { label: 'Ing. Software', category: 'carrera' },
      { label: 'React', category: 'habilidad' },
    ],
  },
  {
    id: 'pedro',
    name: 'Pedro Sánchez',
    handle: '@psanchez',
    career: 'Ing. Civil',
    bio: 'Ing. Civil. Estructuras, planos y mucho café.',
    avatar: AV('photo-1557862921-37829c790f19'),
    visibility: 'public',
    followers: 231,
    following: 205,
    posts: 15,
    tags: [{ label: 'Ing. Civil', category: 'carrera' }],
  },
];

/**
 * Avatar del usuario actual. Se exporta para que el perfil y las publicaciones
 * propias muestren la misma cara: verlo distinto en cada pantalla era parte de
 * lo señalado en DEF-08.
 */
export const MY_AVATAR = AV('photo-1500648767791-00dcc994a43e');
const ME_AVATAR = MY_AVATAR;

/**
 * Seguidores del usuario actual. Es el único dato del perfil que no se puede
 * derivar del estado local (nadie "sigue" al usuario dentro de la demo), así
 * que queda aquí, en un solo sitio, hasta que exista backend.
 */
export const MY_FOLLOWERS = 1204;

/** Publicaciones de demostración. Dos son del usuario actual ('me') → editables. */
const SAMPLE_POSTS: Post[] = [
  {
    id: 'p1',
    authorId: 'me',
    authorName: 'Carlos Gómez',
    authorAvatar: ME_AVATAR,
    career: 'Ing. Software',
    time: '15m',
    type: 'text',
    content:
      '¿Alguien más va a la charla de IA de esta tarde en el auditorio? Guardo puesto. 🤖',
    likes: 18,
    comments: 5,
    active: true,
    edited: false,
  },
  {
    id: 'p2',
    authorId: 'juan',
    authorName: 'Juan Pérez',
    authorAvatar: AV('photo-1611695434369-a8f5d76ceb7b'),
    career: 'Ing. Industrial',
    time: '2h',
    type: 'study-notes',
    content:
      'Resumen de Cálculo Diferencial para el parcial de mañana. ¡Espero les sirva! 📚',
    likes: 45,
    comments: 12,
    active: true,
    edited: false,
  },
  {
    id: 'p3',
    authorId: 'maria',
    authorName: 'María Rodríguez',
    authorAvatar: AV('photo-1557353425-09253747c2bf'),
    career: 'Medicina',
    time: '4h',
    type: 'pdf',
    content:
      'Libro de Anatomía Humana en PDF. Lo subo por aquí para quien lo necesite.',
    resourceTitle: 'Anatomia_Basica_Vol1.pdf',
    resourceSize: '4.2 MB',
    likes: 120,
    comments: 8,
    active: true,
    edited: false,
  },
  {
    id: 'p4',
    authorId: 'comite',
    authorName: 'Comité de Estudiantes',
    authorAvatar: AV('photo-1523240795612-9a054b0db644'),
    career: 'Todas',
    time: '1d',
    type: 'event',
    content:
      'Gran asamblea de inicio de trimestre en la Plazoleta. ¡Acompáñanos!',
    eventDate: 'Vie, 12 Oct • 4:00 PM',
    eventLocation: 'Plazoleta INTEC',
    likes: 89,
    comments: 3,
    active: true,
    edited: false,
  },
  {
    id: 'p5',
    authorId: 'me',
    authorName: 'Carlos Gómez',
    authorAvatar: ME_AVATAR,
    career: 'Ing. Software',
    time: '3h',
    type: 'code',
    content: 'Gente, ¿por qué este loop no termina? 😅 Me da OutOfMemoryError.',
    codeSnippet:
      'function findMax(arr) {\n  let max = arr[0];\n  for(let i=1; i < arr.length; i--) {\n    if(arr[i] > max) max = arr[i];\n  }\n  return max;\n}',
    likes: 12,
    comments: 24,
    active: true,
    edited: false,
  },
  {
    id: 'p6',
    authorId: 'laura',
    authorName: 'Laura Batista',
    authorAvatar: AV('photo-1570078070514-1f84a3cf1736'),
    career: 'Ing. Software',
    time: '1h',
    type: 'study-group',
    content:
      'Buscando 2 personas para el proyecto final de Desarrollo Web. Tema: App de delivery en React.',
    groupName: 'Frontend Ninjas',
    spotsAvailable: 2,
    likes: 34,
    comments: 15,
    active: true,
    edited: false,
  },
];

/**
 * Conversación de demostración con María (id '1'), la que aparece abierta en la
 * lista de mensajes. El resto arranca con el último mensaje que muestra la
 * lista, para que la vista previa y el hilo digan lo mismo.
 */
const SAMPLE_MESSAGES: Message[] = [
  {
    id: 'm1',
    conversationId: '1',
    text: 'Hola Carlos! ¿Cómo estás?',
    sentByMe: false,
    time: '10:30',
    edited: false,
    active: true,
  },
  {
    id: 'm2',
    conversationId: '1',
    text: 'Hola María! Todo bien, estudiando para el examen',
    sentByMe: true,
    time: '10:32',
    edited: false,
    active: true,
  },
  {
    id: 'm3',
    conversationId: '1',
    text: '¿Tienes los apuntes de Estructuras de Datos?',
    sentByMe: false,
    time: '10:33',
    edited: false,
    active: true,
  },
  {
    id: 'm4',
    conversationId: '1',
    text: 'Sí claro, te los comparto por aquí',
    sentByMe: true,
    time: '10:35',
    edited: false,
    active: true,
  },
  {
    id: 'm5',
    conversationId: '1',
    text: 'Muchas gracias! Eres el mejor',
    sentByMe: false,
    time: '10:36',
    edited: false,
    active: true,
  },
  {
    id: 'm6',
    conversationId: '2',
    text: 'Claro, nos vemos en la biblioteca a las 3',
    sentByMe: false,
    time: '09:15',
    edited: false,
    active: true,
  },
  {
    id: 'm7',
    conversationId: '3',
    text: '¡Gracias por la ayuda con el proyecto!',
    sentByMe: false,
    time: 'Ayer',
    edited: false,
    active: true,
  },
  {
    id: 'm8',
    conversationId: '4',
    text: '¿Vamos a estudiar juntos para el examen?',
    sentByMe: false,
    time: 'Lun',
    edited: false,
    active: true,
  },
  {
    id: 'm9',
    conversationId: '5',
    text: 'Vi tu post sobre React, muy interesante',
    sentByMe: false,
    time: 'Dom',
    edited: false,
    active: true,
  },
];

/** Semántica de color de las etiquetas del perfil (resuelve DEF-10). */
export const TAG_CATEGORIES: Record<
  TagCategory,
  { label: string; bg: string; text: string; border: string }
> = {
  // Tokens del tema (ver styles/theme.css): la distinción entre categorías
  // debe leerse igual en claro y en oscuro, así que se fija el papel de cada
  // una, no un color concreto.
  carrera: {
    label: 'Carrera',
    bg: 'var(--tag-carrera-bg)',
    text: 'var(--tag-carrera-ink)',
    border: 'var(--tag-carrera-line)',
  },
  habilidad: {
    label: 'Habilidad',
    bg: 'var(--tag-habilidad-bg)',
    text: 'var(--tag-habilidad-ink)',
    border: 'var(--tag-habilidad-line)',
  },
  interes: {
    label: 'Interés',
    bg: 'var(--tag-interes-bg)',
    text: 'var(--tag-interes-ink)',
    border: 'var(--tag-interes-line)',
  },
};

const STORAGE_KEY = 'cafeta.appstate.v1';

interface PersistedState {
  profile: Profile;
  settings: Settings;
  following: string[];
  pending: string[];
  posts: Post[];
  messages: Message[];
  blocked: string[];
}

function load(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        profile: { ...DEFAULT_PROFILE, ...parsed.profile },
        settings: {
          ...DEFAULT_SETTINGS,
          ...parsed.settings,
        },
        following: Array.isArray(parsed.following) ? parsed.following : [],
        pending: Array.isArray(parsed.pending) ? parsed.pending : [],
        posts: Array.isArray(parsed.posts) ? parsed.posts : SAMPLE_POSTS,
        messages: Array.isArray(parsed.messages)
          ? parsed.messages
          : SAMPLE_MESSAGES,
        blocked: Array.isArray(parsed.blocked) ? parsed.blocked : [],
      };
    }
  } catch {
    /* storage no disponible o corrupto: usar defaults */
  }
  return {
    profile: DEFAULT_PROFILE,
    settings: DEFAULT_SETTINGS,
    following: [],
    pending: [],
    posts: SAMPLE_POSTS,
    messages: SAMPLE_MESSAGES,
    blocked: [],
  };
}

let messageSeq = 0;
const nextMessageId = () => `msg-${++messageSeq}`;

const AppStateContext = createContext<AppStateValue | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [
    { profile, settings, following, pending, posts, messages, blocked },
    setState,
  ] = useState(load);

  useEffect(() => {
    const snapshot = {
      profile,
      settings,
      following,
      pending,
      posts,
      messages,
      blocked,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      // Sin espacio: lo más pesado son las imágenes en base64, así que se
      // reintenta sin ellas antes que perder el resto del estado.
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            ...snapshot,
            posts: posts.map(({ images: _images, ...p }) => p),
          }),
        );
      } catch {
        /* almacenamiento no disponible: el estado sigue solo en memoria */
      }
    }
  }, [profile, settings, following, pending, posts, messages, blocked]);

  const updateProfile = (patch: Partial<Profile>) =>
    setState((s) => ({ ...s, profile: { ...s.profile, ...patch } }));

  const updateSettings = (patch: Partial<Settings>) =>
    setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));

  // El tema vive en <html> para que los tokens de color (ver styles/theme.css)
  // apliquen a todo el árbol, incluidos los portales y el fondo del documento.
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = settings.theme;
    root.classList.toggle('dark', settings.theme === 'dark');
  }, [settings.theme]);

  const getUser = (id: string) => SAMPLE_USERS.find((u) => u.id === id);

  const followState = (id: string): FollowState =>
    following.includes(id)
      ? 'following'
      : pending.includes(id)
        ? 'pending'
        : 'none';

  const followUser = (id: string) =>
    setState((s) => {
      if (
        s.following.includes(id) ||
        s.pending.includes(id) ||
        s.blocked.includes(id)
      )
        return s;
      const user = getUser(id);
      // HU26: perfil restringido → solicitud pendiente de aprobación.
      if (user && user.visibility === 'private') {
        return { ...s, pending: [...s.pending, id] };
      }
      return { ...s, following: [...s.following, id] };
    });

  const unfollowUser = (id: string) =>
    setState((s) => ({
      ...s,
      following: s.following.filter((x) => x !== id),
      pending: s.pending.filter((x) => x !== id),
    }));

  const isOwnPost = (id: string) =>
    posts.find((p) => p.id === id)?.authorId === CURRENT_USER_ID;

  // Solo el autor puede editar/desactivar/eliminar (validación de autoría).
  // Solo se marca como editada si el contenido realmente cambió: guardar sin
  // tocar nada no debe ensuciar la publicación con la marca "Editado".
  const editPost = (id: string, content: string) =>
    setState((s) => ({
      ...s,
      posts: s.posts.map((p) =>
        p.id === id && p.authorId === CURRENT_USER_ID
          ? { ...p, content, edited: p.edited || content !== p.content }
          : p,
      ),
    }));

  const setActive = (id: string, active: boolean) =>
    setState((s) => ({
      ...s,
      posts: s.posts.map((p) =>
        p.id === id && p.authorId === CURRENT_USER_ID ? { ...p, active } : p,
      ),
    }));

  const deactivatePost = (id: string) => setActive(id, false);
  const reactivatePost = (id: string) => setActive(id, true);

  const deletePost = (id: string) =>
    setState((s) => ({
      ...s,
      posts: s.posts.filter(
        (p) => !(p.id === id && p.authorId === CURRENT_USER_ID),
      ),
    }));

  // ── Mensajería (DEF-06 · HU35-HU37) ─────────────────────────────────────
  // Solo se puede editar o retirar lo que uno mismo envió, y retirar es baja
  // lógica: el mensaje sale de la conversación pero su registro se conserva.

  const conversationMessages = (conversationId: string) =>
    messages.filter((m) => m.conversationId === conversationId && m.active);

  const sendMessage = (conversationId: string, text: string) =>
    setState((s) => ({
      ...s,
      messages: [
        ...s.messages,
        {
          id: nextMessageId(),
          conversationId,
          text,
          sentByMe: true,
          time: new Date().toLocaleTimeString('es', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          edited: false,
          active: true,
        },
      ],
    }));

  const editMessage = (id: string, text: string) =>
    setState((s) => ({
      ...s,
      messages: s.messages.map((m) =>
        m.id === id && m.sentByMe
          ? { ...m, text, edited: m.edited || text !== m.text }
          : m,
      ),
    }));

  const deactivateMessage = (id: string) =>
    setState((s) => ({
      ...s,
      messages: s.messages.map((m) =>
        m.id === id && m.sentByMe ? { ...m, active: false } : m,
      ),
    }));

  // ── Seguridad y moderación (DEF-12 · FT11) ──────────────────────────────
  // Bloquear corta la relación en ambos sentidos hasta donde alcanza el cliente:
  // se deja de seguir y su contenido se oculta del feed, historias y búsqueda.

  const isBlocked = (id: string) => blocked.includes(id);

  const blockUser = (id: string) =>
    setState((s) => ({
      ...s,
      blocked: s.blocked.includes(id) ? s.blocked : [...s.blocked, id],
      following: s.following.filter((x) => x !== id),
      pending: s.pending.filter((x) => x !== id),
    }));

  const unblockUser = (id: string) =>
    setState((s) => ({ ...s, blocked: s.blocked.filter((x) => x !== id) }));

  return (
    <AppStateContext.Provider
      value={{
        profile,
        updateProfile,
        settings,
        updateSettings,
        users: SAMPLE_USERS,
        getUser,
        followState,
        followUser,
        unfollowUser,
        followingIds: following,
        posts,
        isOwnPost,
        editPost,
        deactivatePost,
        reactivatePost,
        deletePost,
        messages,
        conversationMessages,
        sendMessage,
        editMessage,
        deactivateMessage,
        blockedIds: blocked,
        isBlocked,
        blockUser,
        unblockUser,
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState(): AppStateValue {
  const ctx = useContext(AppStateContext);
  if (!ctx)
    throw new Error('useAppState debe usarse dentro de <AppStateProvider>');
  return ctx;
}
