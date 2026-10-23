# Caderno da Professora

App (PWA) da Professora Catarina — CED Proativo (Escola Pirralho) — para gerir turmas, conteúdos de apostila, aulas, provas e revisões.

- **Mandar apostila:** fotos/prints das páginas → o Claude transcreve fielmente → resumo + "pontos a conferir" (erros da apostila).
- **Nova prova:** escolhe o conteúdo → prova no modelo do Pirralho (lúdica, ~10 questões, 10,0 pontos) + gabarito separado, com conferência automática (soma 10, nenhuma questão entrega outra).
- **Revisões:** 8 fichas por folha ("Responda em seu caderno"), sem nada igual à prova (lista de termos proibidos conferida por código).
- Arquivos saem em `.doc` (RTF), que abre no Word 97–2003.

Regras de criação: `lib/regras.js`. Conferências: `lib/checagens.js`. Gerador de .doc: `lib/rtf.js`.

## Variáveis de ambiente
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `GEMINI_API_KEY` — chave gratuita do Google AI Studio (usada quando existe)
- ou `ANTHROPIC_API_KEY` — Claude pela API (pago por uso), usado quando não há chave do Gemini
- Opcionais: `MODELO_PRINCIPAL` (padrão `gemini-3.8-flash` / `claude-opus-5-5`), `MODELO_RAPIDO` (padrão `gemini-3.5-flash-lite` / `claude-sonnet-5-5`)

## Acesso
Só e-mails da tabela `membros` enxergam os dados (RLS). Contas são criadas com a função SQL `criar_usuario(email, senha)`.
