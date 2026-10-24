'use client';
// Fotos da apostila. A leitura roda no servidor (robô da fila, uma foto por vez);
// esta tela só envia as fotos e acompanha o andamento, mesmo depois de fechar ou recarregar.
import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Icone from '@/components/Icone';
import Avisos, { inscreverAvisos } from '@/components/Avisos';
import { postPersistente } from '@/lib/persistente';

async function reduzir(file) {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const max = 1900, k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const cv = document.createElement('canvas');
  cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k);
  cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
  return await new Promise(res => cv.toBlob(res, 'image/jpeg', 0.86));
}
const ST = { enviada: 'Na fila', lendo: 'Lendo…', lida: 'Lida', erro: 'Deu erro', fora: 'Fora do assunto' };
const SEG_POR_FOTO = 35;          // estimativa inicial (leitura + respiro), ajustada pelo ritmo real
const ESPERAS_OFFLINE = [5, 10, 20, 30];
const numeroDe = folhas => (folhas || []).map(x => x.numero).filter(Boolean).join(', ') || null;
const num = s => { const m = String(s || '').match(/\d+/); return m ? parseInt(m[0]) : 99999; };
// Ordem da apostila: fotos já catalogadas primeiro (digital, depois física, por número de página); as outras no fim.
const ordenar = ps => ps.map((p, i) => ({ p, i })).sort((a, b) => {
  const ca = a.p.numero ? 0 : 1, cb = b.p.numero ? 0 : 1;
  return ca - cb || (a.p.origem === 'digital' ? 0 : 1) - (b.p.origem === 'digital' ? 0 : 1) || num(a.p.numero) - num(b.p.numero) || a.i - b.i;
}).map(x => x.p);

// Reorganização animada (FLIP): cada foto desliza num arco leve até o novo lugar, uma depois da outra.
function useReorganizar(chave) {
  const els = useRef(new Map()), antes = useRef(new Map());
  useLayoutEffect(() => {
    const calmo = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let k = 0;
    els.current.forEach((el, id) => {
      const r = el.getBoundingClientRect(), a = antes.current.get(id);
      antes.current.set(id, r);
      if (!a || calmo || !el.animate) return;
      const dx = a.left - r.left, dy = a.top - r.top;
      if (Math.abs(dx) < 2 && Math.abs(dy) < 2) return;
      el.animate([
        { transform: `translate(${dx}px, ${dy}px)`, zIndex: 2 },
        { transform: `translate(${dx * .45}px, ${dy * .45 - 12}px) scale(1.04) rotate(-2deg)`, zIndex: 2, boxShadow: '6px 10px 0 #5c654018', offset: .45 },
        { transform: 'none', zIndex: 2 },
      ], { duration: 760, delay: (k++) * 70, easing: 'cubic-bezier(.45,.05,.25,1)', fill: 'backwards' });
    });
  }, [chave]);
  return (id) => el => { if (el) els.current.set(id, el); else els.current.delete(id); };
}

function tempoRestante(seg) {
  if (seg < 60) return 'menos de 1 min';
  const m = Math.round(seg / 60);
  return m < 60 ? `cerca de ${m} min` : `cerca de ${Math.floor(m / 60)} h ${m % 60} min`;
}

