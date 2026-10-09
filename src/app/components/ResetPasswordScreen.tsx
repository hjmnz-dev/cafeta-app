import { useState } from 'react';
import { CheckCircle2, Eye, EyeOff, LinkIcon } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router';
import { ApiError, userMessageOf } from '../lib/http';
import { passwordProblem } from '../lib/password';
import { passwordResetApi } from '../lib/password-reset-api';
import { CafetaLogo } from './Logo';

/**
 * Pantalla del enlace del correo `/reset-password?token=…` (spec 0008,
 * decisión 10): elige la contraseña nueva. El token viaja solo en la URL y la
 * API decide si sirve; aquí no se guarda en ningún almacenamiento.
 */

const inputBase =
  'w-full h-[52px] px-4 rounded-[12px] text-[15px] text-[var(--ink)] outline-none transition-all duration-200 ' +
  "placeholder:text-[var(--muted)] font-['DM_Sans',sans-serif] bg-[var(--surface-3)] border-2 border-transparent focus:bg-[var(--surface)] focus:border-[var(--brand)]";

const primaryButton =
  "w-full h-[52px] bg-[var(--brand)] text-[var(--on-brand)] rounded-[14px] text-[16px] font-semibold hover:bg-[var(--brand-strong)] active:scale-[0.98] transition-all duration-150 shadow-[0_4px_16px_rgba(214,40,40,0.3)] disabled:opacity-60 font-['DM_Sans',sans-serif]";

const headingClass =
  "font-['Space_Grotesk',sans-serif] text-[28px] font-bold text-[var(--ink)] text-center mb-2 tracking-[-0.02em]";

const INVALID_LINK_MESSAGE = 'El enlace venció o ya se usó. Pide uno nuevo.';

function confirmationProblem(password: string, confirm: string): string | null {
  const problem = passwordProblem(password);
  if (problem) return problem;
  if (password !== confirm) return 'Las contraseñas no coinciden';
  return null;
}

export function ResetPasswordScreen() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  // El enlace no sirve (venció, ya se usó o la URL no trae token).
  const [linkInvalid, setLinkInvalid] = useState(token === '');
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    const problem = confirmationProblem(password, confirm);
    if (problem) {
      setFieldError(problem);
      return;
    }
    setFieldError(null);
    setFormError(null);
    setSubmitting(true);
    try {
      await passwordResetApi.reset({ token, password });
      setDone(true);
    } catch (error) {
      if (error instanceof ApiError && error.code === 'RESET_TOKEN_INVALID') {
        setLinkInvalid(true);
      } else {
        setFormError(userMessageOf(error));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full h-full bg-[var(--surface)] flex flex-col overflow-y-auto">
      <div className="pt-[60px] px-6 flex flex-col items-center">
        <div className="mb-8">
          <CafetaLogo size={56} />
        </div>

        {done && (
          <div className="flex flex-col items-center text-center mt-2 w-full">
            <div className="w-20 h-20 rounded-full bg-[var(--tint)] flex items-center justify-center mb-6">
              <CheckCircle2 className="w-11 h-11 text-[var(--brand)]" />
            </div>
            <h1 className={headingClass}>¡Listo!</h1>
            <p className="text-[var(--muted)] text-[15px] mb-8 px-2">
              Tu contraseña cambió y cerramos tus otras sesiones. Inicia sesión
              con la contraseña nueva.
            </p>
            <button
              type="button"
              onClick={() => navigate('/login', { replace: true })}
              className={primaryButton}
            >
              Iniciar sesión
            </button>
          </div>
        )}

        {!done && linkInvalid && (
          <div className="flex flex-col items-center text-center mt-2 w-full">
            <div className="w-20 h-20 rounded-full bg-[var(--tint)] flex items-center justify-center mb-6">
              <LinkIcon className="w-10 h-10 text-[var(--brand)]" />
            </div>
            <h1 className={headingClass}>Enlace no válido</h1>
            <p
              role="alert"
              className="text-[var(--muted)] text-[15px] mb-8 px-2"
            >
              {INVALID_LINK_MESSAGE}
            </p>
            <button
              type="button"
              onClick={() => navigate('/forgot-password', { replace: true })}
              className={primaryButton}
            >
              Pedir un enlace nuevo
            </button>
          </div>
        )}

        {!done && !linkInvalid && (
          <>
            <h1 className={headingClass}>Nueva contraseña</h1>
            <p className="text-[var(--muted)] text-[15px] text-center mb-8 px-2">
              Elige una contraseña de 8 a 72 caracteres, con al menos una letra
              y un número.
            </p>
            <form
              className="w-full flex flex-col gap-4"
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                void submit();
              }}
            >
              <div>
                <label
                  htmlFor="reset-password"
                  className="block text-[14px] font-semibold text-[var(--ink)] mb-2 font-['DM_Sans',sans-serif]"
                >
                  Contraseña nueva
                </label>
                <div className="relative">
                  <input
                    id="reset-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (fieldError) setFieldError(null);
                    }}
                    className={`${inputBase} pr-12`}
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
              </div>
              <div>
                <label
                  htmlFor="reset-confirm"
                  className="block text-[14px] font-semibold text-[var(--ink)] mb-2 font-['DM_Sans',sans-serif]"
                >
                  Confirmar contraseña
                </label>
                <input
                  id="reset-confirm"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={confirm}
                  onChange={(e) => {
                    setConfirm(e.target.value);
                    if (fieldError) setFieldError(null);
                  }}
                  className={inputBase}
                />
                {fieldError && (
                  <p className="mt-1.5 text-[12px] text-[var(--brand)] font-['DM_Sans',sans-serif]">
                    {fieldError}
                  </p>
                )}
              </div>
              {formError && (
                <p
                  role="alert"
                  className="text-[13px] text-[var(--brand)] font-['DM_Sans',sans-serif]"
                >
                  {formError}
                </p>
              )}
              <button
                type="submit"
                disabled={submitting}
                className={`${primaryButton} mt-2`}
              >
                {submitting ? 'Guardando…' : 'Restablecer contraseña'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
