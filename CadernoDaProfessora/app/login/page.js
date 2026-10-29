'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Personagem from '@/components/Personagem';

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [indo, setIndo] = useState(false);
  async function entrar(e) {
    e.preventDefault();
    setErro(''); setIndo(true);
    const { error } = await createClient().auth.signInWithPassword({ email: email.trim(), password: senha });
    setIndo(false);
    if (error) setErro('E-mail ou senha não conferem. Confira e tente de novo.');
    else {
      const para = new URLSearchParams(window.location.search).get('para') || '';
      window.location.href = para.startsWith('/') && !para.startsWith('//') ? para : '/';
    }
  }
  return (
    <div style={{ paddingTop: '2vh' }}>
      <p className="eyebrow">Entrar</p>
      <h1>Bem-vinda ao <span className="hl verde">seu caderno</span></h1>
      <p className="dek">Turmas, conteúdos, aulas, provas e revisões, tudo num lugar só.</p>
      <Personagem falas={['Que bom ter', 'você aqui!']} />
      <form onSubmit={entrar} className="cartao fita" style={{ padding: '26px 20px 20px' }}>
        <label className="campo"><span>Seu e-mail</span>
          <input type="email" inputMode="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} />
        </label>
        <label className="campo"><span>Senha</span>
          <input type="password" autoComplete="current-password" required value={senha} onChange={e => setSenha(e.target.value)} />
        </label>
        {erro && <p className="aviso erro" role="alert">{erro}</p>}
        <button className="botao cheio" disabled={indo}>{indo ? 'Entrando…' : 'Entrar'}</button>
        <p className="suave pequeno" style={{ marginTop: 14, textAlign: 'center' }}>Esqueceu a senha? Fale com o João.</p>
      </form>
    </div>
  );
}
