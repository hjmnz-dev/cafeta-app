import React from 'react';

/**
 * Logo de Cafeta.
 *
 * Símbolo: dos arcos abiertos girando sobre un punto — tú al centro, tu círculo
 * cercano y el campus alrededor. La apertura a la derecha es la puerta de entrada:
 * comunidad cerrada, no encerrada.
 *
 * Construcción (según la guía de marca): dos anillos concéntricos con corte de 90°
 * en el mismo eje, girados −40°. Grosores 1 : 0,85 respecto al radio.
 */

type MarkVariant = 'brand' | 'onRed' | 'onDark' | 'monoDark' | 'monoLight';

const MARK_COLORS: Record<
  MarkVariant,
  { outer: string; inner: string; dot: string; showDot: boolean }
> = {
  // Sobre fondo claro
  brand: {
    outer: 'var(--brand)',
    inner: 'var(--brand-strong)',
    dot: 'var(--ink)',
    showDot: true,
  },
  // Símbolo blanco sobre rojo pleno (ícono de app principal)
  onRed: {
    outer: '#FFFFFF',
    inner: 'rgba(255,255,255,0.55)',
    dot: '#FFFFFF',
    showDot: false,
  },
  // Sobre fondo oscuro
  onDark: {
    outer: 'var(--brand-bright)',
    inner: '#FFFFFF',
    dot: '#FFFFFF',
    showDot: false,
  },
  // Monocromo
  monoDark: {
    outer: 'var(--ink)',
    inner: 'var(--ink)',
    dot: 'var(--ink)',
    showDot: true,
  },
  monoLight: {
    outer: '#FFFFFF',
    inner: '#FFFFFF',
    dot: '#FFFFFF',
    showDot: true,
  },
};

interface MarkProps {
  size?: number;
  variant?: MarkVariant;
  className?: string;
  style?: React.CSSProperties;
}

/** Solo el símbolo (arcos + punto). */
export function CafetaMark({
  size = 64,
  variant = 'brand',
  className,
  style,
}: MarkProps) {
  const c = MARK_COLORS[variant];
  // Proporciones tomadas de la construcción de la guía (base 152px).
  const outerBorder = Math.max(2, Math.round(size * 0.125));
  const innerInset = Math.round(size * 0.23);
  const innerBorder = Math.max(2, Math.round(size * 0.105));
  const dotSize = Math.round(size * 0.17);
  const dotPos = Math.round(size * 0.414);

  // A escalas pequeñas el anillo interior se sustituye por un punto pleno:
  // la forma se mantiene legible.
  const simplify = size <= 34;

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: size,
        height: size,
        transform: 'rotate(-40deg)',
        flex: 'none',
        ...style,
      }}
      aria-hidden="true"
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          border: `${outerBorder}px solid ${c.outer}`,
          borderRightColor: 'transparent',
          borderRadius: '50%',
          boxSizing: 'border-box',
        }}
      />
      {!simplify && (
        <div
          style={{
            position: 'absolute',
            inset: innerInset,
            border: `${innerBorder}px solid ${c.inner}`,
            borderRightColor: 'transparent',
            borderRadius: '50%',
            boxSizing: 'border-box',
          }}
        />
      )}
      {(simplify || c.showDot) && (
        <div
          style={{
            position: 'absolute',
            left: simplify ? dotPos : dotPos,
            top: simplify ? dotPos : dotPos,
            width: dotSize,
            height: dotSize,
            borderRadius: '50%',
            background: simplify ? c.outer : c.dot,
          }}
        />
      )}
    </div>
  );
}

interface AppIconProps {
  size?: number;
  /** 'red' = fondo rojo con símbolo blanco · 'dark' = fondo tinta con símbolo rojo/blanco */
  tone?: 'red' | 'dark';
  radius?: number;
  className?: string;
  style?: React.CSSProperties;
}

/** Ícono de app: el símbolo dentro de un cuadro redondeado. */
export function CafetaAppIcon({
  size = 96,
  tone = 'red',
  radius,
  className,
  style,
}: AppIconProps) {
  const bg = tone === 'red' ? 'var(--brand)' : 'var(--ink)';
  const r = radius ?? Math.round(size * 0.24);
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: r,
        background: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 'none',
        ...style,
      }}
    >
      <CafetaMark
        size={Math.round(size * 0.62)}
        variant={tone === 'red' ? 'onRed' : 'onDark'}
      />
    </div>
  );
}

interface LogoProps {
  /** Tamaño del símbolo en px. El wordmark escala en proporción. */
  size?: number;
  /** 'light' = sobre fondo claro · 'dark' = sobre fondo oscuro */
  theme?: 'light' | 'dark';
  /** Disposición del símbolo respecto al texto. */
  layout?: 'row' | 'stacked';
  /** Mostrar el wordmark "cafeta". */
  showWordmark?: boolean;
  /** Microcopy opcional bajo el wordmark (IBM Plex Mono). */
  tagline?: string;
  className?: string;
  style?: React.CSSProperties;
}

/** Logo completo: símbolo + wordmark "cafeta" (+ tagline opcional). */
export function CafetaLogo({
  size = 72,
  theme = 'light',
  layout = 'row',
  showWordmark = true,
  tagline,
  className,
  style,
}: LogoProps) {
  const isDark = theme === 'dark';
  const wordColor = isDark ? '#FFFFFF' : 'var(--ink)';
  const tagColor = isDark ? 'var(--brand-bright)' : 'var(--brand)';
  const wordSize = Math.round(size * 0.64);

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: layout === 'row' ? 'row' : 'column',
        alignItems: 'center',
        gap: layout === 'row' ? size * 0.25 : size * 0.2,
        ...style,
      }}
    >
      <CafetaMark size={size} variant={isDark ? 'onDark' : 'brand'} />
      {showWordmark && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: layout === 'row' ? 'flex-start' : 'center',
            gap: 4,
          }}
        >
          <span
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: wordSize,
              letterSpacing: '-0.045em',
              lineHeight: 1,
              color: wordColor,
            }}
          >
            cafeta
          </span>
          {tagline && (
            <span
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: Math.max(9, Math.round(size * 0.14)),
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: tagColor,
              }}
            >
              {tagline}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default CafetaLogo;
