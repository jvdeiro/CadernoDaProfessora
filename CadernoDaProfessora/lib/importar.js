// Traz para o Caderno o que já foi feito antes do sistema existir:
// os 3 resumos de apostila, as 3 provas A8 e as revisões (arquivos .doc e .pdf em /dados-iniciais).
import fs from 'fs';
import path from 'path';

const DIR = path.join(process.cwd(), 'dados-iniciais');

function dividir(md) {
  const i = md.search(/\n## Anexo/);
  return i < 0 ? [md, ''] : [md.slice(0, i).trim(), md.slice(i).replace(/^\n## Anexo[^\n]*\n/, '').trim()];
}

const LOTE = [
  {
    turma: '4º ano', materia: 'Geografia', md: 'geo4.md',
    titulo: 'Hidrografia, Vegetação, Clima e Meio Ambiente (4º bimestre)',
    descricao: 'Apostila física do 4º bimestre, p. 3–46.',
    topicos: [['Hidrografia do Brasil', 'p. 3–9'], ['Vegetação do Brasil', 'p. 12–17'], ['Clima do Brasil', 'p. 22–26'], ['Meio Ambiente: poluição e problemas ambientais', 'p. 30–37'], ['A importância da preservação do Meio Ambiente', 'p. 42–46']],
    faltando: ['5', '10–11', '18–21', '27–29', '38–41'],
    av: {
      nome: 'A8', data: '2026-11-06',
      resumo: `Prova (10 questões): hidrografia (exorreicos, Parnaíba, perenes, Itaipu, Paraíba do Sul, Laguna Araruama), vegetação (Caatinga, Cerrado, Araucárias, Mangue, matas de várzea, igapó e terra firme), clima (friagem, subtropical, V/F de altitude, semiárido, RJ, equatorial), meio ambiente (reportagem do Tietê, desmatamento, salinização, lixiviação, superpopulação, resíduos, extinção), preservação (4Rs, cores da coleta seletiva).
Revisões (5, formato antigo): R1 Amazonas, 12 regiões, Mata de cocais, bacia hidrográfica, clima, 15%, planalto, Zona Tropical, METANO, TORNEIRA, LED, CHUVA · R2 Platina, Vale, problemas respiratórios, gramíneas, impactos socioambientais, Pampas, 12,6%, Arraial do Cabo, RESTINGA, PANTANAL, LITORAL, TIJUCA · R3 órbita e glaciações, pilhas, doar roupas, mudanças climáticas, corpos hídricos, Angra dos Reis, Paraty, estufa, BURITI, CARNAÚBA, PAINEIRA, PAMPAS · R4 ferro de passar, geladeira, consequências das mudanças climáticas, atividades antrópicas, espécies endêmicas, Itajaí, Paraguai, Doce, LATITUDE, TEMPO, EQUADOR, POLOS · R5 regime pluvial tropical, julho, REEE, acidificação dos oceanos, matéria orgânica, 9%, Baixada Fluminense, estuário, HORTA, CARNE, ÁRVORES, VERDUREIRO.`,
      arquivos: [['Prova A8 de Geografia – 4º ano', 'A8_Geografia_4ano.doc'], ['Gabarito da prova', 'Gabarito_A8_Geografia_4ano.doc'], ['Revisões', 'Revisoes_Geografia_4ano.doc'], ['Gabarito das revisões', 'Gabarito_Revisoes_Geografia_4ano.doc'], ['Mapa: revisões × prova', 'Revisoes_x_Prova_A8_Geografia_4ano.pdf']],
    },
  },
  {
    turma: '5º ano', materia: 'Geografia', md: 'geo5.md',
    titulo: 'Região Sul, Energia e Região Sudeste (escopo da A8)',
    descricao: 'Apostila digital GEO 5 Vol. 2, só p. 62–75, e apostila física do 3º trimestre, p. 3–35.',
    topicos: [['Região Sul', 'dig. p. 62–67'], ['Relevo', 'dig. p. 68'], ['Hidrografia', 'dig. p. 69–71'], ['Clima', 'dig. p. 72'], ['Vegetação', 'dig. p. 72–75'], ['Energia', 'fís. p. 3–5'], ['Região Sul: Economia', 'fís. p. 7–15'], ['Região Sul: Cultura e Turismo', 'fís. p. 18–22'], ['Região Sudeste', 'fís. p. 24–35']],
    faltando: ['fís. 6', '10', '13', '16–17', '20', '23', '27–29', '32–33'],
    av: {
      nome: 'A8', data: null,
      resumo: `Prova (10 questões, lúdica): R/N para solar, petróleo, hidrelétrica, carvão mineral, geotérmica, gás natural · adivinhe (minuano, São Joaquim, chimarrão, rio São Francisco) · monocultura × policultura · dicionário gaúcho (faceiro, bolicho, matear, charlar) · cruzadinha (COXILHAS, CHAPECÓ, ITAIPU, PINHO) · V/F (Sul menor região, açorianos, pecuária intensiva/extensiva, carvão, navegação lacustre) · tipos do Sudeste (caiçara, garimpeiro, peão, boia-fria; sobram operário e barqueiro) · assinale (zona de transição, planaltos/planícies/depressões, Mata Atlântica, 1763) · cartão-postal (Cataratas do Iguaçu) · quadrinhos (AGROINDÚSTRIA, PERENE).
Revisões (5, formato antigo): R1 energia eólica, primeiros habitantes do Sul, agricultura, estâncias, rios caudalosos, 2%, Uruguai, reduções, BIOMASSA, BAGÉ, MARÉS, TROPEIROS · R2 subtropical, Curitiba, festa popular, gramínea, ventos alísios, pradarias, imbuia, guasca, CHURRASCO, CURUPIRA, VIME, RODEIO · R3 xisto betuminoso, rodoviário, Centro-Oeste e Norte, êxodo rural, estuário, segundo lugar, BR-116, Refinaria Verde, MÁRMORE, LAGOSTA, CEDRO, OSTRAS · R4 São Vicente, cidades com mais de 1 milhão, café, falésias, especulação imobiliária, 90%, Urubupungá, Jequitinhonha, MINERADOR, FURNAS, SAMBISTA, CANA · R5 energia atômica, Caxias do Sul, problemas dos migrantes, látex, madeireiros, suínos, Farroupilha, raízes profundas, LEITEIRO, GUARANI, TIJUCA, MILHO.`,
      arquivos: [['Prova A8 de Geografia – 5º ano', 'A8_Geografia_5ano.doc'], ['Gabarito da prova', 'Gabarito_A8_Geografia_5ano.doc'], ['Revisões', 'Revisoes_Geografia_5ano.doc'], ['Gabarito das revisões', 'Gabarito_Revisoes_Geografia_5ano.doc']],
    },
  },
  {
    turma: '4º ano', materia: 'História', md: 'hist4.md',
    titulo: 'Independência, Império, Café, República e Três Poderes (escopo da A8)',
    descricao: 'Apostila digital HIST 4 Vol. 2, p. 62–64, e apostila física do 3º trimestre, p. 3–40.',
    topicos: [['A Independência do Brasil', 'dig. p. 62–64'], ['Brasil Império', 'fís. p. 3–14'], ['O ciclo do café-Imigração', 'fís. p. 16–20'], ['Brasil República', 'fís. p. 30–32'], ['Poder Público e os Três Poderes', 'fís. p. 35–40']],
    faltando: ['fís. 5–6', '8–9', '12–13', '15', '21–29', '33–34'],
    av: {
      nome: 'A8', data: null,
      resumo: `Prova (10 questões, lúdica): pinte (Ipiranga, Dia do Fico, Maria Leopoldina, 2 milhões de libras) · V/F (virou república F, províncias contra a independência V, povo contente F, Confederação do Equador V) · complete com quadro (regentes, revoltas, maioridade, Moderador, revezamento; sobram Paraguai e colônias) · detetive das leis (Eusébio de Queirós, Ventre Livre, Sexagenários, Áurea) · adivinhe quem sou (Deodoro da Fonseca, Montesquieu, Francesco Matarazzo, Francisco de Melo Palheta; sobram Aristóteles e Paulo Bregaro) · consequências do Ciclo do Café · italianos (prato, uva e vinho, por que a imigração diminuiu) · defina (Constituição, outorgada, promulgada) · linha do tempo (1824, 1889, 1891, 1988) · Executivo/Legislativo/Judiciário.
Revisões (8 fichas): Cortes portuguesas, Reino Unido 1815, Cumpra-se, Clube da Resistência, Assembleia Constituinte, aclamação 12 de outubro, Período Joanino, quatro regências, províncias no Período Regencial, parlamentarismo às avessas, Era Mauá, causa da abolição, Igreja/Exército/elite escravocrata, 1887, SP e RJ no café, EUA e Europa, Avenida Paulista, Dia do Café, década de 1870, crise de emprego na Itália, terra de oportunidades, catolicismo, Inconfidência Mineira e Conjuração Baiana, República da Espada, paulistas e mineiros, primeira Constituição republicana, presidencialismo, impeachment, objetivo da divisão dos poderes, direitos da Constituição atual.`,
      arquivos: [['Prova A8 de História – 4º ano', 'A8_Historia_4ano.doc'], ['Gabarito da prova', 'Gabarito_A8_Historia_4ano.doc'], ['Revisões (8 fichas)', 'Revisoes_Historia_4ano.doc'], ['Gabarito das revisões', 'Gabarito_Revisoes_Historia_4ano.doc']],
    },
  },
];

export async function importarHistorico(sb) {
  const { data: ja } = await sb.from('conteudos').select('id').contains('info', { importado: true }).limit(1);
  if (ja?.length) return 'já importado';
  const { data: turmas } = await sb.from('turmas').select('id,nome');
  const { data: materias } = await sb.from('materias').select('id,nome');
  const T = n => turmas.find(t => t.nome === n)?.id;
  const M = n => materias.find(m => m.nome === n)?.id;
  for (const L of LOTE) {
    const [resumo, anexo] = dividir(fs.readFileSync(path.join(DIR, L.md), 'utf8'));
    const turma_id = T(L.turma), materia_id = M(L.materia);
    if (!turma_id || !materia_id) continue;
    const { data: c, error: ce } = await sb.from('conteudos').insert({
      turma_id, materia_id, titulo: L.titulo, descricao: L.descricao, resumo_md: resumo, anexo_erros_md: anexo, status: 'pronto',
      info: { topicos: L.topicos.map(([titulo, paginas]) => ({ titulo, paginas })), paginas_faltando: L.faltando, paginas_fora: [], importado: true },
    }).select('id').single();
    if (ce) throw new Error(ce.message);
    const { data: av, error: ae } = await sb.from('avaliacoes').insert({ turma_id, materia_id, nome: L.av.nome, data: L.av.data, status: 'historico', historico_resumo: L.av.resumo }).select('id').single();
    if (ae) throw new Error(ae.message);
    await sb.from('avaliacao_conteudos').insert({ avaliacao_id: av.id, conteudo_id: c.id });
    for (const [titulo, arq] of L.av.arquivos) {
      if (!fs.existsSync(path.join(DIR, arq))) continue;
      const p = `${av.id}/${arq}`;
      const tipo = arq.endsWith('.pdf') ? 'application/pdf' : 'application/msword';
      const { error: ue } = await sb.storage.from('materiais').upload(p, fs.readFileSync(path.join(DIR, arq)), { contentType: tipo, upsert: true });
      if (ue) throw new Error(ue.message);
      await sb.from('materiais').insert({ turma_id, materia_id, avaliacao_id: av.id, titulo: `${titulo}`, tipo: arq.split('.').pop(), storage_path: p });
    }
  }
  return 'ok';
}
