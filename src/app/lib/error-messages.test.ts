import { describe, expect, it } from 'vitest';
import { GENERIC_ERROR_MESSAGE, messageForCode } from './error-messages';

// Tabla "Mensajes de la web por código" de la spec 0004 (AC-13).
describe('messageForCode', () => {
  it.each([
    ['EMAIL_NOT_INSTITUTIONAL', 'Usa tu correo institucional de INTEC.'],
    ['EMAIL_TAKEN', 'Ya existe una cuenta con ese correo.'],
    ['HANDLE_TAKEN', 'Ese nombre de usuario ya está en uso.'],
    ['CAREER_NOT_FOUND', 'Elige una carrera de la lista.'],
    ['INVALID_CREDENTIALS', 'Correo o contraseña incorrectos.'],
    ['ACCOUNT_INACTIVE', 'Tu cuenta no está activa.'],
    ['SESSION_REVOKED', 'Tu sesión terminó. Inicia sesión de nuevo.'],
    ['UNAUTHORIZED', 'Tu sesión terminó. Inicia sesión de nuevo.'],
    ['TOO_MANY_REQUESTS', 'Demasiados intentos. Espera un minuto.'],
    ['VALIDATION_ERROR', 'Revisa los datos del formulario.'],
  ])('AC-13: %s se traduce a su mensaje en español', (code, message) => {
    expect(messageForCode(code)).toBe(message);
  });

  it.each(['NOT_FOUND', 'UNKNOWN', '', 'email_taken'])(
    'AC-13: un código desconocido (%j) da el mensaje genérico',
    (code) => {
      expect(messageForCode(code)).toBe(GENERIC_ERROR_MESSAGE);
    },
  );

  it.each([
    ['POST_CONTENT_REQUIRED', 'Escribe algo antes de publicar.'],
    ['INVALID_CURSOR', 'La lista cambió. Vuelve a cargarla.'],
  ])(
    'spec 0005 · AC-2: %s se traduce a su mensaje en español',
    (code, message) => {
      expect(messageForCode(code)).toBe(message);
    },
  );

  it.each([
    ['INVALID_PASSWORD', 'La contraseña no es correcta.'],
    [
      'ADMIN_CANNOT_SELF_DEACTIVATE',
      'Un administrador no puede desactivar su propia cuenta.',
    ],
  ])('spec 0009 · decisión 11: %s se traduce a su mensaje', (code, message) => {
    expect(messageForCode(code)).toBe(message);
  });

  it('el mensaje genérico es el de la spec', () => {
    expect(GENERIC_ERROR_MESSAGE).toBe('Algo salió mal. Intenta de nuevo.');
  });
});
