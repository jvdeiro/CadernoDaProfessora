// Ícones com traço de caneta (desenhados à mão, sem biblioteca)
const P = {
  casa: 'M4 11.5 12 5l8 6.5M6.5 10v9h11v-9M10 19v-5h4v5',
  turmas: 'M8.5 10a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2Zm7.2.4a2.2 2.2 0 1 0 0-4.4M3.8 19c.4-3.4 2.4-5.4 4.7-5.4s4.3 2 4.7 5.4M15 13.8c2.3 0 4 1.6 4.4 4.6',
  aulas: 'M5 4.5h11.5a2 2 0 0 1 2 2V20H7a2 2 0 0 1-2-2Zm0 13.5a2 2 0 0 1 2-2h11.5M9 8.5h6M9 11.5h4',
  provas: 'M7 3.8h7l4 4V20H7ZM14 3.8V8h4M9.5 12.5l1.6 1.6 3.4-3.6M9.5 17h5',
  mais: 'M5 7h14M5 12h14M5 17h9',
  camera: 'M4 8.5h3l1.6-2.5h6.8L17 8.5h3V19H4Zm8 8.3a3.3 3.3 0 1 0 0-6.6 3.3 3.3 0 0 0 0 6.6Z',
  livro: 'M4 5.5c3-1 5.5-.6 8 1.2 2.5-1.8 5-2.2 8-1.2v13c-3-1-5.5-.6-8 1.2-2.5-1.8-5-2.2-8-1.2Zm8 1.2v13',
  lapis: 'M14.5 5.5l4 4L9 19H5v-4ZM12.5 7.5l4 4',
  calendario: 'M5 6.5h14V19H5ZM5 10h14M9 4.5v3.5M15 4.5v3.5',
  seta: 'M9 5.5 15.5 12 9 18.5',
  voltar: 'M15 5.5 8.5 12 15 18.5',
  baixar: 'M12 4.5v10M7.5 10.5 12 15l4.5-4.5M5 19.5h14',
  mais1: 'M12 5v14M5 12h14',
  olho: 'M2.8 12S6.2 6 12 6s9.2 6 9.2 6-3.4 6-9.2 6-9.2-6-9.2-6Zm9.2 2.6a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2Z',
  estrela: 'm12 4.5 2.3 4.7 5.2.7-3.8 3.6.9 5.1L12 16.2l-4.6 2.4.9-5.1-3.8-3.6 5.2-.7Z',
  lixo: 'M5.5 7h13M9.5 7V5h5v2M7 7l1 12h8l1-12',
  refazer: 'M19 12a7 7 0 1 1-2.1-5M19 4.5V9h-4.5',
};
export default function Icone({ n, className, style }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden="true">
      <path d={P[n]} />
    </svg>
  );
}
