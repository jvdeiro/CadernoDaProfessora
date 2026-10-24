import { Caveat, DM_Sans } from 'next/font/google';
import './globals.css';
import Nav from '@/components/Nav';
import RegistrarSW from '@/components/RegistrarSW';
import Topo from '@/components/Topo';
import Versao from '@/components/Versao';

const mao = Caveat({ weight: ['400', '700'], subsets: ['latin', 'latin-ext'], variable: '--font-mao', display: 'swap' });
const texto = DM_Sans({ subsets: ['latin', 'latin-ext'], variable: '--font-texto', display: 'swap' });

export const metadata = {
  title: 'Caderno da Professora',
  description: 'Turmas, conteúdos, aulas, provas e revisões da Professora Catarina.',
  appleWebApp: { capable: true, title: 'Caderno', statusBarStyle: 'default' },
};
export const viewport = { themeColor: '#f7f6ee', width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className={`${mao.variable} ${texto.variable}`}>
      <body>
        <Topo />
        <div className="app">
          <main className="folha">{children}</main>
          <Versao />
        </div>
        <Nav />
        <RegistrarSW />
      </body>
    </html>
  );
}
