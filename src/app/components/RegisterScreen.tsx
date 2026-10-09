import { useEffect, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router';
import { CafetaLogo } from './Logo';
import { Checkbox } from './Checkbox';
import { careersApi, type Career } from '../lib/auth-api';
import { ApiError } from '../lib/http';
import { GENERIC_ERROR_MESSAGE } from '../lib/error-messages';
import { passwordProblem } from '../lib/password';
import { useSession } from '../store/SessionStore';

const HANDLE_PATTERN = /^[a-z0-9._]{3,30}$/;

interface FieldErrors {
  nombre?: string;
  apellido?: string;
  email?: string;
  handle?: string;
  careerId?: string;
  password?: string;
  confirmPassword?: string;
  terms?: string;
}

// Errores de la API que pertenecen a un campo del formulario (spec 0004).
const FIELD_BY_CODE: Readonly<Record<string, keyof FieldErrors>> = {
  EMAIL_NOT_INSTITUTIONAL: 'email',
  EMAIL_TAKEN: 'email',
  HANDLE_TAKEN: 'handle',
  CAREER_NOT_FOUND: 'careerId',
};

export function RegisterScreen() {
  const navigate = useNavigate();
  const { register } = useSession();
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [email, setEmail] = useState('');
  const [handle, setHandle] = useState('');
  const [careerId, setCareerId] = useState('');
  const [careers, setCareers] = useState<Career[]>([]);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // El catálogo de carreras viene de la API (GET /careers).
  useEffect(() => {
    let active = true;
    careersApi
      .list()
      .then((list) => {
        if (active) setCareers(list);
      })
      .catch((error: unknown) => {
        if (active)
          setFormError(
            error instanceof ApiError
              ? error.userMessage
              : GENERIC_ERROR_MESSAGE,
          );
      });
    return () => {
      active = false;
    };
  }, []);

  const validate = () => {
    const newErrors: FieldErrors = {};
    if (!nombre.trim()) newErrors.nombre = 'El nombre es requerido';
    if (!apellido.trim()) newErrors.apellido = 'El apellido es requerido';
    if (!email.trim()) {
      newErrors.email = 'El correo electrónico es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Ingresa un correo electrónico válido';
    }
    if (!HANDLE_PATTERN.test(handle.trim().toLowerCase())) {
      newErrors.handle = 'Usa de 3 a 30 letras, números, punto o guion bajo';
    }
    if (!careerId) newErrors.careerId = 'Elige tu carrera';
    const passwordError = passwordProblem(password);
    if (passwordError) newErrors.password = passwordError;
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Confirma tu contraseña';
    } else if (confirmPassword !== password) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }
    if (!acceptTerms) {
      newErrors.terms = 'Debes aceptar los términos y condiciones';
    }
    return newErrors;
  };

  const handleSubmit = async () => {
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    setFormError(null);
    setSubmitting(true);
    try {
      await register({
        email: email.trim(),
        password,
        firstName: nombre.trim(),
        lastName: apellido.trim(),
        handle: handle.trim().toLowerCase(),
        careerId,
        acceptTerms,
      });
      navigate('/home', { replace: true });
    } catch (error) {
      if (!(error instanceof ApiError)) {
        setFormError(GENERIC_ERROR_MESSAGE);
        return;
      }
      const field = FIELD_BY_CODE[error.code];
      if (field) setErrors({ [field]: error.userMessage });
      else setFormError(error.userMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = (field: keyof FieldErrors) => {
    const isError = !!errors[field];
    const isFocused = focusedField === field;
    return [
      'w-full h-[52px] px-4 rounded-[12px] text-[15px] text-[var(--ink)] outline-none transition-all duration-200',
      'placeholder:text-[var(--muted)] font-["DM_Sans",sans-serif]',
      isError
        ? 'bg-[var(--tint)] border-2 border-[var(--brand)]'
        : isFocused
          ? 'bg-[var(--surface)] border-2 border-[var(--brand)] shadow-[0_4px_16px_rgba(214,40,40,0.12)]'
          : 'bg-[var(--surface-3)] border-2 border-transparent',
    ].join(' ');
  };

  const clearError = (field: keyof FieldErrors) => {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  return (
    <div className="w-full h-full bg-[var(--surface)] flex flex-col overflow-y-auto">
      <div className="pt-[60px] px-6 flex flex-col items-center">
        {/* Logo */}
        <div className="mb-8">
          <CafetaLogo size={64} tagline="solo con correo @uni" />
        </div>

        {/* Title */}
        <h1 className="font-['Space Grotesk',serif] text-[32px] font-bold text-[var(--ink)] text-center mb-2">
          Crear Cuenta
        </h1>
        <p className="text-[var(--muted)] text-[15px] text-center mb-8">
          Únete a la comunidad Cafeta
        </p>

        {/* Form */}
        <div className="w-full flex flex-col gap-4">
          {/* Nombre + Apellido row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="register-first-name"
                className="block text-[14px] font-semibold text-[var(--ink)] mb-2 font-['DM_Sans',sans-serif]"
              >
                Nombre
              </label>
              <input
                id="register-first-name"
                type="text"
                placeholder="Juan"
                value={nombre}
                onChange={(e) => {
                  setNombre(e.target.value);
                  clearError('nombre');
                }}
                onFocus={() => setFocusedField('nombre')}
                onBlur={() => setFocusedField(null)}
                className={inputClass('nombre')}
              />
              {errors.nombre && (
                <p className="mt-1.5 text-[11px] text-[var(--brand)] font-['DM_Sans',sans-serif]">
                  {errors.nombre}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="register-last-name"
                className="block text-[14px] font-semibold text-[var(--ink)] mb-2 font-['DM_Sans',sans-serif]"
              >
                Apellido
              </label>
              <input
                id="register-last-name"
                type="text"
                placeholder="Pérez"
                value={apellido}
                onChange={(e) => {
                  setApellido(e.target.value);
                  clearError('apellido');
                }}
                onFocus={() => setFocusedField('apellido')}
                onBlur={() => setFocusedField(null)}
                className={inputClass('apellido')}
              />
              {errors.apellido && (
                <p className="mt-1.5 text-[11px] text-[var(--brand)] font-['DM_Sans',sans-serif]">
                  {errors.apellido}
                </p>
              )}
            </div>
          </div>

          {/* Email */}
          <div>
            <label
              htmlFor="register-email"
              className="block text-[14px] font-semibold text-[var(--ink)] mb-2 font-['DM_Sans',sans-serif]"
            >
              Correo Electrónico
            </label>
            <input
              id="register-email"
              type="email"
              placeholder="tu@est.intec.edu.do"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearError('email');
              }}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
              className={inputClass('email')}
            />
            {errors.email && (
              <p className="mt-1.5 text-[12px] text-[var(--brand)] font-['DM_Sans',sans-serif]">
                {errors.email}
              </p>
            )}
          </div>

          {/* Handle */}
          <div>
            <label
              htmlFor="register-handle"
              className="block text-[14px] font-semibold text-[var(--ink)] mb-2 font-['DM_Sans',sans-serif]"
            >
              Nombre de usuario
            </label>
            <input
              id="register-handle"
              type="text"
              placeholder="cgomez_intec"
              autoCapitalize="none"
              value={handle}
              onChange={(e) => {
                setHandle(e.target.value);
                clearError('handle');
              }}
              onFocus={() => setFocusedField('handle')}
              onBlur={() => setFocusedField(null)}
              className={inputClass('handle')}
            />
            {errors.handle && (
              <p className="mt-1.5 text-[12px] text-[var(--brand)] font-['DM_Sans',sans-serif]">
                {errors.handle}
              </p>
            )}
          </div>

          {/* Carrera */}
          <div>
            <label
              htmlFor="register-career"
              className="block text-[14px] font-semibold text-[var(--ink)] mb-2 font-['DM_Sans',sans-serif]"
            >
              Carrera
            </label>
            <select
              id="register-career"
              value={careerId}
              onChange={(e) => {
                setCareerId(e.target.value);
                clearError('careerId');
              }}
              onFocus={() => setFocusedField('careerId')}
              onBlur={() => setFocusedField(null)}
              className={inputClass('careerId')}
            >
              <option value="">Elige tu carrera</option>
              {careers.map((career) => (
                <option key={career.id} value={career.id}>
                  {career.name}
                </option>
              ))}
            </select>
            {errors.careerId && (
              <p className="mt-1.5 text-[12px] text-[var(--brand)] font-['DM_Sans',sans-serif]">
                {errors.careerId}
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="register-password"
              className="block text-[14px] font-semibold text-[var(--ink)] mb-2 font-['DM_Sans',sans-serif]"
            >
              Contraseña
            </label>
            <div className="relative">
              <input
                id="register-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearError('password');
                }}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                className={`${inputClass('password')} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={
                  showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
                }
                aria-pressed={showPassword}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1.5 text-[12px] text-[var(--brand)] font-['DM_Sans',sans-serif]">
                {errors.password}
              </p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label
              htmlFor="register-confirm"
              className="block text-[14px] font-semibold text-[var(--ink)] mb-2 font-['DM_Sans',sans-serif]"
            >
              Confirmar Contraseña
            </label>
            <div className="relative">
              <input
                id="register-confirm"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  clearError('confirmPassword');
                }}
                onFocus={() => setFocusedField('confirmPassword')}
                onBlur={() => setFocusedField(null)}
                className={`${inputClass('confirmPassword')} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={
                  showConfirmPassword
                    ? 'Ocultar confirmación de contraseña'
                    : 'Mostrar confirmación de contraseña'
                }
                aria-pressed={showConfirmPassword}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="mt-1.5 text-[12px] text-[var(--brand)] font-['DM_Sans',sans-serif]">
                {errors.confirmPassword}
              </p>
            )}
          </div>

          {/* Terms Checkbox */}
          <div>
            <Checkbox
              checked={acceptTerms}
              error={Boolean(errors.terms)}
              onChange={(value) => {
                setAcceptTerms(value);
                clearError('terms');
              }}
            >
              Acepto los{' '}
              {/* Los enlaces no deben marcar la casilla al pulsarlos, y abren en
                  otra pestaña para no perder lo que ya escribiste. */}
              <a
                href="/terms"
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-[var(--brand)] font-semibold hover:text-[var(--brand-strong)] transition-colors"
              >
                términos y condiciones
              </a>{' '}
              y la{' '}
              <a
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-[var(--brand)] font-semibold hover:text-[var(--brand-strong)] transition-colors"
              >
                política de privacidad
              </a>
            </Checkbox>
            {errors.terms && (
              <p className="mt-1.5 text-[12px] text-[var(--brand)] font-['DM_Sans',sans-serif] ml-7">
                {errors.terms}
              </p>
            )}
          </div>

          {formError && (
            <p
              role="alert"
              className="text-[14px] text-[var(--brand)] font-semibold text-center font-['DM_Sans',sans-serif]"
            >
              {formError}
            </p>
          )}

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full h-[52px] bg-[var(--brand)] text-[var(--on-brand)] rounded-[14px] text-[16px] font-semibold mt-1 hover:bg-[var(--brand-strong)] active:scale-[0.98] transition-all duration-150 shadow-[0_4px_16px_rgba(214,40,40,0.3)] font-['DM_Sans',sans-serif]"
          >
            {submitting ? 'Creando cuenta…' : 'Registrarse'}
          </button>

          {/* Login Link */}
          <p className="text-center text-[14px] text-[var(--muted)] mt-2 pb-10 font-['DM_Sans',sans-serif]">
            ¿Ya tienes cuenta?{' '}
            <button
              onClick={() => navigate('/login')}
              className="text-[var(--brand)] font-semibold hover:text-[var(--brand-strong)] transition-colors"
            >
              Inicia sesión
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
