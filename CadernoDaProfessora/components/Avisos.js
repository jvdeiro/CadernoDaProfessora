'use client';
// Botão "Me avisar quando ficar pronto": pede permissão e inscreve o celular nas notificações.
import { useEffect, useState } from 'react';

const VAPID_PUBLICA = 'BIt6L4cFprelETF9xLRYUj79tg5MSHy1fDlco_cL7jMidJKtLubbc9_3TOBnvHAYV5Ryo0Ddq8rILq7CWsd84IM';
const chave = b => Uint8Array.from(atob(b.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - b.length % 4) % 4)), c => c.charCodeAt(0));

export async function inscreverAvisos() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'sem-suporte';
  const perm = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  if (perm !== 'granted') return 'negado';
  const reg = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chave(VAPID_PUBLICA) });
  await fetch('/api/push', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(sub) });
  return 'ok';
}

export default function Avisos() {
  const [estado, setEstado] = useState('');
  useEffect(() => {
    if (!('Notification' in window) || !('PushManager' in window)) { setEstado('sem-suporte'); return; }
    if (Notification.permission === 'granted') inscreverAvisos().then(setEstado).catch(() => setEstado('pedir'));
    else setEstado(Notification.permission === 'denied' ? 'negado' : 'pedir');
  }, []);
  if (estado === 'ok' || !estado) return <p className="pequeno avisado">🔔 Vamos te avisar com uma notificação quando terminar. Pode fechar o app.</p>;
  if (estado === 'sem-suporte') return <p className="pequeno avisado">Pode fechar o app: continua sozinho. Para receber a notificação quando terminar, no iPhone instale o app na tela inicial (Compartilhar → Adicionar à Tela de Início).</p>;
  if (estado === 'negado') return <p className="pequeno avisado">Pode fechar o app: continua sozinho. As notificações estão bloqueadas nas configurações do celular para este site.</p>;
  return (
    <div className="avisado">
      <p className="pequeno" style={{ margin: '0 0 8px' }}>Pode fechar o app: continua sozinho.</p>
      <button className="botao pastel pequeno" style={{ '--c': 'var(--amarelo)' }} onClick={async () => setEstado(await inscreverAvisos().catch(() => 'pedir'))}>🔔 Me avisar quando ficar pronto</button>
    </div>
  );
}
