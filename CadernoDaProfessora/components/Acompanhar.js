'use client';
// Atualização automática da tela + selo de estado, usados em toda etapa que roda no servidor
// (leitura das fotos, organização do resumo, prova e revisões).
import { useState, useEffect, useRef } from 'react';

export const INTERVALO_S = 15;              // de quanto em quanto tempo a tela confere o andamento
const ESPERAS_OFFLINE = [10, 20, 30];       // sem internet: tenta de novo com folga crescente
const GIRO_MIN_MS = 3000;                   // a cobrinha gira pelo menos ~3 s, para dar para ver

// Chama `aoAtualizar` de tempos em tempos enquanto `ativo`, e volta sozinha quando a internet volta.
// Devolve { estado, info } para o <Selo>.
export function useAtualizacao(aoAtualizar, ativo) {
  const [sinc, setSinc] = useState({ estado: 'ok', ultima: Date.now(), falhas: 0, desde: null, proxima: 0 });
  const [agora, setAgora] = useState(Date.now());
  const fn = useRef(aoAtualizar);
  fn.current = aoAtualizar;

  useEffect(() => { const t = setInterval(() => setAgora(Date.now()), 1000); return () => clearInterval(t); }, []);

  useEffect(() => {
    if (!ativo) return;
    let parar = false, timer;
    const ciclo = async () => {
      let espera = INTERVALO_S;
      try {
        if (typeof navigator !== 'undefined' && !navigator.onLine) throw new Error('offline');
        const t0 = Date.now();
        setSinc(s => ({ ...s, estado: 'atualizando' }));
        await fn.current();
        const resto = GIRO_MIN_MS - (Date.now() - t0);
        if (resto > 0) await new Promise(r => setTimeout(r, resto));
        if (!parar) setSinc({ estado: 'ok', ultima: Date.now(), falhas: 0, desde: null, proxima: 0 });
      } catch {
        setSinc(s => {
          const falhas = s.falhas + 1;
          espera = ESPERAS_OFFLINE[Math.min(falhas - 1, ESPERAS_OFFLINE.length - 1)];
          return { ...s, estado: 'offline', falhas, desde: s.desde || Date.now(), proxima: Date.now() + espera * 1000 };
        });
      }
      if (!parar) timer = setTimeout(ciclo, espera * 1000);
    };
    ciclo();
    const voltou = () => { clearTimeout(timer); ciclo(); };
    window.addEventListener('online', voltou);
    return () => { parar = true; clearTimeout(timer); window.removeEventListener('online', voltou); };
  }, [ativo]);

  const hora = t => new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return {
    estado: sinc.estado,
    info: {
      ultima: hora(sinc.ultima),
      desde: sinc.desde ? hora(sinc.desde).slice(0, 5) : '',
      proxima: Math.max(0, Math.round((sinc.proxima - agora) / 1000)),
      intervalo: INTERVALO_S,
    },
  };
}

export function Selo({ estado, info, oQue = 'O trabalho continua no servidor mesmo assim.' }) {
  const [aberto, setAberto] = useState(false);
  const rotulo = { atualizando: 'Atualizando', ok: 'Tudo certo', offline: 'Sem internet' }[estado];
  return (
    <div className="selo-wrap">
      <button type="button" className={`selo ${estado}`} aria-label={`${rotulo}. Toque para ver detalhes.`} aria-expanded={aberto} onClick={() => setAberto(a => !a)}>
        {estado === 'atualizando' && <svg viewBox="0 0 24 24" className="cobrinha" aria-hidden="true"><circle cx="12" cy="12" r="8" /></svg>}
        {estado === 'ok' && <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 12.5l3.6 3.4 7.6-8.4" /></svg>}
        {estado === 'offline' && <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5c4.5-4 11.5-4 16 0M7 13c2.9-2.4 7.1-2.4 10 0M10.2 16.4c1-.8 2.6-.8 3.6 0M4 4l16 16" /></svg>}
      </button>
      {aberto && (
        <div className="selo-info" role="status">
          <b>{rotulo}</b>
          {estado === 'offline'
            ? <>Sem conexão desde {info.desde}. Tento de novo em {info.proxima} s. {oQue}</>
            : <>Última atualização: {info.ultima}. A tela se atualiza sozinha a cada {info.intervalo} s.</>}
        </div>
      )}
    </div>
  );
}
