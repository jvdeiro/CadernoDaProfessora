export default function manifest() {
  return {
    name: 'Caderno da Professora',
    short_name: 'Caderno',
    description: 'Turmas, conteúdos, aulas, provas e revisões.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f6f4ec',
    theme_color: '#f6f4ec',
    lang: 'pt-BR',
    icons: [
      { src: '/icon', sizes: '512x512', type: 'image/png' },
      { src: '/icon', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
