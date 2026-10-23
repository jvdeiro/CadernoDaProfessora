'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function GuardarArquivo({ turmas, materias }) {
  const [msg, setMsg] = useState('');
  const [indo, setIndo] = useState(false);
  const router = useRouter();
  async function enviar(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const arq = f.get('arquivo');
    if (!arq?.size) return;
    setIndo(true); setMsg('');
    const sb = createClient();
    const nome = arq.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.\-]+/g, '_');
    const path = `avulsos/${crypto.randomUUID()}/${nome}`;
    const up = await sb.storage.from('materiais').upload(path, arq, { contentType: arq.type || 'application/octet-stream' });
    if (up.error) { setMsg('Não consegui guardar o arquivo. Tente de novo.'); setIndo(false); return; }
    await sb.from('materiais').insert({ titulo: f.get('titulo') || arq.name, turma_id: f.get('turma_id') || null, materia_id: f.get('materia_id') || null, tipo: nome.split('.').pop(), storage_path: path });
    setIndo(false); setMsg('Arquivo guardado!'); e.target.reset(); router.refresh();
  }
  return (
    <form onSubmit={enviar}>
      <label className="campo"><span>Arquivo</span><input type="file" name="arquivo" required /></label>
      <label className="campo"><span>Nome</span><input name="titulo" placeholder="Ex.: A7 de Geografia corrigida" /></label>
      <div className="campo"><span>Turma</span><div className="escolhas">{turmas.map(t => <label key={t.id} className="escolha" style={{ '--c': `var(--${t.cor})` }}><input type="radio" name="turma_id" value={t.id} /><span>{t.nome}</span></label>)}</div></div>
      <div className="campo"><span>Matéria</span><div className="escolhas">{materias.map(m => <label key={m.id} className="escolha" style={{ '--c': `var(--${m.cor})` }}><input type="radio" name="materia_id" value={m.id} /><span>{m.nome}</span></label>)}</div></div>
      {msg && <p className="aviso ok">{msg}</p>}
      <button className="botao pequeno" disabled={indo}>{indo ? 'Guardando…' : 'Guardar arquivo'}</button>
    </form>
  );
}
