/**
 * Mensajes para el usuario por código de error de la API (spec 0004).
 *
 * La app nunca muestra el `message` crudo de la API: traduce el `code` estable
 * a un texto en español pensado para quien usa Cafeta.
 */
import { ALLOWED_FORMATS_TEXT } from './media';

const MESSAGES: Readonly<Record<string, string>> = {
  EMAIL_NOT_INSTITUTIONAL: 'Usa tu correo institucional de INTEC.',
  EMAIL_TAKEN: 'Ya existe una cuenta con ese correo.',
  HANDLE_TAKEN: 'Ese nombre de usuario ya está en uso.',
  CAREER_NOT_FOUND: 'Elige una carrera de la lista.',
  INVALID_CREDENTIALS: 'Correo o contraseña incorrectos.',
  ACCOUNT_INACTIVE: 'Tu cuenta no está activa.',
  INVALID_PASSWORD: 'La contraseña no es correcta.',
  ADMIN_CANNOT_SELF_DEACTIVATE:
    'Un administrador no puede desactivar su propia cuenta.',
  SESSION_REVOKED: 'Tu sesión terminó. Inicia sesión de nuevo.',
  UNAUTHORIZED: 'Tu sesión terminó. Inicia sesión de nuevo.',
  TOO_MANY_REQUESTS: 'Demasiados intentos. Espera un minuto.',
  VALIDATION_ERROR: 'Revisa los datos del formulario.',
  NETWORK_ERROR: 'No hay conexión con Cafeta. Intenta de nuevo.',
  POST_CONTENT_REQUIRED: 'Escribe algo antes de publicar.',
  INVALID_CURSOR: 'La lista cambió. Vuelve a cargarla.',
  UNSUPPORTED_MEDIA_TYPE: `Ese formato no se puede subir. ${ALLOWED_FORMATS_TEXT}`,
  FILE_TOO_LARGE: `El archivo es muy grande. ${ALLOWED_FORMATS_TEXT}`,
  FILE_REQUIRED: 'Elige un archivo para subir.',
  STORAGE_UNAVAILABLE: 'No pudimos subir el archivo ahora. Intenta más tarde.',
  STORY_MEDIA_INVALID: 'Una historia lleva una imagen o un video.',
  MEDIA_NOT_FOUND: 'Uno de los archivos ya no está. Quítalo y súbelo de nuevo.',
  POST_NOT_FOUND: 'Esa publicación ya no existe.',
  NOT_POST_AUTHOR: 'Solo quien publicó puede cambiar esta publicación.',
  POST_INACTIVE: 'Reactiva la publicación antes de editarla.',
  POST_FIELD_NOT_ALLOWED: 'Ese dato no aplica a este tipo de publicación.',
  MEDIA_COMBINATION_INVALID:
    'Puedes adjuntar hasta 4 imágenes, o 1 video, o 1 PDF.',
  USER_NOT_FOUND: 'Este perfil no existe o ya no está disponible.',
  CANNOT_MESSAGE_SELF: 'No puedes escribirte a ti mismo.',
  CONVERSATION_NOT_FOUND: 'Esta conversación ya no está disponible.',
  MESSAGE_CONTENT_REQUIRED: 'Escribe algo antes de enviar.',
  MESSAGE_NOT_FOUND: 'El mensaje ya no está disponible.',
  NOT_MESSAGE_AUTHOR: 'Solo quien envió el mensaje puede cambiarlo.',
  ALREADY_INACTIVE: 'Esto ya estaba desactivado.',
  STORY_NOT_FOUND: 'Esta historia ya no está disponible.',
  NOT_STORY_AUTHOR: 'Solo quien publicó la historia puede cambiarla.',
  STORY_EXPIRED: 'Esta historia ya venció y no se puede cambiar.',
  NOTIFICATION_NOT_FOUND: 'Esta notificación ya no está disponible.',
  PROFILE_RESTRICTED:
    'Este perfil comparte su contenido solo con quien lo sigue.',
  CANNOT_FOLLOW_SELF: 'No puedes seguirte a ti mismo.',
  FOLLOW_NOT_FOUND: 'No sigues a este usuario.',
  FOLLOW_REQUEST_NOT_FOUND: 'La solicitud ya no está disponible.',
  PROFILE_PRIVATE: 'Esta cuenta es privada y no admite seguidores.',
};

export const GENERIC_ERROR_MESSAGE = 'Algo salió mal. Intenta de nuevo.';

export function messageForCode(code: string): string {
  return MESSAGES[code] ?? GENERIC_ERROR_MESSAGE;
}
