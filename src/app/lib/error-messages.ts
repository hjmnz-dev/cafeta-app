/**
 * Mensajes para el usuario por código de error de la API (spec 0004).
 *
 * La app nunca muestra el `message` crudo de la API: traduce el `code` estable
 * a un texto en español pensado para quien usa Cafeta.
 */
const MESSAGES: Readonly<Record<string, string>> = {
  EMAIL_NOT_INSTITUTIONAL: 'Usa tu correo institucional de INTEC.',
  EMAIL_TAKEN: 'Ya existe una cuenta con ese correo.',
  HANDLE_TAKEN: 'Ese nombre de usuario ya está en uso.',
  CAREER_NOT_FOUND: 'Elige una carrera de la lista.',
  INVALID_CREDENTIALS: 'Correo o contraseña incorrectos.',
  ACCOUNT_INACTIVE: 'Tu cuenta no está activa.',
  SESSION_REVOKED: 'Tu sesión terminó. Inicia sesión de nuevo.',
  UNAUTHORIZED: 'Tu sesión terminó. Inicia sesión de nuevo.',
  TOO_MANY_REQUESTS: 'Demasiados intentos. Espera un minuto.',
  VALIDATION_ERROR: 'Revisa los datos del formulario.',
  NETWORK_ERROR: 'No hay conexión con Cafeta. Intenta de nuevo.',
  POST_CONTENT_REQUIRED: 'Escribe algo antes de publicar.',
  INVALID_CURSOR: 'La lista cambió. Vuelve a cargarla.',
  USER_NOT_FOUND: 'Este perfil no existe o ya no está disponible.',
  CANNOT_MESSAGE_SELF: 'No puedes escribirte a ti mismo.',
  CONVERSATION_NOT_FOUND: 'Esta conversación ya no está disponible.',
  MESSAGE_CONTENT_REQUIRED: 'Escribe algo antes de enviar.',
  PROFILE_RESTRICTED:
    'Este perfil comparte su contenido solo con quien lo sigue.',
};

export const GENERIC_ERROR_MESSAGE = 'Algo salió mal. Intenta de nuevo.';

export function messageForCode(code: string): string {
  return MESSAGES[code] ?? GENERIC_ERROR_MESSAGE;
}
