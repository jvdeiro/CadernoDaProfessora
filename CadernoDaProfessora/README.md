# Caderno da Professora

App (PWA) da Professora Catarina — CED Proativo (Escola Pirralho) — para gerir turmas, conteúdos de apostila, aulas, provas e revisões.

- **Mandar apostila:** fotos/prints das páginas → o Claude transcreve fielmente → resumo + "pontos a conferir" (erros da apostila).
- **Nova prova:** escolhe o conteúdo → prova no modelo do Pirralho (lúdica, ~10 questões, 10,0 pontos) + gabarito separado, com conferência automática (soma 10, nenhuma questão entrega outra).
- **Revisões:** 8 fichas por folha ("Responda em seu caderno"), sem nada igual à prova (lista de termos proibidos conferida por código).
- Arquivos saem em `.doc` (RTF), que abre no Word 97–2003.

Regras de criação: `lib/regras.js`. Conferências: `lib/checagens.js`. Gerador de .doc: `lib/rtf.js`.

## Variáveis de ambiente
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

IA: só modelos abertos (open-weight), em faixas gratuitas. O app passa sozinho para o próximo quando um atinge o limite ou falha:
- `GEMINI_API_KEY` — Gemma 4 31B e 26B pela API do Google (aistudio.google.com). Usado primeiro para ler as fotos (muitos pedidos por dia, mas limite baixo de tokens por minuto).
- `OPENROUTER_API_KEY` — modelos `:free` do OpenRouter (openrouter.ai; ~50 pedidos/dia sem crédito). Usado primeiro para prova, revisões e resumo: Gemma 4 31B, Nemotron 3 Ultra.
- Opcionais: `MODELOS_GEMMA`, `MODELOS_OPENROUTER`, `MODELOS_OPENROUTER_FOTOS` (listas separadas por vírgula); `MISTRAL_API_KEY` se um dia tiver plano pago.

## Acesso
Só e-mails da tabela `membros` enxergam os dados (RLS). Contas são criadas com a função SQL `criar_usuario(email, senha)`.

## Boas-vindas (primeiro acesso)
Passeio em tela inteira, estilo stories, que apresenta o app. Abre sozinho na tela inicial para a conta que tiver `membros.boas_vindas_pendente = true` (hoje, só a da Catarina) e, ao terminar ou pular, grava `boas_vindas_vista_em`. Depois fica em "Mais → Rever o passeio de boas-vindas" e no link `/boas-vindas`. Para conferir com outra conta sem marcar nada: `/boas-vindas?previa=1`. Textos em `app/boas-vindas/slides.js`; desenhos em `components/Ilustracoes.js`.

Para dar as boas-vindas a outra pessoa: `update membros set boas_vindas_pendente = true where email = '...';`
