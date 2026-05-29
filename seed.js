'use strict';

/**
 * RAPIN — Seed de dados iniciais
 *
 * Popula o banco MongoDB com:
 *  - 9 usuários (1 gestor, 2 professores, 6 alunos)
 *  - 6 materiais didáticos com conteúdo, quiz e recursos de acessibilidade
 *
 * A função runSeed() só insere dados se as coleções estiverem vazias.
 * Pode ser chamada diretamente: node seed.js
 */

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');   // ← linha adicionada
require('dotenv').config();

const User     = require('./models/User');
const Material = require('./models/Material');
const Progress = require('./models/Progress');

// ─── Dados: Usuários ──────────────────────────────────────────────────────────
const USERS = [
  // ── Gestor ──
  {
    name:          'Admin Gestor',
    email:         'gestor@edu.com',
    password:      'gestor123',
    role:          'gestor',
    turma:         '',
    subjects:      [],
    special_needs: 'none',
    points:        0,
    level:         1,
    active:        true,
    a11y_prefs:    '',
  },

  // ── Professores ──
  {
    name:          'Prof. Adalberto',
    email:         'adalberto@edu.com',
    password:      'prof123',
    role:          'professor',
    turma:         '',
    subjects:      ['fisica', 'historia'],
    special_needs: 'none',
    points:        0,
    level:         1,
    active:        true,
    a11y_prefs:    '',
  },
  {
    name:          'Prof. Jurismar',
    email:         'jurismar@edu.com',
    password:      'prof123',
    role:          'professor',
    turma:         '',
    subjects:      ['geografia', 'ciencias'],
    special_needs: 'none',
    points:        0,
    level:         1,
    active:        true,
    a11y_prefs:    '',
  },

  // ── Alunos ──
  {
    name:          'Iahn',
    email:         'iahn@edu.com',
    password:      'aluno123',
    role:          'aluno',
    turma:         '1ano',
    subjects:      [],
    special_needs: 'dislexia',
    points:        320,
    level:         2,
    active:        true,
    a11y_prefs:    JSON.stringify({
      fontSize: 18, contrast: 'normal', dyslexiaFont: true,
      lineSpacing: true, narration: false, guidedReading: false,
      special_needs: 'dislexia',
    }),
  },
  {
    name:          'Eloa',
    email:         'eloa@edu.com',
    password:      'aluno123',
    role:          'aluno',
    turma:         '1ano',
    subjects:      [],
    special_needs: 'tdah',
    points:        180,
    level:         1,
    active:        true,
    a11y_prefs:    JSON.stringify({
      fontSize: 16, contrast: 'normal', dyslexiaFont: false,
      lineSpacing: false, narration: true, guidedReading: false,
      special_needs: 'tdah',
    }),
  },
  {
    name:          'Rodrigo',
    email:         'rodrigo@edu.com',
    password:      'aluno123',
    role:          'aluno',
    turma:         '2ano',
    subjects:      [],
    special_needs: 'visual',
    points:        450,
    level:         3,
    active:        true,
    a11y_prefs:    JSON.stringify({
      fontSize: 22, contrast: 'high', dyslexiaFont: false,
      lineSpacing: true, narration: true, guidedReading: false,
      special_needs: 'visual',
    }),
  },
  {
    name:          'Enzo',
    email:         'enzo@edu.com',
    password:      'aluno123',
    role:          'aluno',
    turma:         '2ano',
    subjects:      [],
    special_needs: 'auditiva',
    points:        260,
    level:         2,
    active:        true,
    a11y_prefs:    JSON.stringify({
      fontSize: 16, contrast: 'normal', dyslexiaFont: false,
      lineSpacing: false, narration: false, guidedReading: false,
      special_needs: 'auditiva',
    }),
  },
  {
    name:          'Hellen',
    email:         'hellen@edu.com',
    password:      'aluno123',
    role:          'aluno',
    turma:         '3ano',
    subjects:      [],
    special_needs: 'autismo',
    points:        390,
    level:         2,
    active:        true,
    a11y_prefs:    JSON.stringify({
      fontSize: 16, contrast: 'normal', dyslexiaFont: false,
      lineSpacing: true, narration: false, guidedReading: true,
      special_needs: 'autismo',
    }),
  },
  {
    name:          'Lucas Ferreira',
    email:         'lucas@edu.com',
    password:      'aluno123',
    role:          'aluno',
    turma:         '3ano',
    subjects:      [],
    special_needs: 'motora',
    points:        510,
    level:         3,
    active:        true,
    a11y_prefs:    JSON.stringify({
      fontSize: 18, contrast: 'normal', dyslexiaFont: false,
      lineSpacing: false, narration: false, guidedReading: false,
      special_needs: 'motora',
    }),
  },
];

