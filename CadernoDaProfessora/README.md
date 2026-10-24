# Caderno da Professora

App (PWA) da Professora Catarina — CED Proativo (Escola Pirralho) — para gerir turmas, conteúdos de apostila, aulas, provas e revisões.

- **Mandar apostila:** fotos/prints das páginas → o Claude transcreve fielmente → resumo + "pontos a conferir" (erros da apostila).
- **Nova prova:** escolhe o conteúdo → prova no modelo do Pirralho (lúdica, ~10 questões, 10,0 pontos) + gabarito separado, com conferência automática (soma 10, nenhuma questão entrega outra).
- **Revisões:** 8 fichas por folha ("Responda em seu caderno"), sem nada igual à prova (lista de termos proibidos conferida por código).
- Arquivos saem em `.doc` (RTF), que abre no Word 97–2003.

Regras de criação: `lib/regras.js`. Conferências: `lib/checagens.js`. Gerador de .doc: `lib/rtf.js`.

## Variáveis de ambiente
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

IA: só modelos abertos (open-weight), em faixas gratuitas. O app tenta na ordem abaixo e passa sozinho para o próximo quando um atinge o limite ou falha:
- `MISTRAL_API_KEY` — Mistral Large 3 (Apache 2.0, lê fotos). Chave grátis em console.mistral.ai (plano Free).
- `GEMINI_API_KEY` — Gemma 4 31B e 26B (abertos) pela API do Google. Chave grátis em aistudio.google.com. Bom para ler fotos; prompts muito grandes podem passar do limite por minuto.
- `OPENROUTER_API_KEY` (opcional) — modelos `:free` do OpenRouter (cerca de 50 pedidos por dia).
- Opcionais para trocar modelos: `MODELOS_MISTRAL`, `MODELOS_GEMMA`, `MODELOS_OPENROUTER` (listas separadas por vírgula).

## Acesso
Só e-mails da tabela `membros` enxergam os dados (RLS). Contas são criadas com a função SQL `criar_usuario(email, senha)`.
