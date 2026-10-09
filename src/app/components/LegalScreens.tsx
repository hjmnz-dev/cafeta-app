import { ArrowLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import {
  LEGAL_UPDATED_AT,
  PRIVACY_DOCUMENT,
  TERMS_DOCUMENT,
  TERMS_VERSION,
  type LegalDocument,
} from '../lib/legal';
import { CafetaLogo } from './Logo';

/**
 * HU: Privacidad y términos (spec 0009, decisión 12). Dos pantallas públicas,
 * sin sesión, que dibujan un texto fijo de `lib/legal.ts`.
 */
function LegalDocumentView({ document }: { document: LegalDocument }) {
  const navigate = useNavigate();
  const location = useLocation();
  // Abierta en una pestaña nueva (desde el registro) no hay historial al que volver.
  const goBack = () =>
    location.key === 'default' ? navigate('/login') : navigate(-1);

  return (
    <div className="w-full h-full bg-[var(--surface)] flex flex-col overflow-y-auto">
      <main className="pt-[60px] px-6 pb-10 flex flex-col">
        <button
          type="button"
          onClick={goBack}
          className="w-10 h-10 -ml-2 mb-4 flex items-center justify-center rounded-full hover:bg-[var(--surface-3)] transition-colors"
          aria-label="Volver"
        >
          <ArrowLeft className="w-6 h-6 text-[var(--ink)]" />
        </button>

        <div className="flex flex-col items-center mb-6">
          <CafetaLogo size={48} />
        </div>

        <h1 className="font-['Space_Grotesk',sans-serif] text-[28px] font-bold text-[var(--ink)] mb-2 tracking-[-0.02em]">
          {document.title}
        </h1>
        <p className="text-[13px] text-[var(--muted)] mb-4 font-['DM_Sans',sans-serif]">
          Última actualización: {LEGAL_UPDATED_AT} · Versión {TERMS_VERSION}
        </p>
        <p className="text-[15px] text-[var(--ink)] mb-6 font-['DM_Sans',sans-serif]">
          {document.intro}
        </p>

        {document.sections.map((section) => (
          <section key={section.heading} className="mb-6">
            <h2 className="font-['Space_Grotesk',sans-serif] text-[18px] font-bold text-[var(--ink)] mb-2">
              {section.heading}
            </h2>
            {section.paragraphs.map((paragraph) => (
              <p
                key={paragraph}
                className="text-[15px] text-[var(--muted)] mb-2 font-['DM_Sans',sans-serif]"
              >
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </main>
    </div>
  );
}

export function TermsScreen() {
  return <LegalDocumentView document={TERMS_DOCUMENT} />;
}

export function PrivacyScreen() {
  return <LegalDocumentView document={PRIVACY_DOCUMENT} />;
}
