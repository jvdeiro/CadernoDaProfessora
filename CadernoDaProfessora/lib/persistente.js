// Chama uma rota de IA e, se nenhuma IA gratuita estiver livre agora (503 + esperar), espera e tenta de novo
// até conseguir. Só desiste em erro de verdade (foto ilegível, conteúdo faltando etc.).
const ESPERAS = [20, 40, 60, 90, 120];

export async function postPersistente(url, body, { aoEsperar, maxTentativas = 20 } = {}) {
  for (let tentativa = 0; ; tentativa++) {
    let r, j = {};
    try {
      r = await fetch(url, { method: 'POST', ...(body ? { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {}) });
      try { j = await r.json(); } catch {}
    } catch { r = null; } // sem internet ou o servidor caiu no meio: tenta de novo também
    if (r?.ok) { aoEsperar?.(0); return j; }
    const temporario = !r || j.esperar || [502, 503, 504].includes(r.status);
    if (!temporario || tentativa + 1 >= maxTentativas) { aoEsperar?.(0); throw new Error(j.erro || 'Algo deu errado. Tente de novo.'); }
    const seg = ESPERAS[Math.min(tentativa, ESPERAS.length - 1)];
    for (let s = seg; s > 0; s--) { aoEsperar?.(s); await new Promise(res => setTimeout(res, 1000)); }
  }
}
