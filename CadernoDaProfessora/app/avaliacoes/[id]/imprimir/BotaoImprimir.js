'use client';
export default function BotaoImprimir() {
  return <button className="botao pequeno" onClick={() => window.print()}>Imprimir ou salvar PDF</button>;
}
