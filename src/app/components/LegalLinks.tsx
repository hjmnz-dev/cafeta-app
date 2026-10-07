import { Link } from 'react-router';
import { ChevronRight, FileText, ShieldCheck } from 'lucide-react';

/** Accesos a los textos legales (spec 0009, decisiones 11 y 12). */
const LINKS = [
  { to: '/terms', label: 'Términos de uso', icon: FileText },
  { to: '/privacy', label: 'Política de privacidad', icon: ShieldCheck },
] as const;

export function LegalLinks({
  sectionTitle,
  card,
}: {
  sectionTitle: string;
  card: string;
}) {
  return (
    <section>
      <h2 className={sectionTitle}>Legal</h2>
      <div className={card}>
        {LINKS.map(({ to, label, icon: Icon }, i) => (
          <Link
            key={to}
            to={to}
            className={`w-full flex items-center gap-3 px-4 py-4 hover:bg-[var(--surface-2)] transition-colors ${i > 0 ? 'border-t border-[var(--line-soft)]' : ''}`}
          >
            <Icon className="w-5 h-5 text-[var(--muted)]" />
            <span className="flex-1 text-left text-[15px] text-[var(--ink)]">
              {label}
            </span>
            <ChevronRight className="w-5 h-5 text-[var(--muted)]" />
          </Link>
        ))}
      </div>
    </section>
  );
}
