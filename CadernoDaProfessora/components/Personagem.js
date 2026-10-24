// Professora desenhada à caneta com balão de fala (traço da pasta visual-thinking).
const tinta = '#414b39';

function Pessoa({ x, y, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill="none" stroke={tinta} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="0" cy="133" rx="45" ry="6" fill="#c4cbb1" opacity=".25" stroke="none" />
      <path d="M-27 103l4-50q23-11 47 0l6 49Z" fill="#f1ed85" />
      <path d="M-8 41v9m16-9v9M-13 102l-5 27-13 1m44-28 5 27 13 1" />
      <path d="M-20 16q-1-24 21-22 22 0 20 25-2 25-21 26-21-2-20-29Z" fill="#f7f6ee" />
      <path d="M-20 23q-9-34 20-31 25 0 20 34M-18 8q18 8 31-8" />
      <circle cx="12" cy="-14" r="10" fill="#f7f6ee" />
      <path d="M-16 18h12v8h-12zm20 0h12v8H4m-8 3h8" />
      <path d="M-8 20v2m16-2v2" />
      <path d="M0 23l-2 7 4 1M-6 35q7 5 13-1" />
      <path d="M-23 57l-18 28 20 5m44-34 13 18-20 12" />
      <path d="M-18 73l33-3 4 31-34 2Z" fill="#c8dfad" />
      <path d="M-9 82l19-1m-18 7 14-1m-12 7 14-1" />
    </g>
  );
}

export default function Personagem({ falas = ['O que vamos', 'preparar hoje?'], largura = 340 }) {
  const w = 196, h = falas.length * 25 + 24, bx = 118, by = 18;
  return (
    <div className="saudacao">
      <svg viewBox={`0 0 ${largura} 170`} width={largura} style={{ maxWidth: '100%' }} role="img" aria-label={falas.join(' ')}>
        <Pessoa x={58} y={20} s={0.98} />
        <g transform={`translate(${bx} ${by}) rotate(-1.5)`} stroke={tinta} strokeWidth="1.5" fill="#fffced" strokeLinecap="round" strokeLinejoin="round">
          <path d={`M9 3Q${w / 2} -3 ${w - 7} 2Q${w + 4} ${h / 2} ${w - 2} ${h - 5}Q${w / 2} ${h + 3} 5 ${h - 1}Q-4 ${h / 2} 9 3Z`} />
          <path d={`M10 ${h - 14}l-22 12 26-2`} />
          {falas.map((l, i) => (
            <text key={i} x={w / 2} y={27 + i * 25} fill={tinta} stroke="none" textAnchor="middle" style={{ font: '700 25px var(--f-mao)' }}>{l}</text>
          ))}
        </g>
      </svg>
    </div>
  );
}
