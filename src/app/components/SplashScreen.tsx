import React from 'react';
import { useNavigate } from 'react-router';
import { CafetaMark } from './Logo';

export function SplashScreen() {
  const navigate = useNavigate();

  return (
    <div className="w-full h-full bg-[#d62828] flex flex-col justify-end relative">
      <div className="flex-1 flex flex-col items-center justify-center gap-8 z-10">
        <CafetaMark size={132} variant="onRed" />
        <div className="flex flex-col items-center gap-2">
          <span className="font-['Space_Grotesk',sans-serif] text-white text-[52px] font-bold tracking-[-0.045em] leading-none">
            cafeta
          </span>
          <span className="font-['IBM_Plex_Mono',monospace] text-white/80 text-[11px] tracking-[0.2em] uppercase">
            tu campus, en vivo
          </span>
        </div>
      </div>

      <div className="bg-[var(--surface)] w-full rounded-t-[32px] p-8 pt-10 pb-[60px] shadow-[0_-12px_40px_rgba(214,40,40,0.3)] flex flex-col items-center z-20">
        <h1 className="font-['Space Grotesk',sans-serif] text-[28px] font-bold text-[var(--ink)] text-center leading-tight mb-3">
          Bienvenido a<br />
          <span className="text-[var(--brand)]">Cafeta</span>
        </h1>
        <p className="text-[var(--muted)] text-center text-[15px] mb-8 leading-relaxed px-4">
          La red social académica exclusiva para la comunidad de estudiantes de INTEC.
        </p>

        <button 
          onClick={() => navigate('/register')}
          className="w-full h-14 bg-[var(--brand)] text-[var(--on-brand)] rounded-[20px] font-semibold text-[16px] mb-4 shadow-[0_4px_16px_rgba(214,40,40,0.25)] hover:bg-[var(--brand-strong)] transition-colors"
        >
          Crear cuenta con correo INTEC
        </button>

        <button 
          onClick={() => navigate('/login')}
          className="w-full h-14 bg-transparent text-[var(--brand)] rounded-[20px] font-semibold text-[16px] hover:bg-[var(--tint)] transition-colors"
        >
          Iniciar sesión
        </button>
      </div>
    </div>
  );
}