// ─── Dados: Materiais ─────────────────────────────────────────────────────────
const MATERIALS = [

  // ── Material 1: Frações ───────────────────────────────────────────────────
  {
    title:       'Introdução às Frações',
    subject:     'matematica',
    turma:       '1ano',
    description: 'Aprenda o que são frações, como representá-las e suas aplicações no dia a dia.',
    published:   true,
    tags:        ['frações', 'matemática', 'básico', '1ano'],
    author_name: 'Prof. João Santos',

    content: `<h2>O que são Frações?</h2>
<p>Uma <strong>fração</strong> representa uma parte de um todo. Ela é escrita com dois números separados por uma barra: o <em>numerador</em> (parte) e o <em>denominador</em> (total de partes).</p>
<p>Por exemplo, se você cortar uma pizza em 4 pedaços iguais e comer 1 pedaço, você comeu <strong>1/4</strong> (um quarto) da pizza.</p>
<h3>Partes de uma fração</h3>
<p>O número de <strong>cima</strong> é chamado de <strong>numerador</strong>. O número de <strong>baixo</strong> é chamado de <strong>denominador</strong>.</p>
<p>Exemplo: Na fração <strong>3/5</strong>, o numerador é 3 e o denominador é 5. Isso significa que temos 3 partes de um todo dividido em 5 partes iguais.</p>
<h3>Frações no dia a dia</h3>
<p>As frações estão em toda parte! Quando você come <strong>metade</strong> de um chocolate, você come 1/2. Quando enche <strong>três quartos</strong> de um copo, coloca 3/4 de água.</p>
<p>Reconhecer frações nos ajuda a dividir coisas com justiça e a entender receitas, medidas e muito mais!</p>`,

    simplified_text: `<h2>Frações — Texto Simplificado</h2>
<p>Fração é uma parte de algo inteiro.</p>
<p>Exemplo: se você cortar uma maçã em 2 partes iguais e comer uma parte, você comeu 1/2 (metade).</p>
<p>O número de cima mostra quantas partes você tem. O número de baixo mostra o total de partes.</p>`,

    transcript: `[Transcrição para deficiência auditiva]
Olá! Hoje vamos aprender sobre frações.
Uma fração representa uma parte de um todo.
Por exemplo: se cortarmos uma pizza em quatro pedaços iguais e pegarmos um pedaço, temos um quarto da pizza, que escrevemos como 1 barra 4.
O número de cima chama-se numerador. O número de baixo chama-se denominador.
Frações aparecem no nosso dia a dia: metade de um chocolate é 1 barra 2; três quartos de um copo é 3 barras 4.`,

    audio_desc: 'Imagem mostrando uma pizza dividida em 4 partes iguais, com uma parte destacada em vermelho representando a fração 1/4.',

    quiz: JSON.stringify([
      {
        question: 'Em uma fração, como chamamos o número de cima?',
        options: [{ text: 'Denominador' }, { text: 'Numerador' }, { text: 'Inteiro' }, { text: 'Divisor' }],
        correct: 1,
      },
      {
        question: 'Se uma pizza tem 8 fatias e você come 3, qual fração você comeu?',
        options: [{ text: '8/3' }, { text: '3/8' }, { text: '5/8' }, { text: '1/3' }],
        correct: 1,
      },
      {
        question: 'Na fração 2/5, o denominador é:',
        options: [{ text: '2' }, { text: '7' }, { text: '5' }, { text: '3' }],
        correct: 2,
      },
    ]),
  },

  // ── Material 2: Leitura e Interpretação ──────────────────────────────────
  {
    title:       'Leitura e Interpretação de Textos',
    subject:     'portugues',
    turma:       '1ano',
    description: 'Estratégias para compreender e interpretar diferentes tipos de textos.',
    published:   true,
    tags:        ['leitura', 'interpretação', 'português', '1ano'],
    author_name: 'Prof. Maria Silva',

    content: `<h2>Como Interpretar um Texto?</h2>
<p>Interpretar um texto significa entender a mensagem que o autor quer transmitir. Para isso, precisamos ir além das palavras e pensar sobre o que elas significam juntas.</p>
<h3>Passos para uma boa leitura</h3>
<p><strong>1. Leia com atenção:</strong> Não tenha pressa. Leia pausadamente e, se não entender alguma palavra, procure seu significado.</p>
<p><strong>2. Identifique o assunto principal:</strong> Pergunte a si mesmo: "Sobre o que este texto fala?" O assunto é o tema central da leitura.</p>
<p><strong>3. Encontre a ideia principal:</strong> Cada parágrafo tem uma ideia central. Identifique o que o autor quer dizer em cada parte.</p>
<p><strong>4. Faça conexões:</strong> Relacione o que você leu com experiências que já teve ou com outros textos que conhece.</p>
<h3>Tipos de perguntas</h3>
<p>Perguntas <em>literais</em> têm respostas diretas no texto. Perguntas <em>inferenciais</em> exigem que você use as pistas do texto para chegar a uma conclusão.</p>`,

    simplified_text: `<h2>Como Ler e Entender um Texto</h2>
<p>Para entender um texto, siga estes passos:</p>
<p>1. Leia devagar.</p>
<p>2. Descubra sobre o que o texto fala.</p>
<p>3. Pense no que o autor quis dizer.</p>
<p>Se não entender uma palavra, procure no dicionário!</p>`,

    transcript: `[Transcrição para deficiência auditiva]
Bem-vindos à aula de interpretação de textos!
Para entender um texto, primeiro leia com atenção e sem pressa.
Depois, identifique o assunto principal: sobre o que o texto está falando?
Em seguida, encontre a ideia central de cada parágrafo.
Por fim, conecte o que leu com situações do seu dia a dia.
Existem dois tipos de perguntas: literais, com respostas no próprio texto, e inferenciais, que exigem raciocínio.`,

    audio_desc: 'Ilustração de uma estudante lendo um livro aberto, com setas indicando os passos de leitura: atenção, identificação e interpretação.',

    quiz: JSON.stringify([
      {
        question: 'O que significa "interpretar" um texto?',
        options: [
          { text: 'Copiar o texto palavra por palavra' },
          { text: 'Entender a mensagem que o autor quer transmitir' },
          { text: 'Contar o número de palavras' },
          { text: 'Resumir em apenas uma frase' },
        ],
        correct: 1,
      },
      {
        question: 'Qual é o primeiro passo para uma boa leitura?',
        options: [
          { text: 'Responder as perguntas imediatamente' },
          { text: 'Ler somente o título' },
          { text: 'Ler com atenção e sem pressa' },
          { text: 'Pular os parágrafos difíceis' },
        ],
        correct: 2,
      },
      {
        question: 'Uma pergunta inferencial exige que o leitor:',
        options: [
          { text: 'Encontre a resposta diretamente no texto' },
          { text: 'Use pistas do texto para chegar a uma conclusão' },
          { text: 'Memorize o texto completo' },
          { text: 'Ignore partes do texto' },
        ],
        correct: 1,
      },
    ]),
  },

  // ── Material 3: Sistema Solar ─────────────────────────────────────────────
  {
    title:       'O Sistema Solar',
    subject:     'ciencias',
    turma:       '2ano',
    description: 'Explore os planetas, estrelas e corpos celestes que formam o nosso sistema solar.',
    published:   true,
    tags:        ['sistema solar', 'planetas', 'ciências', '2ano'],
    author_name: 'Prof. João Santos',

    content: `<h2>Nosso Sistema Solar</h2>
<p>O <strong>Sistema Solar</strong> é formado pelo Sol e por todos os corpos celestes que orbitam ao seu redor: planetas, luas, asteroides, cometas e outros objetos.</p>
<h3>O Sol</h3>
<p>O <strong>Sol</strong> é a estrela central do nosso sistema. Ele fornece luz e calor para todos os planetas. Sem o Sol, não haveria vida na Terra.</p>
<h3>Os Planetas</h3>
<p>Existem <strong>8 planetas</strong> no nosso Sistema Solar. Em ordem de distância do Sol:</p>
<p><strong>Mercúrio, Vênus, Terra, Marte</strong> — planetas rochosos e menores.</p>
<p><strong>Júpiter, Saturno, Urano, Netuno</strong> — planetas gasosos e maiores.</p>
<h3>A Terra</h3>
<p>A Terra é o terceiro planeta a partir do Sol e o único onde sabemos que existe vida. Ela tem água líquida, atmosfera com oxigênio e temperatura adequada para os seres vivos.</p>
<h3>Curiosidades</h3>
<p>Júpiter é tão grande que todos os outros planetas cabem dentro dele. Saturno tem anéis feitos de gelo e rocha. Marte é chamado de "planeta vermelho" por causa de sua cor avermelhada.</p>`,

    simplified_text: `<h2>O Sistema Solar — Texto Simplificado</h2>
<p>O Sistema Solar tem o Sol no centro.</p>
<p>8 planetas giram ao redor do Sol.</p>
<p>A Terra é o terceiro planeta. É onde vivemos.</p>
<p>Os planetas em ordem: Mercúrio, Vênus, Terra, Marte, Júpiter, Saturno, Urano e Netuno.</p>`,

    transcript: `[Transcrição para deficiência auditiva]
Olá! Hoje vamos estudar o Sistema Solar.
O Sistema Solar é formado pelo Sol e oito planetas que giram ao seu redor.
O Sol é uma estrela que fornece luz e calor para todos.
Os planetas em ordem do Sol são: Mercúrio, Vênus, Terra, Marte, Júpiter, Saturno, Urano e Netuno.
A Terra é o único planeta onde sabemos que existe vida.
Júpiter é o maior planeta, e Saturno tem lindos anéis de gelo e rocha.`,

    audio_desc: 'Diagrama do Sistema Solar com o Sol ao centro e os oito planetas orbitando ao redor em elipses. Os planetas estão rotulados com seus nomes e mostram suas cores características.',

    quiz: JSON.stringify([
      {
        question: 'Quantos planetas existem no Sistema Solar?',
        options: [{ text: '7' }, { text: '9' }, { text: '8' }, { text: '10' }],
        correct: 2,
      },
      {
        question: 'Qual é o terceiro planeta a partir do Sol?',
        options: [{ text: 'Marte' }, { text: 'Vênus' }, { text: 'Mercúrio' }, { text: 'Terra' }],
        correct: 3,
      },
      {
        question: 'Qual planeta é conhecido como "planeta vermelho"?',
        options: [{ text: 'Júpiter' }, { text: 'Marte' }, { text: 'Saturno' }, { text: 'Vênus' }],
        correct: 1,
      },
    ]),
  },

  // ── Material 4: Independência do Brasil ──────────────────────────────────
  {
    title:       'Independência do Brasil',
    subject:     'historia',
    turma:       '2ano',
    description: 'Conheça os fatos históricos que levaram à independência do Brasil em 1822.',
    published:   true,
    tags:        ['história', 'Brasil', 'independência', '2ano'],
    author_name: 'Prof. Maria Silva',

    content: `<h2>A Independência do Brasil</h2>
<p>No dia <strong>7 de setembro de 1822</strong>, Dom Pedro I proclamou a Independência do Brasil às margens do Rio Ipiranga, em São Paulo. Esse momento marcou o fim do domínio português sobre o território brasileiro.</p>
<h3>Contexto histórico</h3>
<p>O Brasil chegou a 1822 após mais de 300 anos de colonização portuguesa. Com a chegada da família real ao Brasil em 1808, a colônia ganhou maior autonomia. Quando o rei Dom João VI voltou para Portugal em 1821, Dom Pedro ficou como regente do Brasil.</p>
<h3>O Grito do Ipiranga</h3>
<p>Após receber cartas de Portugal exigindo que ele voltasse e diminuindo os poderes do Brasil, Dom Pedro declarou: <em>"Independência ou Morte!"</em>. Esse momento ficou conhecido como o Grito do Ipiranga.</p>
<h3>Consequências</h3>
<p>Com a independência, o Brasil se tornou um Império sob o governo de Dom Pedro I. O país passou a ter sua própria bandeira, constituição e governo independente. Em 1831, Dom Pedro I abdicou em favor de seu filho, Dom Pedro II.</p>`,

    simplified_text: `<h2>Independência do Brasil — Texto Simplificado</h2>
<p>Em 7 de setembro de 1822, o Brasil se tornou independente de Portugal.</p>
<p>Dom Pedro I fez isso acontecer. Ele disse: "Independência ou Morte!"</p>
<p>Esse dia é chamado de Grito do Ipiranga.</p>
<p>Depois da independência, o Brasil virou um Império.</p>`,

    transcript: `[Transcrição para deficiência auditiva]
Olá! Hoje vamos aprender sobre a Independência do Brasil.
No dia 7 de setembro de 1822, Dom Pedro I proclamou a independência do Brasil às margens do Rio Ipiranga.
O Brasil havia sido colônia de Portugal por mais de 300 anos.
Quando Dom João VI voltou para Portugal, Dom Pedro ficou como regente.
Ao receber ordens para voltar a Portugal, Dom Pedro respondeu com o famoso Grito do Ipiranga: Independência ou Morte!
Com a independência, o Brasil se tornou um Império governado por Dom Pedro I.`,

    audio_desc: 'Pintura histórica representando o Grito do Ipiranga, com Dom Pedro I a cavalo levantando a espada, cercado por soldados, às margens do Rio Ipiranga.',

    quiz: JSON.stringify([
      {
        question: 'Em que data foi proclamada a Independência do Brasil?',
        options: [
          { text: '15 de novembro de 1889' },
          { text: '7 de setembro de 1822' },
          { text: '22 de abril de 1500' },
          { text: '7 de setembro de 1810' },
        ],
        correct: 1,
      },
      {
        question: 'O que Dom Pedro I disse no Grito do Ipiranga?',
        options: [
          { text: 'Viva o Brasil!' },
          { text: 'Liberdade, Igualdade e Fraternidade!' },
          { text: 'Independência ou Morte!' },
          { text: 'O Brasil para os brasileiros!' },
        ],
        correct: 2,
      },
      {
        question: 'Como ficou conhecido o Brasil após a Independência?',
        options: [
          { text: 'República Federativa do Brasil' },
          { text: 'Colônia Independente' },
          { text: 'Estado Democrático do Brasil' },
          { text: 'Império do Brasil' },
        ],
        correct: 3,
      },
    ]),
  },

  // ── Material 5: Biomas Brasileiros ───────────────────────────────────────
  {
    title:       'Biomas Brasileiros',
    subject:     'geografia',
    turma:       '3ano',
    description: 'Conheça os principais biomas do Brasil, suas características e importância.',
    published:   true,
    tags:        ['biomas', 'geografia', 'natureza', '3ano'],
    author_name: 'Prof. Maria Silva',

    content: `<h2>Os Biomas do Brasil</h2>
<p>O Brasil possui uma extraordinária diversidade de ecossistemas, sendo o país com maior biodiversidade do planeta. Seus principais <strong>biomas</strong> são: Amazônia, Cerrado, Mata Atlântica, Caatinga, Pampa e Pantanal.</p>
<h3>Amazônia</h3>
<p>A <strong>Amazônia</strong> é a maior floresta tropical do mundo, cobrindo cerca de 49% do território brasileiro. Abriga milhões de espécies de animais e plantas. O Rio Amazonas é o maior do mundo em volume de água.</p>
<h3>Cerrado</h3>
<p>O <strong>Cerrado</strong> é o segundo maior bioma brasileiro, conhecido como "berço das águas" pois abriga as nascentes de importantes rios. Possui vegetação de árvores baixas e tortas, adaptada à seca.</p>
<h3>Mata Atlântica</h3>
<p>A <strong>Mata Atlântica</strong> é um dos biomas mais devastados do Brasil — restam menos de 12% da cobertura original. Está localizada ao longo da costa atlântica e possui altíssima biodiversidade.</p>
<h3>Caatinga</h3>
<p>A <strong>Caatinga</strong> é o único bioma exclusivamente brasileiro. Localizado no Nordeste, é adaptado ao clima semiárido com períodos longos de seca. Abriga espécies únicas como a onça-parda e o preá.</p>
<h3>Pampa e Pantanal</h3>
<p>O <strong>Pampa</strong> fica no Sul e tem campos abertos com muitas espécies de gramíneas. O <strong>Pantanal</strong> é a maior planície alagável do mundo, com enorme riqueza de fauna aquática e terrestre.</p>`,

    simplified_text: `<h2>Biomas Brasileiros — Texto Simplificado</h2>
<p>O Brasil tem 6 biomas principais:</p>
<p><strong>1. Amazônia:</strong> maior floresta tropical do mundo.</p>
<p><strong>2. Cerrado:</strong> tem muitas nascentes de rios.</p>
<p><strong>3. Mata Atlântica:</strong> fica perto do litoral.</p>
<p><strong>4. Caatinga:</strong> região seca do Nordeste, exclusiva do Brasil.</p>
<p><strong>5. Pampa:</strong> campos abertos do Sul.</p>
<p><strong>6. Pantanal:</strong> maior área alagável do mundo.</p>`,

    transcript: `[Transcrição para deficiência auditiva]
Olá! Vamos aprender sobre os biomas brasileiros.
O Brasil tem seis biomas principais.
A Amazônia é a maior floresta tropical do mundo e cobre quase metade do território brasileiro.
O Cerrado é conhecido como berço das águas, pois tem muitas nascentes de rios.
A Mata Atlântica fica no litoral e infelizmente perdeu grande parte da sua vegetação original.
A Caatinga é o único bioma exclusivo do Brasil e fica no Nordeste, onde o clima é seco.
O Pampa fica no Sul com campos abertos.
O Pantanal é a maior planície alagável do mundo, cheio de animais.`,

    audio_desc: 'Mapa do Brasil com os seis biomas coloridos em diferentes tons: Amazônia em verde escuro, Cerrado em verde claro, Mata Atlântica em verde médio, Caatinga em amarelo, Pampa em verde limão e Pantanal em azul claro.',

    quiz: JSON.stringify([
      {
        question: 'Qual é o maior bioma brasileiro?',
        options: [
          { text: 'Cerrado' },
          { text: 'Mata Atlântica' },
          { text: 'Amazônia' },
          { text: 'Caatinga' },
        ],
        correct: 2,
      },
      {
        question: 'Qual bioma é exclusivamente brasileiro?',
        options: [
          { text: 'Pampa' },
          { text: 'Amazônia' },
          { text: 'Pantanal' },
          { text: 'Caatinga' },
        ],
        correct: 3,
      },
      {
        question: 'Como é chamado o Cerrado por abrigar nascentes de rios?',
        options: [
          { text: 'Berço das águas' },
          { text: 'Mãe dos rios' },
          { text: 'Coração verde' },
          { text: 'Terra das fontes' },
        ],
        correct: 0,
      },
    ]),
  },

  // ── Material 6: Present Simple ────────────────────────────────────────────
  {
    title:       'Present Simple — Inglês',
    subject:     'ingles',
    turma:       '3ano',
    description: 'Aprenda a usar o Present Simple em inglês para falar sobre rotinas e fatos.',
    published:   true,
    tags:        ['inglês', 'present simple', 'gramática', '3ano'],
    author_name: 'Prof. Maria Silva',

    content: `<h2>Present Simple (Presente Simples)</h2>
<p>O <strong>Present Simple</strong> é um dos tempos verbais mais usados em inglês. Ele é utilizado para falar sobre <em>rotinas</em>, <em>fatos</em> e <em>situações permanentes</em>.</p>
<h3>Como formar o Present Simple</h3>
<p>Para a maioria dos verbos, usamos o verbo no infinitivo sem alterações:</p>
<p><strong>I work</strong> (eu trabalho) | <strong>You speak</strong> (você fala) | <strong>We study</strong> (nós estudamos)</p>
<p>Para a terceira pessoa do singular (he/she/it), adicionamos <strong>-s</strong> ou <strong>-es</strong> ao verbo:</p>
<p><strong>He works</strong> (ele trabalha) | <strong>She speaks</strong> (ela fala) | <strong>It runs</strong> (ele/ela corre)</p>
<h3>Negativa e Interrogativa</h3>
<p>Para negar, usamos <strong>do not (don't)</strong> ou <strong>does not (doesn't)</strong>:</p>
<p>I <strong>don't</strong> like coffee. | She <strong>doesn't</strong> eat meat.</p>
<p>Para perguntar, invertemos com <strong>Do</strong> ou <strong>Does</strong>:</p>
<p><strong>Do</strong> you study English? | <strong>Does</strong> he play football?</p>
<h3>Exemplos de rotina</h3>
<p>I <em>wake up</em> at 7 am. | She <em>goes</em> to school every day. | We <em>eat</em> lunch at noon.</p>`,

    simplified_text: `<h2>Present Simple — Texto Simplificado</h2>
<p>Use o Present Simple para falar sobre o que você faz todos os dias.</p>
<p>Exemplos: I study. (Eu estudo.) / She reads. (Ela lê.)</p>
<p>Para ele/ela, coloque -s no verbo: work → works / play → plays.</p>
<p>Para negar: I don't work. / She doesn't play.</p>`,

    transcript: `[Transcrição para deficiência auditiva]
Olá! Hoje vamos aprender o Present Simple em inglês.
Usamos o Present Simple para falar sobre rotinas e fatos.
Por exemplo: I study English every day — eu estudo inglês todos os dias.
Para ele e ela, adicionamos S ao verbo: She studies — ela estuda.
Para negar, usamos don't ou doesn't: I don't like coffee — eu não gosto de café.
Para perguntar, usamos Do ou Does: Do you speak English? — você fala inglês?`,

    audio_desc: 'Quadro com exemplos de Present Simple organizados em três colunas: afirmativa, negativa e interrogativa, com exemplos coloridos para cada pessoa do verbo.',

    quiz: JSON.stringify([
      {
        question: 'Como ficaria o verbo "play" na terceira pessoa (he/she)?',
        options: [{ text: 'playes' }, { text: 'play' }, { text: 'plays' }, { text: 'playing' }],
        correct: 2,
      },
      {
        question: 'Qual auxiliar usamos para negar na terceira pessoa?',
        options: [{ text: "don't" }, { text: "am not" }, { text: "isn't" }, { text: "doesn't" }],
        correct: 3,
      },
      {
        question: 'Qual frase está correta no Present Simple?',
        options: [
          { text: 'She play tennis.' },
          { text: 'She plays tennis.' },
          { text: 'She playing tennis.' },
          { text: 'She is play tennis.' },
        ],
        correct: 1,
      },
    ]),
  },
];

