'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Topo() {
  const p = usePathname();
  if (p.startsWith('/login') || p.includes('/imprimir')) return null;
  return (
    <header className="topbar">
      <div className="dentro">
        <Link href="/" className="marca" aria-label="Caderno da Professora, início">
          <svg viewBox="0 0 44 44" aria-hidden="true"><path d="M12 4q-7 9 1 17t-1 19M23 4q-7 9 1 17t-1 19M34 4q-7 9 1 17t-1 19" /></svg>
          <span><b>Caderno da Professora</b><small>CED Proativo · Escola Pirralho</small></span>
        </Link>
      </div>
    </header>
  );
}
