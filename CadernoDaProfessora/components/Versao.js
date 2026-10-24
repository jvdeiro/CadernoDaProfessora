// Mostra qual versão está rodando. Serve para a professora (e para mim) saber, só de olhar,
// se o que está no ar é mesmo o que acabou de ser publicado.
const BUILD = new Date(); // avaliado quando o site é construído

export default function Versao() {
  const sha = (process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 7);
  const quando = BUILD.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
  return (
    <p className="versao" title={process.env.VERCEL_GIT_COMMIT_MESSAGE?.split('\n')[0] || ''}>
      versão <b>{sha || 'local'}</b> · {quando}
    </p>
  );
}
