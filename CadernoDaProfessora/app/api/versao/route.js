// Diz qual commit está no ar. Sem isso só dá para adivinhar se uma correção chegou ao servidor.
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
export async function GET() {
  return NextResponse.json({
    commit: (process.env.VERCEL_GIT_COMMIT_SHA || 'local').slice(0, 7),
    mensagem: process.env.VERCEL_GIT_COMMIT_MESSAGE?.split('\n')[0] || null,
    criado: process.env.VERCEL_DEPLOYMENT_ID || null,
    agora: new Date().toISOString(),
  });
}
