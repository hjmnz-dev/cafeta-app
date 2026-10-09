// Versión y fecha de los textos legales (spec 0009, decisión 12).
// La API guarda esta misma cadena al registrarse (`TERMS_VERSION` en
// `cafeta-api/src/modules/auth/auth.constants.ts`): al cambiar los textos,
// se cambian las dos.
export const TERMS_VERSION = '2026-10';
export const LEGAL_UPDATED_AT = '7 de octubre de 2026';

export interface LegalSection {
  readonly heading: string;
  readonly paragraphs: readonly string[];
}

export interface LegalDocument {
  readonly title: string;
  readonly intro: string;
  readonly sections: readonly LegalSection[];
}

export const TERMS_DOCUMENT: LegalDocument = {
  title: 'Términos de uso',
  intro:
    'Estos términos explican cómo se usa Cafeta, la red social de la comunidad universitaria de INTEC. Al crear tu cuenta aceptas lo que dicen aquí. Léelos con calma: están escritos en palabras simples.',
  sections: [
    {
      heading: '1. Qué es Cafeta',
      paragraphs: [
        'Cafeta es un proyecto académico, desarrollado por estudiantes de INTEC para el curso ING-IDS325-01. Es un espacio para publicar, compartir historias, seguir a otras personas y escribirse dentro de la comunidad universitaria.',
        'No es un servicio comercial. Puede cambiar, tener fallas o cerrar al terminar el proyecto.',
      ],
    },
    {
      heading: '2. Quién puede usarla',
      paragraphs: [
        'Para registrarte necesitas un correo institucional de INTEC (@est.intec.edu.do). Cada cuenta es personal: no la compartas ni crees cuentas para hacerte pasar por otra persona.',
      ],
    },
    {
      heading: '3. Tu cuenta',
      paragraphs: [
        'Eres responsable de la contraseña y de lo que ocurra con tu sesión. Si crees que alguien entró a tu cuenta, cambia tu contraseña con la opción de recuperarla.',
        'Los datos que das al registrarte y en tu perfil deben ser ciertos. Puedes desactivar tu cuenta cuando quieras desde Configuración.',
      ],
    },
    {
      heading: '4. Lo que publicas',
      paragraphs: [
        'Todo lo que publicas (textos, imágenes, videos, archivos, historias, comentarios y mensajes) es tu responsabilidad. Publica solo contenido que puedas compartir.',
        'Al publicarlo nos permites mostrarlo dentro de Cafeta a las personas que tú elijas con tu configuración de privacidad. El contenido sigue siendo tuyo.',
      ],
    },
    {
      heading: '5. Normas de convivencia',
      paragraphs: [
        'En Cafeta no se permite: acosar o amenazar a otras personas, enviar spam, suplantar a alguien, ni publicar contenido inapropiado, ilegal o que viole los derechos de otros.',
        'Si ves algo que rompe estas normas, repórtalo desde el menú de la publicación o del perfil. Si te bloquean, no podrás ver ni contactar a esa persona.',
      ],
    },
    {
      heading: '6. Reportes y sanciones',
      paragraphs: [
        'Un administrador revisa los reportes. Si el contenido rompe las normas, puede desactivarlo; si la falta es grave, puede desactivar la cuenta. Una cuenta desactivada por un administrador no puede iniciar sesión hasta que otro administrador la reactive.',
        'Las acciones de los administradores quedan registradas en una bitácora de auditoría.',
      ],
    },
    {
      heading: '7. Tus datos',
      paragraphs: [
        'Cómo cuidamos tus datos está explicado en la Política de privacidad. Al aceptar estos términos también aceptas esa política.',
      ],
    },
    {
      heading: '8. Sin garantías',
      paragraphs: [
        'Cafeta se ofrece tal como está. No prometemos que esté disponible todo el tiempo ni que no tenga errores. No nos hacemos responsables por pérdidas causadas por una falla del servicio.',
      ],
    },
    {
      heading: '9. Cambios a estos términos',
      paragraphs: [
        'Podemos actualizar estos términos. Cada versión tiene una fecha, que aparece arriba, y la versión que aceptaste queda guardada con tu cuenta.',
      ],
    },
    {
      heading: '10. Contacto',
      paragraphs: [
        'Si tienes dudas sobre estos términos, escríbele al Equipo 03 de Cafeta o habla con un administrador de la plataforma.',
      ],
    },
  ],
};

