import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router';
import { CafetaLogo } from './Logo';
import { Checkbox } from './Checkbox';

interface FieldError {
  email?: string;
  password?: string;
}

export function LoginScreen() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<FieldError>({});
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const validate = () => {
    const newErrors: FieldError = {};
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

  const inputClass = (field: keyof FieldError) => {
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

  return (
    <div className="w-full h-full bg-[var(--surface)] flex flex-col overflow-y-auto">
      {/* Top padding for status bar */}
      <div className="pt-[60px] px-6 flex flex-col items-center">
        {/* Logo */}
        <div className="mb-8">
          <CafetaLogo size={64} tagline="solo con correo @uni" />
        </div>

        {/* Title */}
        <h1 className="font-['Space Grotesk',serif] text-[32px] font-bold text-[var(--ink)] text-center mb-2">
          Iniciar Sesión
        </h1>
        <p className="text-[var(--muted)] text-[15px] text-center mb-8">
          Bienvenido de nuevo a Cafeta
        </p>

        {/* Form */}
        <div className="w-full flex flex-col gap-4">
          {/* Email Field */}
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
                if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
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

          {/* Password Field */}
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
                  if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                }}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                className={`${inputClass('password')} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                aria-pressed={showPassword}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1.5 text-[12px] text-[var(--brand)] font-['DM_Sans',sans-serif]">
                {errors.password}
              </p>
            )}
          </div>

          {/* Remember Me + Forgot Password */}
          <div className="flex items-center justify-between mt-1">
            <Checkbox checked={rememberMe} onChange={setRememberMe}>
              Recordarme
            </Checkbox>
            <button
              type="button"
              onClick={() => navigate('/forgot-password')}
              className="text-[14px] text-[var(--brand)] font-semibold hover:text-[var(--brand-strong)] transition-colors"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            className="w-full h-[52px] bg-[var(--brand)] text-[var(--on-brand)] rounded-[14px] text-[16px] font-semibold mt-2 hover:bg-[var(--brand-strong)] active:scale-[0.98] transition-all duration-150 shadow-[0_4px_16px_rgba(214,40,40,0.3)] font-['DM_Sans',sans-serif]"
          >
            Iniciar Sesión
          </button>

          {/* Register Link */}
          <p className="text-center text-[14px] text-[var(--muted)] mt-2 pb-8 font-['DM_Sans',sans-serif]">
            ¿No tienes cuenta?{' '}
            <button
              onClick={() => navigate('/register')}
              className="text-[var(--brand)] font-semibold hover:text-[var(--brand-strong)] transition-colors"
            >
              Regístrate aquí
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
