// Texto do passeio de boas-vindas (primeiro acesso da Catarina).
// Para mudar o que está escrito, é só editar aqui. No título, o que estiver entre *asteriscos* ganha marca-texto.
// `figura` escolhe o desenho (ver components/Ilustracoes.js); `cor` é a cor do marca-texto e da barrinha de progresso.
const SLIDES = [
  {
    id: 'aniversario', cor: 'var(--rosa)', figura: 'presente',
    rotulo: '25 de outubro',
    titulo: 'Feliz aniversário, *mãe*!',
    texto: 'O presente atrasou um pouquinho, mas foi feito com muito carinho: um caderno só seu, para cada dia de aula ficar mais leve.',
    nota: 'com amor, João',
  },
  {
    id: 'caderno', cor: 'var(--amarelo)', figura: 'caderno',
    rotulo: 'Seu presente',
    titulo: 'Este é o seu *Caderno*',
    texto: 'Turmas, apostilas, aulas, provas e revisões, tudo num lugar só. Ele já conhece o jeito do Pirralho: você só diz o que precisa e ele prepara.',
  },
  {
    id: 'apostila', cor: 'var(--pessego)', figura: 'camera',
    rotulo: 'Passo 1',
    titulo: 'Mande as fotos da *apostila*',
    texto: 'Toque em “Mandar apostila”, escolha a turma e a matéria e tire fotos das páginas. O Caderno lê tudo, monta um resumo fiel e marca os erros da apostila.',
  },
  {
    id: 'prova', cor: 'var(--verde)', figura: 'prova',
    rotulo: 'Passo 2',
    titulo: 'Peça uma *nova prova*',
    texto: 'Escolha o conteúdo que cai. Em alguns minutos saem a prova lúdica de 10 questões, o gabarito e as 8 fichas de revisão, prontos para baixar em .doc e abrir no Word.',
  },
  {
    id: 'aulas', cor: 'var(--lilas)', figura: 'calendario',
    rotulo: 'No dia a dia',
    titulo: 'Planeje as *aulas*',
    texto: 'Anote o dia, a turma, o tema e o que vai levar. As próximas aulas aparecem na tela inicial, para você não precisar lembrar de nada.',
  },
  {
    id: 'celular', cor: 'var(--azul)', figura: 'celular',
    rotulo: 'Uma dica',
    titulo: 'Deixe na *tela inicial*',
    texto: 'No celular, abra o menu do navegador e toque em “Adicionar à Tela de Início”. O Caderno vira um app e pode te avisar quando a prova ficar pronta.',
  },
  {
    id: 'inicial', cor: 'var(--verde)', figura: 'broto',
    rotulo: 'Um aviso',
    titulo: 'Ainda está *brotando*',
    texto: 'Esta é uma versão bem inicial: alguma coisa pode falhar ou sair estranha. Quando acontecer, me conta que eu arrumo. Aos poucos o Caderno vai ficando do seu jeito.',
  },
  {
    id: 'pronto', cor: 'var(--amarelo)', figura: 'vamos',
    rotulo: 'Pronto',
    titulo: 'Vamos *começar*?',
    texto: 'Qualquer dúvida é só me chamar no WhatsApp. Se quiser rever este passeio, ele fica guardado em “Mais”.',
    botao: 'Abrir meu caderno',
  },
];
export default SLIDES;
