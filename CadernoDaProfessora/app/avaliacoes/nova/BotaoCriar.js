'use client';
// Botão que se desliga no primeiro clique: sem isso, cada clique impaciente criava
// uma avaliação nova (chegamos a ter 13 vazias em 17 segundos).
import { useFormStatus } from 'react-dom';

export default function BotaoCriar() {
  const { pending } = useFormStatus();
  return <button className="botao cheio" disabled={pending} aria-busy={pending}>{pending ? 'Criando…' : 'Criar e continuar'}</button>;
}