// ─── Função principal de seed ─────────────────────────────────────────────────
async function runSeed() {
  try {
    const [userCount, materialCount] = await Promise.all([
      User.countDocuments(),
      Material.countDocuments(),
    ]);

    if (userCount > 0 && materialCount > 0) {
      console.log(`Seed ignorado: banco já possui ${userCount} usuário(s) e ${materialCount} material(ais).`);
      return;
    }

    console.log('Iniciando seed do banco de dados...');

    // ── Usuários ──────────────────────────────────────────────────────────
    if (userCount === 0) {
      const usersWithHash = await Promise.all(
        USERS.map(async u => ({
          ...u,
          password: await bcrypt.hash(u.password, 10),
        }))
      );
      const createdUsers = await User.insertMany(usersWithHash);
      console.log(`${createdUsers.length} usuários inseridos (senhas hasheadas com bcrypt).`);
    }

    // ── Materiais ─────────────────────────────────────────────────────────
    if (materialCount === 0) {
      // Buscar o gestor para vincular como autor
      const gestor = await User.findOne({ role: 'gestor' });
      const materialsWithAuthor = MATERIALS.map(m => ({
        ...m,
        author_id: gestor ? gestor._id.toString() : '',
      }));

      const createdMaterials = await Material.insertMany(materialsWithAuthor);
      console.log(`${createdMaterials.length} materiais inseridos.`);
    } else {
      console.log(`Materiais: já existem ${materialCount} no banco — ignorando.`);
    }

    console.log('Seed concluído com sucesso!\n');
    console.log('─── Credenciais de acesso ───────────────────────────────────');
    console.log('  Gestor:     gestor@edu.com      / gestor123');
    console.log('  Professor:  maria@edu.com        / prof123');
    console.log('  Professor:  joao@edu.com         / prof123');
    console.log('  Aluno:      ana@edu.com           / aluno123');
    console.log('  Aluno:      carlos@edu.com        / aluno123');
    console.log('  Aluno:      fernanda@edu.com      / aluno123');
    console.log('  Aluno:      gabriel@edu.com       / aluno123');
    console.log('  Aluno:      isabela@edu.com       / aluno123');
    console.log('  Aluno:      lucas@edu.com         / aluno123');
  } catch (err) {
    console.error('Erro durante o seed:', err.message);
    throw err;
  }
}

