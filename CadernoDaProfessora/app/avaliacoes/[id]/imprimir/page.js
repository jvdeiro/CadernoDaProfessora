import { contexto } from '@/lib/dados';
import { PreviaProva, PreviaGabarito, PreviaFichas } from '@/components/Previa';
import BotaoImprimir from './BotaoImprimir';

export const dynamic = 'force-dynamic';

export default async function Imprimir({ params, searchParams }) {
  const { id } = await params;
  const { doc = 'prova' } = await searchParams;
  const { sb } = await contexto();
  const { data: av } = await sb.from('avaliacoes').select('prova,revisoes').eq('id', id).single();
  if (!av) return null;
  return (
    <div className="imprimir">
      <style>{`@media print { .nao-imprimir { display:none } .folha { border:0; box-shadow:none; margin:0; padding:0 } body { background:#fff } .a4 { border:0; box-shadow:none } }`}</style>
      <div className="nao-imprimir botoes"><a href={`/avaliacoes/${id}`} className="botao claro pequeno">Voltar</a><BotaoImprimir /></div>
      {doc === 'prova' && av.prova && <PreviaProva prova={av.prova} />}
      {doc === 'gabarito' && av.prova && <PreviaGabarito prova={av.prova} />}
      {doc === 'revisoes' && av.revisoes && <PreviaFichas rev={av.revisoes} />}
    </div>
  );
}
