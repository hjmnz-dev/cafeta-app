import { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router';
import { CafetaLogo } from './Logo';

/**
 * DEF-01 · HU03 — Recuperar contraseña por correo institucional.
 *
 * Flujo: solicitar (correo) → verificar (código de 6 dígitos con expiración)
 * → restablecer (nueva contraseña) → éxito.
 *
 * Simulado en el cliente (sin backend): el "envío" del código genera un código
 * de demo y arranca un contador de expiración. Al conectar el backend se
 * reemplaza la generación local por la solicitud real y la verificación server-side.
 */

type Step = 'request' | 'verify' | 'reset' | 'done';

const CODE_TTL_SECONDS = 60;

export function ForgotPasswordScreen() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('request');

  // request
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);

  // verify
  const [sentCode, setSentCode] = useState('');
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  // reset
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
    },
    [],
  );

  const startExpiry = () => {
    setSecondsLeft(CODE_TTL_SECONDS);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1 && timerRef.current) clearInterval(timerRef.current);
        return s - 1;
      });
    }, 1000);
  };

  const sendCode = () => {
    if (!email.trim()) {
      setEmailError('El correo electrónico es requerido');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Ingresa un correo electrónico válido');
      return;
    }
    setEmailError(null);
    // Código de demostración (en producción lo genera y envía el servidor).
    const demo = String(Math.floor(100000 + ((email.length * 7919) % 900000)));
    setSentCode(demo);
    setCode('');
    setCodeError(null);
    startExpiry();
    setStep('verify');
  };

  const verifyCode = () => {
    if (secondsLeft <= 0) {
      setCodeError('El código expiró. Solicita uno nuevo.');
      return;
    }
    if (code.length !== 6) {
      setCodeError('Ingresa los 6 dígitos del código');
      return;
    }
    if (code !== sentCode) {
      setCodeError('El código no es correcto');
      return;
    }
    setCodeError(null);
    setStep('reset');
  };

  const resetPassword = () => {
    if (password.length < 6) {
      setResetError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (password !== confirm) {
      setResetError('Las contraseñas no coinciden');
      return;
    }
    setResetError(null);
    setStep('done');
  };

  const inputBase =
    'w-full h-[52px] px-4 rounded-[12px] text-[15px] text-[var(--ink)] outline-none transition-all duration-200 ' +
    "placeholder:text-[var(--muted)] font-['DM_Sans',sans-serif] bg-[var(--surface-3)] border-2 border-transparent focus:bg-[var(--surface)] focus:border-[var(--brand)]";

  return (
    <div className="w-full h-full bg-[var(--surface)] flex flex-col overflow-y-auto">
      <div className="pt-[60px] px-6 flex flex-col">
        {/* Back */}
        <button
          onClick={() =>
            step === 'request' ? navigate('/login') : setStep('request')
          }
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
              <h1 className="font-['Space_Grotesk',sans-serif] text-[28px] font-bold text-[var(--ink)] text-center mb-2 tracking-[-0.02em]">
                Recuperar contraseña
              </h1>
              <p className="text-[var(--muted)] text-[15px] text-center mb-8 px-2">
                Ingresa tu correo institucional y te enviaremos un código para
                restablecer tu contraseña.
              </p>
              <div className="w-full flex flex-col gap-4">
                <div>
                  <label className="block text-[14px] font-semibold text-[var(--ink)] mb-2 font-['DM_Sans',sans-serif]">
                    Correo institucional
                  </label>
                  <input
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
                <button
                  onClick={sendCode}
                  className="w-full h-[52px] bg-[var(--brand)] text-[var(--on-brand)] rounded-[14px] text-[16px] font-semibold mt-2 hover:bg-[var(--brand-strong)] active:scale-[0.98] transition-all duration-150 shadow-[0_4px_16px_rgba(214,40,40,0.3)] font-['DM_Sans',sans-serif]"
                >
                  Enviar código
                </button>
              </div>
            </>
          )}

          {step === 'verify' && (
            <>
              <h1 className="font-['Space_Grotesk',sans-serif] text-[28px] font-bold text-[var(--ink)] text-center mb-2 tracking-[-0.02em]">
                Verifica tu correo
              </h1>
              <p className="text-[var(--muted)] text-[15px] text-center mb-2 px-2">
                Enviamos un código de 6 dígitos a{' '}
                <span className="font-semibold text-[var(--ink)]">{email}</span>
                .
              </p>
              {/* Ayuda de demo (sin backend). Quitar al conectar la API. */}
              <p className="text-[11px] text-[var(--muted)] text-center mb-6 font-['IBM_Plex_Mono',monospace]">
                demo · código: {sentCode}
              </p>
              <div className="w-full flex flex-col gap-4">
                <div>
                  <input
                    inputMode="numeric"
                    maxLength={6}
                    aria-label="Código de verificación"
                    placeholder="––––––"
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                      if (codeError) setCodeError(null);
                    }}
                    className={
                      inputBase +
                      ' text-center tracking-[0.5em] text-[22px] font-semibold'
                    }
                  />
                  <div className="flex items-center justify-between mt-2">
                    <span
                      className={`text-[12px] font-['DM_Sans',sans-serif] ${secondsLeft > 0 ? 'text-[var(--muted)]' : 'text-[var(--brand)]'}`}
                    >
                      {secondsLeft > 0
                        ? `Expira en ${secondsLeft}s`
                        : 'Código expirado'}
                    </span>
                    <button
                      onClick={sendCode}
                      className="text-[12px] font-semibold text-[var(--brand)] hover:text-[var(--brand-strong)] transition-colors font-['DM_Sans',sans-serif]"
                    >
                      Reenviar código
                    </button>
                  </div>
                  {codeError && (
                    <p className="mt-1.5 text-[12px] text-[var(--brand)] font-['DM_Sans',sans-serif]">
                      {codeError}
                    </p>
                  )}
                </div>
                <button
                  onClick={verifyCode}
                  className="w-full h-[52px] bg-[var(--brand)] text-[var(--on-brand)] rounded-[14px] text-[16px] font-semibold mt-2 hover:bg-[var(--brand-strong)] active:scale-[0.98] transition-all duration-150 shadow-[0_4px_16px_rgba(214,40,40,0.3)] font-['DM_Sans',sans-serif]"
                >
                  Verificar
                </button>
              </div>
            </>
          )}

          {step === 'reset' && (
            <>
              <h1 className="font-['Space_Grotesk',sans-serif] text-[28px] font-bold text-[var(--ink)] text-center mb-2 tracking-[-0.02em]">
                Nueva contraseña
              </h1>
              <p className="text-[var(--muted)] text-[15px] text-center mb-8 px-2">
                Crea una contraseña nueva para tu cuenta.
              </p>
              <div className="w-full flex flex-col gap-4">
                <div>
                  <label className="block text-[14px] font-semibold text-[var(--ink)] mb-2 font-['DM_Sans',sans-serif]">
                    Contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      aria-label="Nueva contraseña"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (resetError) setResetError(null);
                      }}
                      className={inputBase + ' pr-12'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
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
                  <label className="block text-[14px] font-semibold text-[var(--ink)] mb-2 font-['DM_Sans',sans-serif]">
                    Confirmar contraseña
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    aria-label="Confirmar nueva contraseña"
                    placeholder="••••••••"
                    value={confirm}
                    onChange={(e) => {
                      setConfirm(e.target.value);
                      if (resetError) setResetError(null);
                    }}
                    className={inputBase}
                  />
                  {resetError && (
                    <p className="mt-1.5 text-[12px] text-[var(--brand)] font-['DM_Sans',sans-serif]">
                      {resetError}
                    </p>
                  )}
                </div>
                <button
                  onClick={resetPassword}
                  className="w-full h-[52px] bg-[var(--brand)] text-[var(--on-brand)] rounded-[14px] text-[16px] font-semibold mt-2 hover:bg-[var(--brand-strong)] active:scale-[0.98] transition-all duration-150 shadow-[0_4px_16px_rgba(214,40,40,0.3)] font-['DM_Sans',sans-serif]"
                >
                  Restablecer contraseña
                </button>
              </div>
            </>
          )}

          {step === 'done' && (
            <div className="flex flex-col items-center text-center mt-6">
              <div className="w-20 h-20 rounded-full bg-[var(--tint)] flex items-center justify-center mb-6">
                <CheckCircle2 className="w-11 h-11 text-[var(--brand)]" />
              </div>
              <h1 className="font-['Space_Grotesk',sans-serif] text-[28px] font-bold text-[var(--ink)] mb-2 tracking-[-0.02em]">
                ¡Listo!
              </h1>
              <p className="text-[var(--muted)] text-[15px] mb-8 px-2">
                Tu contraseña fue restablecida. Ya puedes iniciar sesión con tus
                nuevos datos.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="w-full h-[52px] bg-[var(--brand)] text-[var(--on-brand)] rounded-[14px] text-[16px] font-semibold hover:bg-[var(--brand-strong)] active:scale-[0.98] transition-all duration-150 shadow-[0_4px_16px_rgba(214,40,40,0.3)] font-['DM_Sans',sans-serif]"
              >
                Iniciar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
