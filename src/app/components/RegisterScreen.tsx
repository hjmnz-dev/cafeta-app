import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router';
import { CafetaLogo } from './Logo';
import { Checkbox } from './Checkbox';

interface FieldErrors {
  nombre?: string;
  apellido?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  terms?: string;
}

export function RegisterScreen() {
  const navigate = useNavigate();
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const validate = () => {
    const newErrors: FieldErrors = {};
    if (!nombre.trim()) newErrors.nombre = 'El nombre es requerido';
    if (!apellido.trim()) newErrors.apellido = 'El apellido es requerido';
    if (!email.trim()) {
      newErrors.email = 'El correo electrónico es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Ingresa un correo electrónico válido';
    }
    if (!password) {
      newErrors.password = 'La contraseña es requerida';
    } else if (password.length < 6) {
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
    }
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

  const handleSubmit = () => {
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    navigate('/home');
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
              <label className="block text-[14px] font-semibold text-[var(--ink)] mb-2 font-['DM_Sans',sans-serif]">
                Nombre
              </label>
              <input
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
              <label className="block text-[14px] font-semibold text-[var(--ink)] mb-2 font-['DM_Sans',sans-serif]">
                Apellido
              </label>
              <input
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
            <label className="block text-[14px] font-semibold text-[var(--ink)] mb-2 font-['DM_Sans',sans-serif]">
              Correo Electrónico
            </label>
            <input
              type="email"
              placeholder="tu@email.com"
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

          {/* Password */}
          <div>
            <label className="block text-[14px] font-semibold text-[var(--ink)] mb-2 font-['DM_Sans',sans-serif]">
              Contraseña
            </label>
            <div className="relative">
              <input
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
            <label className="block text-[14px] font-semibold text-[var(--ink)] mb-2 font-['DM_Sans',sans-serif]">
              Confirmar Contraseña
            </label>
            <div className="relative">
              <input
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
              {/* Los enlaces no deben marcar la casilla al pulsarlos. */}
              <button
                type="button"
                onClick={(e) => e.stopPropagation()}
                className="text-[var(--brand)] font-semibold hover:text-[var(--brand-strong)] transition-colors"
              >
                términos y condiciones
              </button>{' '}
              y la{' '}
              <button
                type="button"
                onClick={(e) => e.stopPropagation()}
                className="text-[var(--brand)] font-semibold hover:text-[var(--brand-strong)] transition-colors"
              >
                política de privacidad
              </button>
            </Checkbox>
            {errors.terms && (
              <p className="mt-1.5 text-[12px] text-[var(--brand)] font-['DM_Sans',sans-serif] ml-7">
                {errors.terms}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            className="w-full h-[52px] bg-[var(--brand)] text-[var(--on-brand)] rounded-[14px] text-[16px] font-semibold mt-1 hover:bg-[var(--brand-strong)] active:scale-[0.98] transition-all duration-150 shadow-[0_4px_16px_rgba(214,40,40,0.3)] font-['DM_Sans',sans-serif]"
          >
            Registrarse
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
