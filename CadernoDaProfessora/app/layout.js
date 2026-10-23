import { Caveat_Brush, Nunito } from 'next/font/google';
import './globals.css';
import Nav from '@/components/Nav';
import RegistrarSW from '@/components/RegistrarSW';

const mao = Caveat_Brush({ weight: '400', subsets: ['latin', 'latin-ext'], variable: '--font-mao', display: 'swap' });
const texto = Nunito({ subsets: ['latin', 'latin-ext'], variable: '--font-texto', display: 'swap' });

export const metadata = {
  title: 'Caderno da Professora',
  description: 'Turmas, conteúdos, aulas, provas e revisões da Professora Catarina.',
  appleWebApp: { capable: true, title: 'Caderno', statusBarStyle: 'default' },
};
export const viewport = { themeColor: '#f6f4ec', width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className={`${mao.variable} ${texto.variable}`}>
      <body>
        <div className="app">
          <main className="folha">{children}</main>
        </div>
        <Nav />
        <RegistrarSW />
      </body>
    </html>
  );
}
