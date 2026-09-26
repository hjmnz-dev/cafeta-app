/**
 * Reglas de la contraseña al registrarse (spec 0004): de 8 a 72 caracteres,
 * con al menos una letra y un número. La API aplica las mismas reglas.
 */
export function passwordProblem(password: string): string | null {
  if (!password) return 'La contraseña es requerida';
  if (password.length < 8 || password.length > 72) {
    return 'La contraseña debe tener de 8 a 72 caracteres';
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return 'La contraseña debe tener al menos una letra y un número';
  }
  return null;
}
