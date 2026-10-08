import { useState } from 'react';
import { ArrowLeft, MailCheck } from 'lucide-react';
import { useNavigate } from 'react-router';
import { userMessageOf } from '../lib/http';
import { passwordResetApi } from '../lib/password-reset-api';
import { CafetaLogo } from './Logo';

/**
 * HU03 · Recuperar contraseña por correo institucional (spec 0008, decisión 10).
 *
 * Pide el correo y la API manda un enlace de un solo uso que dura 30 minutos.
 * La respuesta es la misma exista o no la cuenta, así que la pantalla nunca
 * confirma que el correo esté registrado. La contraseña nueva se elige en
 * `/reset-password`, desde el enlace del correo.
 */

type Step = 'request' | 'sent';

const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const inputBase =
  'w-full h-[52px] px-4 rounded-[12px] text-[15px] text-[var(--ink)] outline-none transition-all duration-200 ' +
  "placeholder:text-[var(--muted)] font-['DM_Sans',sans-serif] bg-[var(--surface-3)] border-2 border-transparent focus:bg-[var(--surface)] focus:border-[var(--brand)]";

const primaryButton =
  "w-full h-[52px] bg-[var(--brand)] text-[var(--on-brand)] rounded-[14px] text-[16px] font-semibold hover:bg-[var(--brand-strong)] active:scale-[0.98] transition-all duration-150 shadow-[0_4px_16px_rgba(214,40,40,0.3)] disabled:opacity-60 font-['DM_Sans',sans-serif]";

const headingClass =
  "font-['Space_Grotesk',sans-serif] text-[28px] font-bold text-[var(--ink)] text-center mb-2 tracking-[-0.02em]";

function emailProblem(email: string): string | null {
  if (!email.trim()) return 'El correo electrónico es requerido';
  if (!EMAIL_FORMAT.test(email.trim())) {
    return 'Ingresa un correo electrónico válido';
  }
  return null;
}

export function ForgotPasswordScreen() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  // Error de la API (límite de pedidos, sin conexión...).
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resent, setResent] = useState(false);

  const sendLink = async (isResend: boolean) => {
    const problem = emailProblem(email);
    if (problem) {
      setEmailError(problem);
      return;
    }
    setEmailError(null);
    setFormError(null);
    setResent(false);
    setSubmitting(true);
    try {
      await passwordResetApi.requestLink({ email: email.trim() });
      setStep('sent');
      setResent(isResend);
    } catch (error) {
      setFormError(userMessageOf(error));
    } finally {
      setSubmitting(false);
    }
  };

  const goBack = () => {
    if (step === 'request') {
      navigate('/login');
      return;
    }
    setFormError(null);
    setResent(false);
    setStep('request');
  };

  return (
    <div className="w-full h-full bg-[var(--surface)] flex flex-col overflow-y-auto">
      <div className="pt-[60px] px-6 flex flex-col">
        <button
          onClick={goBack}
          className="w-10 h-10 -ml-2 mb-4 flex items-center justify-center rounded-full hover:bg-[var(--surface-3)] transition-colors"
          aria-label="Volver"
        >
          <ArrowLeft className="w-6 h-6 text-[var(--ink)]" />
        </button>

        <div className="flex flex-col items-center">
          <div className="mb-8">
            <CafetaLogo size={56} />
          </div>

          {step === 'request' && (
            <>
              <h1 className={headingClass}>Recuperar contraseña</h1>
              <p className="text-[var(--muted)] text-[15px] text-center mb-8 px-2">
                Ingresa tu correo institucional y te enviaremos un enlace para
                elegir una contraseña nueva.
              </p>
              <form
                className="w-full flex flex-col gap-4"
                noValidate
                onSubmit={(event) => {
                  event.preventDefault();
                  void sendLink(false);
                }}
              >
                <div>
                  <label
                    htmlFor="forgot-email"
                    className="block text-[14px] font-semibold text-[var(--ink)] mb-2 font-['DM_Sans',sans-serif]"
                  >
                    Correo institucional
                  </label>
                  <input
                    id="forgot-email"
                    type="email"
                    placeholder="tu@est.intec.edu.do"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError(null);
                    }}
                    className={inputBase}
                  />
                  {emailError && (
                    <p className="mt-1.5 text-[12px] text-[var(--brand)] font-['DM_Sans',sans-serif]">
                      {emailError}
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
                  {submitting ? 'Enviando…' : 'Enviar enlace'}
                </button>
              </form>
            </>
          )}

          {step === 'sent' && (
            <div className="flex flex-col items-center text-center mt-2 w-full">
              <div className="w-20 h-20 rounded-full bg-[var(--tint)] flex items-center justify-center mb-6">
                <MailCheck className="w-11 h-11 text-[var(--brand)]" />
              </div>
              <h1 className={headingClass}>Revisa tu correo</h1>
              <p className="text-[var(--muted)] text-[15px] mb-2 px-2">
                Si hay una cuenta con{' '}
                <span className="font-semibold text-[var(--ink)]">
                  {email.trim()}
                </span>
                , te enviamos un enlace para restablecer tu contraseña.
              </p>
              <p className="text-[var(--muted)] text-[13px] mb-8 px-2">
                El enlace dura 30 minutos y sirve una sola vez. Si no lo ves,
                revisa la carpeta de spam.
              </p>
              {resent && (
                <p
                  role="status"
                  className="text-[13px] text-[var(--ink)] mb-3 font-['DM_Sans',sans-serif]"
                >
                  Enviamos otro enlace. El anterior ya no sirve.
                </p>
              )}
              {formError && (
                <p
                  role="alert"
                  className="text-[13px] text-[var(--brand)] mb-3 font-['DM_Sans',sans-serif]"
                >
                  {formError}
                </p>
              )}
              <button
                type="button"
                onClick={() => navigate('/login')}
                className={primaryButton}
              >
                Volver a iniciar sesión
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void sendLink(true)}
                className="mt-4 text-[14px] font-semibold text-[var(--brand)] hover:text-[var(--brand-strong)] disabled:opacity-60 transition-colors font-['DM_Sans',sans-serif]"
              >
                {submitting ? 'Enviando…' : 'Reenviar enlace'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
