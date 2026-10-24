// Ícone do app: papel pontilhado e marca-texto verde
export default function DesenhoIcone({ s }) {
  const u = s / 512;
  return (
    <div style={{ width: s, height: s, display: 'flex', position: 'relative', background: '#f7f6ee', backgroundImage: 'radial-gradient(#dcd8c9 3px, transparent 3.5px)', backgroundSize: `${46 * u}px ${46 * u}px` }}>
      <div style={{ position: 'absolute', left: 160 * u, top: 262 * u, width: 280 * u, height: 98 * u, background: '#d5e6bd', borderRadius: 12 * u }} />
      <div style={{ position: 'absolute', left: 150 * u, top: 120 * u, fontSize: 210 * u, fontWeight: 800, color: '#303a2b', letterSpacing: -8 * u, fontStyle: 'italic' }}>Cp</div>
    </div>
  );
}