export const PRIVACY_DOCUMENT: LegalDocument = {
  title: 'Política de privacidad',
  intro:
    'Aquí te contamos qué datos guarda Cafeta, para qué los usa y qué puedes controlar tú. Cafeta es un proyecto académico y guarda solo lo necesario para funcionar.',
  sections: [
    {
      heading: '1. Qué datos guardamos',
      paragraphs: [
        'De tu cuenta: tu correo institucional, tu contraseña (guardada cifrada, nunca en texto simple), tu nombre, tu usuario, tu carrera, tu foto y tu descripción.',
        'De lo que haces: tus publicaciones, historias, comentarios, reacciones, guardados, mensajes, personas que sigues y que te siguen, bloqueos y reportes.',
        'De tu uso técnico: la fecha de cada sesión, la dirección IP y el navegador con que entraste, y la fecha y versión de los términos que aceptaste.',
      ],
    },
    {
      heading: '2. Para qué los usamos',
      paragraphs: [
        'Para que la app funcione: iniciar sesión, mostrar tu perfil y tu feed, enviarte notificaciones y entregar tus mensajes.',
        'Para cuidar la comunidad: revisar reportes, aplicar las normas y mantener una bitácora de auditoría de las acciones importantes.',
        'Usamos tu correo para enviarte el enlace de recuperar contraseña. No lo usamos para publicidad ni lo vendemos.',
      ],
    },
    {
      heading: '3. Quién puede ver tu información',
      paragraphs: [
        'Tú decides quién ve tu perfil y tu contenido: todos, solo tus seguidores o nadie. Lo cambias en Configuración, en Privacidad.',
        'Tus mensajes solo los ven las dos personas de la conversación. Los administradores pueden ver los reportes y la bitácora para moderar la plataforma.',
      ],
    },
    {
      heading: '4. Tus archivos',
      paragraphs: [
        'Las imágenes, videos y documentos que subes se guardan en un almacenamiento privado. Se muestran con enlaces temporales que dejan de servir pasado un rato, así que no quedan abiertos a cualquiera.',
      ],
    },
    {
      heading: '5. Cuánto tiempo los guardamos',
      paragraphs: [
        'Guardamos tus datos mientras tengas cuenta. Si desactivas tu cuenta, deja de verse en Cafeta, pero conservamos tu historial para poder auditar lo que ocurrió. No borramos los datos de forma definitiva.',
      ],
    },
    {
      heading: '6. Lo que puedes controlar',
      paragraphs: [
        'Puedes editar tu perfil, elegir quién ve tu contenido, bloquear a otras personas, desactivar tus publicaciones o historias y desactivar tu cuenta. También puedes apagar los tipos de notificación que no quieras.',
      ],
    },
    {
      heading: '7. Servicios que usamos',
      paragraphs: [
        'Para funcionar usamos servicios de otras empresas: Microsoft Azure para alojar la app y los archivos, Supabase para la base de datos, Sentry para detectar errores y el correo de Google para enviar el enlace de recuperar contraseña.',
        'Los informes de errores se limpian para no incluir contraseñas ni el texto de tus mensajes.',
      ],
    },
    {
      heading: '8. Cómo protegemos tus datos',
      paragraphs: [
        'La conexión va cifrada (HTTPS), las contraseñas se guardan cifradas, limitamos los intentos de iniciar sesión y las sesiones se pueden cerrar. Ninguna medida es perfecta, pero hacemos lo posible por cuidar tu información.',
      ],
    },
    {
      heading: '9. Cambios a esta política',
      paragraphs: [
        'Podemos actualizar esta política. La fecha de arriba te dice cuándo fue la última vez.',
      ],
    },
    {
      heading: '10. Contacto',
      paragraphs: [
        'Para preguntas sobre tus datos, escríbele al Equipo 03 de Cafeta o habla con un administrador de la plataforma.',
      ],
    },
  ],
};
