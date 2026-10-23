// Ícone do app: papel pontilhado, margem de caderno e marca-texto verde
export default function DesenhoIcone({ s }) {
  const u = s / 512;
  return (
    <div style={{ width: s, height: s, display: 'flex', position: 'relative', background: '#f6f4ec', backgroundImage: 'radial-gradient(#dcd8c9 3px, transparent 3.5px)', backgroundSize: `${46 * u}px ${46 * u}px` }}>
      <div style={{ position: 'absolute', left: 112 * u, top: 0, bottom: 0, width: 6 * u, background: '#6f7759' }} />
      <div style={{ position: 'absolute', left: 160 * u, top: 262 * u, width: 280 * u, height: 98 * u, background: '#cfe0b6', borderRadius: 12 * u }} />
      <div style={{ position: 'absolute', left: 150 * u, top: 120 * u, fontSize: 210 * u, fontWeight: 800, color: '#2c3124', letterSpacing: -8 * u, fontStyle: 'italic' }}>Cp</div>
    </div>
  );
}
