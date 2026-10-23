'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icone from './Icone';

const itens = [
  { href: '/', n: 'casa', t: 'Início' },
  { href: '/turmas', n: 'turmas', t: 'Turmas' },
  { href: '/aulas', n: 'aulas', t: 'Aulas' },
  { href: '/avaliacoes', n: 'provas', t: 'Provas' },
  { href: '/mais', n: 'mais', t: 'Mais' },
];
export default function Nav() {
  const p = usePathname();
  if (p.startsWith('/login') || p.includes('/imprimir')) return null;
  const ativo = h => (h === '/' ? p === '/' : p.startsWith(h) || (h === '/turmas' && p.startsWith('/conteudos')));
  return (
    <nav className="nav" aria-label="Menu principal">
      <ul>
        {itens.map(i => (
          <li key={i.href}>
            <Link href={i.href} className={ativo(i.href) ? 'on' : ''} aria-current={ativo(i.href) ? 'page' : undefined}>
              <Icone n={i.n} />
              {i.t}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
