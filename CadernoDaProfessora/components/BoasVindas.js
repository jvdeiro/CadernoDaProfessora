'use client';
// Passeio de boas-vindas: tela inteira, mecânica de "stories" (toque na direita avança, na esquerda volta,
// arrastar para o lado também), com barrinhas de progresso em cima. Não avança sozinho: é para ler no seu tempo.
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import SLIDES from '@/app/boas-vindas/slides';
import ILUSTRACOES from './Ilustracoes';
import { concluirBoasVindas } from '@/app/acoes';

function Titulo({ t, cor }) {
  return t.split('*').map((p, k) => (k % 2 ? <span key={k} className="hl" style={{ '--hl': cor }}>{p}</span> : p));
}

export default function BoasVindas({ nome, marcar = true, voltarPara = '/' }) {
  const [i, setI] = useState(0);
  const [fechando, setFechando] = useState(false);
  const inicio = useRef(null);
  const caixa = useRef(null);
  const router = useRouter();
  const n = SLIDES.length, s = SLIDES[i], ultimo = i === n - 1;
  const Figura = ILUSTRACOES[s.figura];

  useEffect(() => {
    const antes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    caixa.current?.focus({ preventScroll: true });
    return () => { document.body.style.overflow = antes; };
  }, []);

  async function concluir() {
    if (fechando) return;
    setFechando(true);
    try { if (marcar) await concluirBoasVindas(); } catch {}
    router.replace(voltarPara);
    router.refresh();
  }
  const prox = () => (ultimo ? concluir() : setI(i + 1));
  const ant = () => setI(Math.max(0, i - 1));

  function teclas(e) {
    if (e.key === 'ArrowRight' || e.key === 'Enter' && e.target === caixa.current) prox();
    else if (e.key === 'ArrowLeft') ant();
    else if (e.key === 'Escape') concluir();
  }
  function soltou(e) {
    const ini = inicio.current; inicio.current = null;
    if (!ini) return;
    const dx = e.clientX - ini.x, dy = e.clientY - ini.y;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) return dx < 0 ? prox() : ant(); // arrastou para o lado
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10 && Date.now() - ini.t < 500) { // toque curto
      const r = e.currentTarget.getBoundingClientRect();
      return e.clientX - r.left < r.width * 0.3 ? ant() : prox();
    }
  }

  return (
    <div className={`bv${fechando ? ' saindo' : ''}`} role="dialog" aria-modal="true" aria-label="Boas-vindas ao Caderno" tabIndex={-1} ref={caixa} onKeyDown={teclas} style={{ '--c': s.cor }}>
      <div className="bv-topo">
        <div className="bv-prog" aria-hidden="true">{SLIDES.map((x, k) => <i key={x.id} className={k < i ? 'feito' : k === i ? 'atual' : ''} />)}</div>
        <span className="sr" aria-live="polite">Tela {i + 1} de {n}</span>
        <button type="button" className="bv-pular" onClick={concluir}>Pular</button>
      </div>

      <div className="bv-palco" onPointerDown={e => { if (e.button === 0) inicio.current = { x: e.clientX, y: e.clientY, t: Date.now() }; }} onPointerUp={soltou} onPointerCancel={() => { inicio.current = null; }}>
        <div className="bv-slide" key={s.id}>
          <div className="bv-fig">{Figura && <Figura nome={nome} />}</div>
          <p className="eyebrow">{s.rotulo}</p>
          <h1><Titulo t={s.titulo} cor={s.cor} /></h1>
          <p className="dek">{s.texto}</p>
          {s.nota && <p className="bv-nota">{s.nota}</p>}
          {i === 0 && <p className="bv-dica" aria-hidden="true">toque ou arraste para o lado →</p>}
        </div>
      </div>

      <div className="bv-rodape">
        {i > 0 && <button type="button" className="botao claro" onClick={ant}>Voltar</button>}
        <button type="button" className="botao" onClick={prox} disabled={fechando}>{fechando ? 'Abrindo…' : ultimo ? (s.botao || 'Começar') : 'Próximo'}</button>
      </div>
    </div>
  );
}
