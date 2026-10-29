// Desenhos do passeio de boas-vindas: mesmo traço de caneta da professora (Personagem.js),
// preenchimentos nas 4 cores pastel do marca-texto. Cada um cabe em 260 × 200.
import Personagem, { Pessoa, tinta } from './Personagem';

const C = { amarelo: '#f1ed85', verde: '#c8dfad', pessego: '#f4bd99', lilas: '#dcd0ee', azul: '#c9ded9', rosa: '#f2d3d8', papel: '#fcfbf5' };
const traco = { fill: 'none', stroke: tinta, strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' };
const Svg = ({ children, rotulo }) => <svg viewBox="0 0 260 200" role="img" aria-label={rotulo} {...traco}>{children}</svg>;
const Mao = ({ x, y, s = 22, children, ...r }) => <text x={x} y={y} fill={tinta} stroke="none" textAnchor="middle" style={{ font: `700 ${s}px var(--f-mao)` }} {...r}>{children}</text>;
const Sombra = ({ x, y, rx = 50 }) => <ellipse cx={x} cy={y} rx={rx} ry="6" fill="#c4cbb1" opacity=".3" stroke="none" />;

// 1. Presente: a professora, uma caixa de presente com laço e um balão; confetes flutuam (CSS).
function Presente() {
  const confetes = [[150, 30, C.amarelo], [178, 18, C.verde], [206, 62, C.pessego], [236, 34, C.lilas], [22, 50, C.rosa], [40, 22, C.verde], [240, 96, C.amarelo], [128, 62, C.lilas]];
  return (
    <Svg rotulo="A professora ao lado de um presente com laço e um balão">
      <Sombra x={78} y={168} rx={48} />
      <Sombra x={196} y={176} rx={46} />
      <Pessoa x={78} y={36} s={0.95} />
      <g className="bv-conf" stroke="none">{confetes.map(([x, y, f], i) => <circle key={i} cx={x} cy={y} r="4.5" fill={f} />)}</g>
      <g className="bv-conf" stroke="none" fill={tinta}>
        <path d="M232 60l2 5 5 1-4 3 1 5-4-3-5 3 1-5-4-3 5-1Z" />
        <path d="M12 86l2 5 5 1-4 3 1 5-4-3-5 3 1-5-4-3 5-1Z" />
      </g>
      {/* balão */}
      <path d="M197 108q4-6 9-10" strokeWidth="1.6" />
      <path d="M206 98l-3-5 6 0Z" fill={C.lilas} />
      <ellipse cx="206" cy="70" rx="22" ry="26" fill={C.lilas} />
      <path d="M196 58q4-7 11-7" strokeWidth="1.6" stroke="#fff" />
      {/* caixa */}
      <path d="M160 128h74v44h-74Z" fill={C.amarelo} />
      <path d="M154 114h86v16h-86Z" fill={C.pessego} />
      <path d="M197 114v58M197 130h37M160 130h37" />
      <ellipse cx="185" cy="107" rx="10" ry="5.5" transform="rotate(-28 185 107)" fill={C.rosa} />
      <ellipse cx="209" cy="107" rx="10" ry="5.5" transform="rotate(28 209 107)" fill={C.rosa} />
      <circle cx="197" cy="109" r="3.5" fill={C.rosa} />
    </Svg>
  );
}

// 2. Caderno: um caderno de espiral com uma frase marcada e a caneta marca-texto.
function Caderno() {
  return (
    <Svg rotulo="Um caderno de espiral com uma frase marcada em amarelo e uma caneta marca-texto">
      <Sombra x={128} y={186} rx={70} />
      <g transform="rotate(-4 130 100)">
        <path d="M58 34h140v148H58Z" fill={C.papel} />
        <path d="M58 34v148" strokeWidth="3" />
        {[0, 1, 2, 3, 4, 5].map(i => <circle key={i} cx="58" cy={50 + i * 24} r="5" fill={C.papel} />)}
        <Mao x={132} y={70} s={27}>Caderno</Mao>
        <path d="M80 86h100" stroke={C.amarelo} strokeWidth="11" strokeLinecap="butt" opacity=".95" />
        <path d="M80 90h96M80 110h104M80 130h90M80 150h100" strokeWidth="1.8" />
        <path d="M110 164l6 6 12-14" stroke="#6f8a45" />
      </g>
      {/* marca-texto */}
      <g transform="rotate(32 212 120)">
        <path d="M198 60h28v96h-28Z" fill={C.amarelo} />
        <path d="M198 156l6 16h16l6-16" fill={C.amarelo} />
        <path d="M208 172l4 12 4-12" fill={tinta} />
        <path d="M198 72h28" />
      </g>
    </Svg>
  );
}

// 3. Câmera: um celular fotografando, com duas páginas da apostila entrando nele.
function Camera() {
  const Pagina = ({ t }) => (
    <g transform={t}>
      <path d="M0 0h52v70H0Z" fill={C.papel} />
      <path d="M8 14h36M8 26h30M8 38h36M8 50h22" strokeWidth="1.6" />
      <path d="M8 26h30" stroke={C.pessego} strokeWidth="7" strokeLinecap="butt" opacity=".9" />
    </g>
  );
  return (
    <Svg rotulo="Um celular fotografando páginas da apostila">
      <Sombra x={130} y={188} rx={40} />
      <Pagina t="translate(14 56) rotate(-9)" />
      <Pagina t="translate(196 50) rotate(9)" />
      <path d="M72 100q20-6 32 0" strokeDasharray="4 5" />
      <path d="M186 100q-20-6-32 0" strokeDasharray="4 5" />
      <path d="M94 24h72q6 0 6 6v144q0 6-6 6H94q-6 0-6-6V30q0-6 6-6Z" fill={C.papel} />
      <path d="M96 42h68v108H96Z" fill={C.azul} />
      <path d="M120 36h20" strokeWidth="1.6" />
      <circle cx="130" cy="166" r="5" />
      {/* ícone de câmera na tela */}
      <path d="M108 88h10l5-8h14l5 8h10v32h-44Z" fill={C.papel} />
      <circle cx="130" cy="104" r="9" fill={C.papel} />
      <circle cx="130" cy="104" r="3.5" fill={tinta} stroke="none" />
      {/* flash */}
      <path d="M176 26l8-10M184 40h12M172 14l2-12" strokeWidth="1.8" stroke="#6f8a45" />
    </Svg>
  );
}

// 4. Prova: a folha da prova com questões marcadas e a nota 10,0; atrás, o gabarito.
function Prova() {
  return (
    <Svg rotulo="Uma prova com questões certas e a nota dez, com o gabarito atrás">
      <Sombra x={130} y={190} rx={64} />
      <g transform="rotate(6 160 110)">
        <path d="M92 36h118v150H92Z" fill={C.lilas} />
        <Mao x={151} y={62} s={20}>Gabarito</Mao>
      </g>
      <g transform="rotate(-3 120 100)">
        <path d="M58 24h122v160H58Z" fill={C.papel} />
        <path d="M86 52h66" stroke={C.verde} strokeWidth="10" strokeLinecap="butt" opacity=".9" />
        <Mao x={119} y={52} s={27}>Prova</Mao>
        {[76, 100, 124, 148].map((y, i) => (
          <g key={i}>
            <circle cx="76" cy={y} r="6.5" fill={i < 3 ? C.verde : C.papel} />
            {i < 3 && <path d={`M72 ${y}l3 3 6-7`} strokeWidth="1.8" />}
            <path d={`M92 ${y}h${i % 2 ? 60 : 72}`} strokeWidth="1.8" />
            <path d={`M92 ${y + 9}h${i % 2 ? 44 : 30}`} strokeWidth="1.4" stroke="#8a917d" />
          </g>
        ))}
      </g>
      <g transform="rotate(-10 198 50)">
        <circle cx="198" cy="50" r="27" fill={C.amarelo} />
        <circle cx="198" cy="50" r="21" strokeDasharray="3 4" strokeWidth="1.4" />
        <Mao x={198} y={57} s={20}>10,0</Mao>
      </g>
    </Svg>
  );
}

// 5. Calendário: um mês com o dia da aula marcado com coração, e um lápis.
function Calendario() {
  const dias = [];
  for (let l = 0; l < 4; l++) for (let c = 0; c < 7; c++) dias.push([62 + c * 20, 86 + l * 22]);
  return (
    <Svg rotulo="Um calendário com um dia marcado com coração e um lápis ao lado">
      <Sombra x={130} y={190} rx={80} />
      <path d="M48 44h164v136H48Z" fill={C.papel} />
      <path d="M48 44h164v30H48Z" fill={C.lilas} />
      <path d="M86 32v22M174 32v22" strokeWidth="3" />
      <Mao x={130} y={67} s={22}>Outubro</Mao>
      {dias.map(([x, y], i) => <path key={i} d={`M${x} ${y}h10`} strokeWidth="1.6" stroke={i === 16 ? 'transparent' : '#8a917d'} />)}
      <circle cx="187" cy="130" r="13" fill={C.pessego} />
      <path d="M187 136l-7-6q-3-3 0-6t6 0q3-3 6 0t0 6Z" fill={tinta} stroke="none" />
      {/* lápis */}
      <g transform="rotate(-35 220 150)">
        <path d="M212 96h16v70h-16Z" fill={C.amarelo} />
        <path d="M212 166l8 18 8-18Z" fill={C.papel} />
        <path d="M217 178l3 6 3-6Z" fill={tinta} stroke="none" />
        <path d="M212 96h16v10h-16Z" fill={C.rosa} />
      </g>
    </Svg>
  );
}

// 6. Celular: a tela inicial com o ícone do Caderno em destaque.
function Celular() {
  const icones = [C.lilas, C.verde, C.azul, C.rosa, C.pessego, C.amarelo, C.azul, C.lilas];
  return (
    <Svg rotulo="A tela inicial de um celular com o ícone do Caderno em destaque">
      <Sombra x={130} y={192} rx={40} />
      <path d="M90 14h80q6 0 6 6v160q0 6-6 6H90q-6 0-6-6V20q0-6 6-6Z" fill={C.papel} />
      <path d="M120 26h20" strokeWidth="1.6" />
      {icones.map((f, i) => <rect key={i} x={98 + (i % 4) * 17} y={42 + Math.floor(i / 4) * 17} width="12" height="12" rx="3" fill={f} strokeWidth="1.4" />)}
      {/* ícone do Caderno, grande */}
      <g transform="rotate(-5 130 120)">
        <rect x="104" y="92" width="52" height="52" rx="10" fill={C.papel} />
        <rect x="112" y="124" width="36" height="10" rx="2" fill={C.verde} stroke="none" />
        <text x="130" y="128" fill={tinta} stroke="none" textAnchor="middle" style={{ font: '800 italic 26px var(--f-texto)', letterSpacing: '-1px' }}>Cp</text>
      </g>
      <circle cx="130" cy="168" r="5" />
      <path d="M182 92l10-8M190 108h12M176 78l4-10" strokeWidth="1.8" stroke="#6f8a45" />
      <path d="M58 86l14 10M56 110h14M62 134l12-8" strokeWidth="1.8" stroke="#6f8a45" />
    </Svg>
  );
}

// 7. Vamos: a professora com o balão de fala.
function Vamos() {
  return <Personagem falas={['Vamos', 'começar?']} largura={340} />;
}

const ILUSTRACOES = { presente: Presente, caderno: Caderno, camera: Camera, prova: Prova, calendario: Calendario, celular: Celular, vamos: Vamos };
export default ILUSTRACOES;
