'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

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
    else window.location.href = '/';
  }
  return (
    <div style={{ paddingTop: '8vh' }}>
      <p className="suave pequeno" style={{ margin: 0 }}>CED Proativo · Escola Pirralho</p>
      <h1>Caderno da <span className="hl verde">Professora</span></h1>
      <p className="suave">Turmas, conteúdos, aulas, provas e revisões, tudo num lugar só.</p>
      <form onSubmit={entrar} className="cartao fita" style={{ marginTop: 28, padding: '26px 18px 18px' }}>
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