// ─── Execução direta: node seed.js ───────────────────────────────────────────
if (require.main === module) {
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/rapin';
  const fixMode = process.argv.includes('--fix-passwords');

  mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 10000 })
    .then(async () => {
      console.log('MongoDB conectado.\n');
      if (fixMode) {
        await fixPlainPasswords();
      } else {
        await runSeed();
      }
      await mongoose.connection.close();
      console.log('\n🔌 Conexão encerrada.');
      process.exit(0);
    })
    .catch(err => {
      console.error('Erro ao conectar ao MongoDB:', err.message);
      process.exit(1);
    });
}

async function fixPlainPasswords() {
  console.log('\nVerificando e corrigindo senhas em texto puro...');
  const users = await User.find({}).lean();
  let fixed = 0;

  for (const user of users) {
    const pwd = user.password;
    if (!pwd || pwd.startsWith('$2')) {
      continue; // já é bcrypt — pular
    }
    const hashed = await bcrypt.hash(pwd, 10);
    await User.updateOne({ _id: user._id }, { $set: { password: hashed } });
    fixed++;
    console.log(`Corrigido: ${user.email}`);
  }

  if (fixed === 0) {
    console.log('Nenhuma senha em texto puro encontrada — tudo OK!');
  } else {
    console.log(`\n${fixed} senha(s) corrigida(s). Login deve funcionar agora.`);
  }
}

module.exports = { runSeed, fixPlainPasswords };
