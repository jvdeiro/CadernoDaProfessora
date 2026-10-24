'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Icone from '@/components/Icone';

async function reduzir(file) {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const max = 1900, k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const cv = document.createElement('canvas');
  cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k);
  cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
  return await new Promise(res => cv.toBlob(res, 'image/jpeg', 0.86));
}
const ROT = ['-2deg', '1.5deg', '-1deg', '2deg', '0deg'];
const ST = { enviada: 'Na fila', lendo: 'Lendo…', lida: 'Lida', erro: 'Deu erro', fora: 'Fora do assunto', enviando: 'Enviando…' };

async function post(url) {
  const r = await fetch(url, { method: 'POST' });
  let j = {}; try { j = await r.json(); } catch {}
  if (!r.ok) throw new Error(j.erro || 'Algo deu errado. Tente de novo.');
  return j;
}

export default function Paginas({ conteudoId, iniciais, pronto }) {
  const [pags, setPags] = useState(iniciais);
  const [fase, setFase] = useState('');
  const [erro, setErro] = useState('');
  const [prog, setProg] = useState({ f: 0, t: 0 });
  const input = useRef(null);
  const router = useRouter();
  const sb = createClient();
  const ocupado = !!fase;
  const pendentes = pags.filter(p => ['enviada', 'erro'].includes(p.status));
  const precisaOrganizar = !pronto || pags.some(p => p.novo);

  const atualiza = (id, mud) => setPags(ps => ps.map(p => (p.id === id ? { ...p, ...mud } : p)));

  async function lerTodas(lista) {
    setFase('lendo'); setErro('');
    let feitas = 0; setProg({ f: 0, t: lista.length });
    const fila = [...lista];
    const trabalhador = async () => {
      while (fila.length) {
        const p = fila.shift();
        atualiza(p.id, { status: 'lendo' });
        try { const j = await post(`/api/paginas/${p.id}/ler`); atualiza(p.id, { status: j.status, numero: j.numero }); }
        catch (e) { atualiza(p.id, { status: 'erro', erro: e.message }); setErro(e.message); }
        feitas++; setProg({ f: feitas, t: lista.length });
      }
    };
    await Promise.all([trabalhador(), trabalhador()]);
  }
  async function organizar() {
    setFase('organizando'); setErro('');
    try { await post(`/api/conteudos/${conteudoId}/organizar`); setPags(ps => ps.map(p => ({ ...p, novo: false }))); router.refresh(); }
    catch (e) { setErro(e.message); }
    setFase('');
  }
  async function escolher(e) {
    const files = [...(e.target.files || [])];
    e.target.value = '';
    if (!files.length) return;
    setFase('enviando'); setErro(''); setProg({ f: 0, t: files.length });
    const novas = [];
    let ordem = pags.length;
    for (const [i, f] of files.entries()) {
      try {
        const blob = await reduzir(f);
        const path = `${conteudoId}/${crypto.randomUUID()}.jpg`;
        const up = await sb.storage.from('paginas').upload(path, blob, { contentType: 'image/jpeg' });
        if (up.error) throw up.error;
        const { data, error } = await sb.from('paginas').insert({ conteudo_id: conteudoId, storage_path: path, ordem: ordem++ }).select('id').single();
        if (error) throw error;
        const p = { id: data.id, status: 'enviada', url: URL.createObjectURL(blob), novo: true };
        novas.push(p); setPags(ps => [...ps, p]);
      } catch (err) { setErro('Não consegui enviar uma das fotos. Confira a internet e tente de novo.'); }
      setProg({ f: i + 1, t: files.length });
    }
    if (novas.length) { await lerTodas(novas); await organizar(); }
    else setFase('');
  }
  async function remover(p) {
    if (!window.confirm('Tirar esta foto do conteúdo?')) return;
    await sb.from('paginas').delete().eq('id', p.id);
    setPags(ps => ps.filter(x => x.id !== p.id).map(x => ({ ...x, novo: true })));
  }

  return (
    <section>
      <label className="enviar" aria-disabled={ocupado} style={ocupado ? { opacity: .6, pointerEvents: 'none' } : null}>
        <Icone n="camera" style={{ width: 34, height: 34 }} />
        <b>{pags.length ? 'Mandar mais fotos' : 'Mandar as fotos das páginas'}</b>
        <span className="suave pequeno">Pode escolher várias de uma vez, da galeria ou da câmera. Não precisa estar em ordem.</span>
        <input ref={input} type="file" accept="image/*" multiple onChange={escolher} />
      </label>

      {fase && (
        <div className="carregando" role="status" aria-live="polite">
          <Icone n="lapis" className="lapis" />
          <div style={{ flex: 1 }}>
            <b>{fase === 'enviando' ? `Enviando fotos (${prog.f} de ${prog.t})…` : fase === 'lendo' ? `Lendo as páginas (${prog.f} de ${prog.t})…` : 'Organizando o resumo e conferindo erros da apostila…'}</b>
            <div className="pequeno">{fase === 'organizando' ? 'Isso leva uns 2 minutos. Pode deixar a tela aberta.' : 'Pode deixar a tela aberta enquanto isso.'}</div>
            {fase !== 'organizando' && <div className="progresso"><i style={{ width: `${prog.t ? (prog.f / prog.t) * 100 : 0}%` }} /></div>}
          </div>
        </div>
      )}
      {erro && <p className="aviso erro" role="alert">{erro}</p>}

      {pags.length > 0 && (
        <div className="fotos">
          {pags.map((p, i) => (
            <div key={p.id} className="foto" style={{ '--r': ROT[i % ROT.length] }}>
              {p.url && <img src={p.url} alt={`Foto ${i + 1}${p.numero ? `, página ${p.numero}` : ''}`} />}
              {p.numero && <span className="pg">p. {p.numero}</span>}
              <span className="st" style={p.status === 'erro' || p.status === 'fora' ? { background: '#f6d3c8' } : null}>{ST[p.status] || p.status}</span>
              {!ocupado && <button onClick={() => remover(p)} aria-label="Tirar foto" style={{ position: 'absolute', top: 2, right: 2, width: 30, height: 30, borderRadius: '50%', border: 0, background: 'rgba(255,253,247,.9)', fontWeight: 700 }}>×</button>}
            </div>
          ))}
        </div>
      )}
      {!ocupado && pendentes.length > 0 && <button className="botao pastel cheio" onClick={async () => { await lerTodas(pendentes); await organizar(); }}>Ler as fotos que faltam</button>}
      {!ocupado && !pendentes.length && pags.length > 0 && precisaOrganizar && <button className="botao cheio" onClick={organizar}>Organizar o resumo</button>}
    </section>
  );
}