function Selo({ estado, info }) {
  const [aberto, setAberto] = useState(false);
  const rotulo = { atualizando: 'Atualizando', ok: 'Tudo certo', offline: 'Sem internet' }[estado];
  return (
    <div className="selo-wrap">
      <button type="button" className={`selo ${estado}`} aria-label={`${rotulo}. Toque para ver detalhes.`} aria-expanded={aberto} onClick={() => setAberto(a => !a)}>
        {estado === 'atualizando' && <svg viewBox="0 0 24 24" className="cobrinha" aria-hidden="true"><circle cx="12" cy="12" r="8" /></svg>}
        {estado === 'ok' && <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 12.5l3.6 3.4 7.6-8.4" /></svg>}
        {estado === 'offline' && <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5c4.5-4 11.5-4 16 0M7 13c2.9-2.4 7.1-2.4 10 0M10.2 16.4c1-.8 2.6-.8 3.6 0M4 4l16 16" /></svg>}
      </button>
      {aberto && (
        <div className="selo-info" role="status">
          <b>{rotulo}</b>
          {estado === 'offline'
            ? <>Sem conexão desde {info.desde}. Tento de novo em {info.proxima} s. A leitura continua no servidor mesmo assim.</>
            : <>Última atualização: {info.ultima}. A tela se atualiza sozinha a cada {info.intervalo} s.</>}
        </div>
      )}
    </div>
  );
}

export default function Paginas({ conteudoId, iniciais, pronto, processandoInicial }) {
  const [pags, setPags] = useState(iniciais);
  const [proc, setProc] = useState({ processando: processandoInicial, pausaAte: null, organizando: false });
  const [envio, setEnvio] = useState(null); // { f, t } enquanto sobe as fotos
  const [erro, setErro] = useState('');
  const [sinc, setSinc] = useState({ estado: 'ok', ultima: Date.now(), falhas: 0, desde: null, proxima: 0 });
  const [agora, setAgora] = useState(Date.now());
  const [organizandoManual, setOrganizandoManual] = useState(false);
  const ritmo = useRef({ prontas: null, t: null, segs: [] });
  const router = useRouter();
  const sb = createClient();

  const total = pags.length;
  const prontas = pags.filter(p => ['lida', 'fora'].includes(p.status)).length;
  const comErro = pags.filter(p => p.status === 'erro').length;
  const faltam = pags.filter(p => ['enviada', 'lendo'].includes(p.status)).length;
  const ativo = proc.processando;
  const precisaOrganizar = !pronto || pags.some(p => p.novo);

  // ritmo real: quanto tempo leva cada foto (média das últimas)
  useEffect(() => {
    const r = ritmo.current, t = Date.now();
    if (r.prontas !== null && prontas > r.prontas && r.t) r.segs = [...r.segs, (t - r.t) / 1000 / (prontas - r.prontas)].slice(-6);
    if (r.prontas !== prontas) { r.prontas = prontas; r.t = t; }
  }, [prontas]);
  const segFoto = ritmo.current.segs.length ? ritmo.current.segs.reduce((a, b) => a + b, 0) / ritmo.current.segs.length : SEG_POR_FOTO;
  const pausaRestante = proc.pausaAte ? Math.max(0, Math.round((new Date(proc.pausaAte).getTime() - agora) / 1000)) : 0;
  const eta = faltam * segFoto + pausaRestante + 90; // + organizar o resumo

  const atualizar = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) throw new Error('offline');
    setSinc(s => ({ ...s, estado: 'atualizando' }));
    const [{ data: ps, error: e1 }, { data: c, error: e2 }] = await Promise.all([
      sb.from('paginas').select('id,status,erro,lendo_em,folhas:transcricao->paginas,origem:transcricao->>origem').eq('conteudo_id', conteudoId),
      sb.from('conteudos').select('processando,status,pausa_ate,organizando_em').eq('id', conteudoId).single(),
    ]);
    if (e1 || e2) throw new Error('falha');
    setPags(atual => atual.map(p => { const d = ps.find(x => x.id === p.id); return d ? { ...p, status: d.status, erro: d.erro, origem: d.origem || p.origem, numero: numeroDe(d.folhas) || p.numero } : p; }));
    setProc(antes => {
      if (antes.processando && !c.processando) setTimeout(() => router.refresh(), 300); // terminou: mostra o resumo
      return { processando: c.processando, pausaAte: c.pausa_ate, organizando: !!c.organizando_em };
    });
    setSinc({ estado: 'ok', ultima: Date.now(), falhas: 0, desde: null, proxima: 0 });
  }, [conteudoId]);

  // atualização automática enquanto a leitura está ativa (e volta sozinha quando a internet volta)
  useEffect(() => {
    if (!ativo) return;
    let parar = false, timer;
    const ciclo = async () => {
      let espera = 5;
      try { await atualizar(); }
      catch {
        setSinc(s => {
          const falhas = s.falhas + 1;
          espera = ESPERAS_OFFLINE[Math.min(falhas - 1, ESPERAS_OFFLINE.length - 1)];
          return { ...s, estado: 'offline', falhas, desde: s.desde || Date.now(), proxima: Date.now() + espera * 1000 };
        });
      }
      if (!parar) timer = setTimeout(ciclo, espera * 1000);
    };
    ciclo();
    const voltou = () => { clearTimeout(timer); ciclo(); };
    window.addEventListener('online', voltou);
    return () => { parar = true; clearTimeout(timer); window.removeEventListener('online', voltou); };
  }, [ativo, atualizar]);

  useEffect(() => { const t = setInterval(() => setAgora(Date.now()), 1000); return () => clearInterval(t); }, []);

  async function colocarNaFila() {
    setErro('');
    inscreverAvisos().catch(() => {}); // aproveita o toque para pedir permissão de aviso
    try { await postPersistente(`/api/conteudos/${conteudoId}/processar`); setProc(p => ({ ...p, processando: true })); setPags(ps => ps.map(p => p.status === 'erro' ? { ...p, status: 'enviada' } : p)); }
    catch (e) { setErro(e.message); }
  }

  async function escolher(e) {
    const files = [...(e.target.files || [])];
    e.target.value = '';
    if (!files.length) return;
    setErro(''); setEnvio({ f: 0, t: files.length });
    let ordem = pags.length, enviadas = 0;
    for (const [i, f] of files.entries()) {
      try {
        const blob = await reduzir(f);
        const path = `${conteudoId}/${crypto.randomUUID()}.jpg`;
        const up = await sb.storage.from('paginas').upload(path, blob, { contentType: 'image/jpeg' });
        if (up.error) throw up.error;
        const { data, error } = await sb.from('paginas').insert({ conteudo_id: conteudoId, storage_path: path, ordem: ordem++ }).select('id').single();
        if (error) throw error;
        enviadas++;
        setPags(ps => [...ps, { id: data.id, status: 'enviada', url: URL.createObjectURL(blob), novo: true }]);
      } catch { setErro('Não consegui enviar uma das fotos. Confira a internet e mande essa de novo.'); }
      setEnvio({ f: i + 1, t: files.length });
    }
    setEnvio(null);
    if (enviadas) await colocarNaFila();
  }

  async function remover(p) {
    if (!window.confirm('Tirar esta foto do conteúdo?')) return;
    await sb.from('paginas').delete().eq('id', p.id);
    setPags(ps => ps.filter(x => x.id !== p.id).map(x => ({ ...x, novo: true })));
  }

  async function organizarAgora() {
    setOrganizandoManual(true); setErro('');
    try { await postPersistente(`/api/conteudos/${conteudoId}/organizar`); setPags(ps => ps.map(p => ({ ...p, novo: false }))); router.refresh(); }
    catch (e) { setErro(e.message); }
    setOrganizandoManual(false);
  }

  const info = {
    ultima: new Date(sinc.ultima).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    desde: sinc.desde ? new Date(sinc.desde).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '',
    proxima: Math.max(0, Math.round((sinc.proxima - agora) / 1000)),
    intervalo: 5,
  };
  const ocupado = !!envio || ativo || organizandoManual;
  const emOrdem = ordenar(pags);
  const refFoto = useReorganizar(emOrdem.map(p => p.id).join());

  return (
    <section>
      <label className="enviar" aria-disabled={!!envio} style={envio ? { opacity: .6, pointerEvents: 'none' } : null}>
        <Icone n="camera" style={{ width: 34, height: 34 }} />
        <b>{pags.length ? 'Mandar mais fotos' : 'Mandar as fotos das páginas'}</b>
        <span className="suave pequeno">Pode escolher várias de uma vez, da galeria ou da câmera. Não precisa estar em ordem.</span>
        <input type="file" accept="image/*" multiple onChange={escolher} />
      </label>

      {envio && (
        <div className="carregando" role="status" aria-live="polite">
          <Icone n="lapis" className="lapis" />
          <div style={{ flex: 1 }}>
            <b>Enviando fotos ({envio.f} de {envio.t})…</b>
            <div className="pequeno">Deixe esta tela aberta só até terminar o envio.</div>
            <div className="progresso"><i style={{ width: `${(envio.f / envio.t) * 100}%` }} /></div>
          </div>
        </div>
      )}

      {!envio && (ativo || organizandoManual) && (
        <div className="carregando acompanhamento" role="status" aria-live="polite">
          <Icone n="lapis" className="lapis" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <b>{proc.organizando || organizandoManual ? 'Organizando o resumo…' : `Lendo as páginas: ${prontas} de ${total} prontas`}</b>
            <div className="pequeno">
              {pausaRestante > 0
                ? <>As IAs gratuitas pediram uma pausa. Volto a ler em {pausaRestante} s, sozinho.</>
                : <>Tempo restante estimado: <b className="eta">{tempoRestante(proc.organizando ? 90 : eta)}</b></>}
            </div>
            <div className="progresso"><i style={{ width: `${total ? ((proc.organizando ? total : prontas) / total) * 100 : 0}%` }} /></div>
            <Avisos />
          </div>
          {ativo && <Selo estado={sinc.estado} info={info} />}
        </div>
      )}
      {erro && <p className="aviso erro" role="alert">{erro}</p>}

      {pags.length > 0 && (
        <div className="fotos">
          {emOrdem.map((p, i) => (
            <div key={p.id} ref={refFoto(p.id)} className={`foto st-${p.status}`}>
              {p.url && <img src={p.url} alt={`Foto ${i + 1}${p.numero ? `, página ${p.numero}` : ''}`} />}
              {p.numero && <span className="pg">p. {p.numero}</span>}
              <span className="st">{p.status === 'lida' && <i className="carimbo" aria-hidden="true">✓</i>}{ST[p.status] || p.status}</span>
              {!ocupado && <button onClick={() => remover(p)} aria-label="Tirar foto" className="tirar">×</button>}
            </div>
          ))}
        </div>
      )}
      {!ocupado && (faltam > 0 || comErro > 0) && <button className="botao pastel cheio" onClick={colocarNaFila}>{comErro && !faltam ? `Tentar de novo as ${comErro} fotos com erro` : 'Ler as fotos que faltam'}</button>}
      {!ocupado && !faltam && !comErro && pags.length > 0 && precisaOrganizar && <button className="botao cheio" onClick={organizarAgora}>Organizar o resumo</button>}
    </section>
  );
}
