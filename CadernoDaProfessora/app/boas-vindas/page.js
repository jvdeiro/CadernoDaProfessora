import { redirect } from 'next/navigation';
import { contexto } from '@/lib/dados';
import { SemAcesso } from '@/components/UI';
import BoasVindas from '@/components/BoasVindas';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Boas-vindas · Caderno da Professora' };

// Link das boas-vindas. Só abre para a conta que recebeu o passeio (pendente ou já visto).
// Para eu conferir antes com a minha conta, sem marcar nada: /boas-vindas?previa=1
export default async function PaginaBoasVindas({ searchParams }) {
  const sp = await searchParams;
  const { user, membro } = await contexto();
  if (!membro) return <SemAcesso email={user?.email} />;
  const previa = sp.previa === '1';
  const dela = membro.boas_vindas_pendente || !!membro.boas_vindas_vista_em;
  if (!dela && !previa) redirect('/');
  return <BoasVindas nome={membro.nome} marcar={!!membro.boas_vindas_pendente && !previa} />;
}
