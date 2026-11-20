export type AreaId = 'linguagens' | 'humanas' | 'natureza' | 'matematica' | 'redacao';

export type SubjectId =
  | 'matematica'
  | 'fisica'
  | 'quimica'
  | 'biologia'
  | 'historia'
  | 'geografia'
  | 'filosofia'
  | 'sociologia'
  | 'portugues'
  | 'literatura'
  | 'lingua-estrangeira'
  | 'redacao';

export interface Area {
  id: AreaId;
  name: string;
}

export interface Subject {
  id: SubjectId;
  name: string;
  short: string;
  area: AreaId;
  /** Peso base na distribuição semanal (impacto relativo no ENEM). */
  baseWeight: number;
  topics: string[];
}

export const AREAS: Record<AreaId, Area> = {
  linguagens: { id: 'linguagens', name: 'Linguagens' },
  humanas: { id: 'humanas', name: 'Ciências Humanas' },
  natureza: { id: 'natureza', name: 'Ciências da Natureza' },
  matematica: { id: 'matematica', name: 'Matemática' },
  redacao: { id: 'redacao', name: 'Redação' },
};

export const SUBJECTS: Subject[] = [
  {
    id: 'matematica',
    name: 'Matemática',
    short: 'Mat',
    area: 'matematica',
    baseWeight: 1.4,
    topics: [
      'Razão, proporção e regra de três',
      'Porcentagem e matemática financeira',
      'Estatística: média, moda e mediana',
      'Leitura de gráficos e tabelas',
      'Funções do 1º e 2º grau',
      'Geometria plana: áreas e perímetros',
      'Geometria espacial: volumes',
      'Análise combinatória',
      'Probabilidade',
      'Trigonometria no triângulo retângulo',
      'Progressões aritméticas e geométricas',
      'Escalas e grandezas',
    ],
  },
  {
    id: 'fisica',
    name: 'Física',
    short: 'Fís',
    area: 'natureza',
    baseWeight: 1,
    topics: [
      'Cinemática: velocidade e aceleração',
      'Leis de Newton',
      'Trabalho, energia e potência',
      'Hidrostática',
      'Termologia e calorimetria',
      'Ondulatória',
      'Óptica geométrica',
      'Eletrodinâmica: circuitos elétricos',
      'Magnetismo e indução',
      'Energia e consumo elétrico',
    ],
  },
  {
    id: 'quimica',
    name: 'Química',
    short: 'Quí',
    area: 'natureza',
    baseWeight: 1,
    topics: [
      'Modelos atômicos e tabela periódica',
      'Ligações químicas',
      'Funções inorgânicas',
      'Estequiometria',
      'Soluções e concentração',
      'Termoquímica',
      'Cinética química',
      'Equilíbrio químico e pH',
      'Eletroquímica',
      'Funções orgânicas',
      'Química ambiental',
    ],
  },
  {
    id: 'biologia',
    name: 'Biologia',
    short: 'Bio',
    area: 'natureza',
    baseWeight: 1,
    topics: [
      'Ecologia: cadeias e teias alimentares',
      'Ciclos biogeoquímicos',
      'Citologia: a célula',
      'Bioquímica e metabolismo energético',
      'Genética: leis de Mendel',
      'Evolução',
      'Fisiologia humana',
      'Saúde, doenças e vacinas',
      'Botânica',
      'Biotecnologia',
    ],
  },
  {
    id: 'historia',
    name: 'História',
    short: 'His',
    area: 'humanas',
    baseWeight: 1,
    topics: [
      'Brasil Colônia',
      'Brasil Império',
      'Primeira República',
      'Era Vargas',
      'Ditadura militar no Brasil',
      'Redemocratização e Constituição de 1988',
      'Antiguidade clássica',
      'Revoluções Industrial e Francesa',
      'Guerras mundiais',
      'Guerra Fria',
    ],
  },
  {
    id: 'geografia',
    name: 'Geografia',
    short: 'Geo',
    area: 'humanas',
    baseWeight: 1,
    topics: [
      'Cartografia e escalas',
      'Clima e fenômenos atmosféricos',
      'Biomas brasileiros',
      'Questões ambientais',
      'Urbanização',
      'Agropecuária e espaço rural',
      'Industrialização e energia',
      'Globalização',
      'População e migrações',
      'Geopolítica contemporânea',
    ],
  },
  {
    id: 'filosofia',
    name: 'Filosofia',
    short: 'Fil',
    area: 'humanas',
    baseWeight: 0.8,
    topics: [
      'Pré-socráticos e Sócrates',
      'Platão e Aristóteles',
      'Filosofia moderna: razão e empirismo',
      'Ética e moral',
      'Iluminismo e contratualistas',
      'Filosofia política',
      'Existencialismo',
      'Escola de Frankfurt',
    ],
  },
  {
    id: 'sociologia',
    name: 'Sociologia',
    short: 'Soc',
    area: 'humanas',
    baseWeight: 0.8,
    topics: [
      'Clássicos: Durkheim, Weber e Marx',
      'Cultura e identidade',
      'Trabalho e sociedade',
      'Movimentos sociais',
      'Cidadania e direitos humanos',
      'Desigualdade social',
      'Indústria cultural e mídia',
      'Estado, poder e democracia',
    ],
  },
  {
    id: 'portugues',
    name: 'Português',
    short: 'Por',
    area: 'linguagens',
    baseWeight: 1.2,
    topics: [
      'Interpretação de texto',
      'Gêneros textuais',
      'Funções da linguagem',
      'Variação linguística',
      'Coesão e coerência',
      'Figuras de linguagem',
      'Intertextualidade',
      'Semântica e significação',
      'Linguagem não verbal e charges',
    ],
  },
  {
    id: 'literatura',
    name: 'Literatura',
    short: 'Lit',
    area: 'linguagens',
    baseWeight: 0.8,
    topics: [
      'Quinhentismo e Barroco',
      'Arcadismo',
      'Romantismo',
      'Realismo e Naturalismo',
      'Pré-Modernismo',
      'Modernismo: 1ª fase',
      'Modernismo: 2ª e 3ª fases',
      'Literatura contemporânea',
    ],
  },
  {
    id: 'lingua-estrangeira',
    name: 'Língua Estrangeira',
    short: 'LE',
    area: 'linguagens',
    baseWeight: 0.7,
    topics: [
      'Estratégias de leitura',
      'Cognatos e falsos cognatos',
      'Interpretação de textos jornalísticos',
      'Tirinhas, anúncios e letras de música',
      'Conectivos e marcadores do discurso',
      'Vocabulário em contexto',
    ],
  },
  {
    id: 'redacao',
    name: 'Redação',
    short: 'Red',
    area: 'redacao',
    baseWeight: 1.3,
    topics: [
      'Estrutura do texto dissertativo-argumentativo',
      'Competência 1: norma culta',
      'Competência 2: tema e repertório',
      'Competência 3: argumentação',
      'Competência 4: coesão',
      'Competência 5: proposta de intervenção',
      'Temas sociais e repertório',
      'Introdução e conclusão eficientes',
    ],
  },
];

const SUBJECT_MAP = new Map(SUBJECTS.map((s) => [s.id, s]));

export function getSubject(id: SubjectId): Subject {
  const subject = SUBJECT_MAP.get(id);
  if (!subject) throw new Error(`Matéria desconhecida: ${id}`);
  return subject;
}

export function isSubjectId(value: string | null): value is SubjectId {
  return value !== null && SUBJECT_MAP.has(value as SubjectId);
}
