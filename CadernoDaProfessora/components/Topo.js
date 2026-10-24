'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Topo() {
  const p = usePathname();
  if (p.includes('/imprimir')) return null;
  const hoje = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '');
  return (
    <header className="mast">
      <Link href="/" className="logo" aria-label="Caderno da Professora, início">
        <b>Caderno da Professora</b>
        <small>CED Proativo · Escola Pirralho</small>
      </Link>
      <span className="data" suppressHydrationWarning>{hoje}</span>
    </header>
  );
}
