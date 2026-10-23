import Link from 'next/link';
import Icone from './Icone';

export function Voltar({ href, children = 'Voltar' }) {
  return <Link href={href} className="voltar"><Icone n="voltar" style={{ width: 18, height: 18 }} />{children}</Link>;
}
export function ItemLink({ href, titulo, sub, etq, etqCor, icone }) {
  return (
    <li>
      <Link href={href} className="item-link">
        {icone}
        <div style={{ minWidth: 0 }}>
          <div className="tit">{titulo}</div>
          {sub && <div className="sub">{sub}</div>}
        </div>
        {etq && <span className="etq" style={{ '--c': etqCor, marginLeft: 'auto' }}>{etq}</span>}
        <Icone n="seta" className="seta" style={{ width: 20, height: 20, marginLeft: etq ? 6 : 'auto' }} />
      </Link>
    </li>
  );
}
export function Vazio({ titulo, children }) {
  return <div className="vazio"><span className="mao">{titulo}</span>{children}</div>;
}
export function SemAcesso({ email }) {
  return (
    <div style={{ paddingTop: '10vh' }}>
      <h1>Ops, <span className="hl pessego">sem acesso</span></h1>
      <p>O e-mail <b>{email}</b> ainda não tem acesso ao Caderno. Peça para o João liberar.</p>
      <form action="/api/sair" method="post"><button className="botao claro">Sair</button></form>
    </div>
  );
}
export const STATUS = {
  rascunho: { t: 'Começando', c: 'var(--amarelo)' },
  prova_pronta: { t: 'Prova pronta', c: 'var(--verde)' },
  revisoes_prontas: { t: 'Prova e revisões prontas', c: 'var(--verde)' },
  historico: { t: 'Feita antes do Caderno', c: 'var(--lilas)' },
};
