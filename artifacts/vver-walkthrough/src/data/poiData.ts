export type POIId =
  | 'rpv'
  | 'steamGenerator'
  | 'polarCrane'
  | 'turboGenerator'
  | 'coreCatcher'
  | 'containmentCutaway';

export interface POIInfo {
  id: POIId;
  viewId: string;
  position: [number, number, number];
  titleEn: string;
  titleRu: string;
  categoryEn: string;
  categoryRu: string;
  specs: { labelEn: string; labelRu: string; value: string }[];
  descriptionEn: string;
  descriptionRu: string;
  color: string;
}

export const POI_LIST: POIInfo[] = [
  {
    id: 'rpv',
    viewId: 'view-reactor-hall',
    position: [-84.1, 14.0, -40.2],
    titleEn: 'Reactor Pressure Vessel (VVER-1000)',
    titleRu: 'Центральный зал и корпус ВВЭР-1000',
    categoryEn: 'Reactor Hall',
    categoryRu: 'Реакторное отделение',
    color: '#94a3b8',
    specs: [
      { labelEn: 'Thermal Power', labelRu: 'Тепловая мощность', value: '3000 MWt' },
      { labelEn: 'Electrical Power', labelRu: 'Электрическая мощность', value: '1000 MWe' },
      { labelEn: 'Primary Pressure', labelRu: 'Давление 1-го контура', value: '15.7 MPa' },
      { labelEn: 'Scale Height', labelRu: 'Высота узла', value: '14.6 м' },
    ],
    descriptionEn:
      'Central VVER-1000 reactor pressure vessel and upper internals inside the concrete containment.',
    descriptionRu:
      'Корпус реактора ВВЭР-1000 и верхний блок в сатинированной нержавеющей стали внутри бетонной защитной оболочки.',
  },
  {
    id: 'steamGenerator',
    viewId: 'view-steam-generators',
    position: [-53.5, 15.6, -40.1],
    titleEn: 'Steam Generators (PGV-1000) & MCPs',
    titleRu: 'Парогенераторы и главные насосы',
    categoryEn: 'Primary Circuit',
    categoryRu: 'Первый контур',
    color: '#38bdf8',
    specs: [
      { labelEn: 'Steam Pressure', labelRu: 'Давление пара', value: '6.3 MPa' },
      { labelEn: 'Steam Output', labelRu: 'Производительность', value: '1470 т/ч' },
      { labelEn: 'Loops Span', labelRu: 'Протяжённость', value: '70.4 м' },
    ],
    descriptionEn:
      'Primary coolant loops, PGV-1000 horizontal steam generators, and main coolant pumps.',
    descriptionRu:
      'Горизонтальные парогенераторы ПГВ-1000, главные циркуляционные насосы и трубопроводы первого контура.',
  },
  {
    id: 'polarCrane',
    viewId: 'view-polar-crane',
    position: [-81.0, 19.5, -40.0],
    titleEn: 'Polar & Bridge Crane',
    titleRu: 'Полярный мостовой кран',
    categoryEn: 'Lifting Equipment',
    categoryRu: 'Грузоподъёмные механизмы',
    color: '#f59e0b',
    specs: [
      { labelEn: 'Main Hoist', labelRu: 'Грузоподъёмность', value: '320 т' },
      { labelEn: 'Elevation', labelRu: 'Отметка рельса', value: '+14.4 .. +23.4 м' },
      { labelEn: 'Rotation', labelRu: 'Поворот', value: '360°' },
    ],
    descriptionEn:
      'Industrial overhead polar crane spanning the reactor hall for refueling and heavy maintenance.',
    descriptionRu:
      'Круговой полярный кран для перегрузки ядерного топлива и обслуживания оборудования реакторного зала.',
  },
  {
    id: 'turboGenerator',
    viewId: 'walk-turbine-hall',
    position: [13.1, 4.0, -41.3],
    titleEn: 'Turbine Hall & K-1000',
    titleRu: 'Турбоагрегат К-1000',
    categoryEn: 'Secondary Circuit',
    categoryRu: 'Машинный зал',
    color: '#cbd5e1',
    specs: [
      { labelEn: 'Rated Output', labelRu: 'Мощность', value: '1000 MWe' },
      { labelEn: 'Train Length', labelRu: 'Длина вала', value: '146.5 м' },
      { labelEn: 'Shaft Speed', labelRu: 'Обороты', value: '1500 об/мин' },
    ],
    descriptionEn:
      'Full-scale multi-cylinder steam turbine and synchronous generator train.',
    descriptionRu:
      'Полноразмерный турбоагрегат К-1000 с цилиндрами высокого и низкого давления в машинном зале.',
  },
  {
    id: 'coreCatcher',
    viewId: 'view-core-catcher',
    position: [-62.4, 2.9, -39.9],
    titleEn: 'Core Catcher & Lower Vault',
    titleRu: 'Шахта УЛР и нижний ярус',
    categoryEn: 'Passive Safety',
    categoryRu: 'Подреакторная зона',
    color: '#eab308',
    specs: [
      { labelEn: 'Elevation', labelRu: 'Отметка', value: '+0.62 .. +5.1 м' },
      { labelEn: 'Cooling', labelRu: 'Охлаждение', value: 'Пассивный залив' },
    ],
    descriptionEn:
      'Sub-reactor equipment vault and lower core catcher localization skid.',
    descriptionRu:
      'Нижний технологический ярус и шахта устройства локализации расплава под корпусом реактора.',
  },
  {
    id: 'containmentCutaway',
    viewId: 'view-cutaway',
    position: [-20.0, 9.5, -40.0],
    titleEn: 'Architectural Cutaway',
    titleRu: 'Горизонтальный разрез',
    categoryEn: 'Section Analysis',
    categoryRu: 'Сечение оболочки',
    color: '#64748b',
    specs: [
      { labelEn: 'Section Plane', labelRu: 'Плоскость', value: 'Горизонтальный срез по Y' },
      { labelEn: 'Core Preserved', labelRu: 'Оборудование', value: 'Без обрезки контура' },
    ],
    descriptionEn:
      'Dynamic horizontal section plane slicing concrete walls and roofs while keeping reactor equipment intact.',
    descriptionRu:
      'Горизонтальный срез бетонных стен и кровли, открывающий доступ к внутреннему оборудованию сборки.',
  },
];

export type ViewMode = 'orbit' | 'walk' | 'drone';

export type FloorGroup = 'primary' | 'zones';

export type FloorTarget = {
  id: string;
  label: string;
  group: FloorGroup;
  floorY: number;
  cameraPos: [number, number, number];
  target?: [number, number, number];
  mode: ViewMode;
};

export const FLOOR_VIEWS: FloorTarget[] = [
  {
    id: 'walk-tour',
    label: 'Прогулка 1:1',
    group: 'primary',
    floorY: 0.40,
    cameraPos: [64, 2.0, -18],
    target: [36, 4.0, -41],
    mode: 'walk',
  },
  {
    id: 'view-aerial',
    label: 'Обзор сборки',
    group: 'primary',
    floorY: 0.40,
    cameraPos: [118, 74, 124],
    target: [-22, 10, -25],
    mode: 'orbit',
  },
  {
    id: 'view-drone',
    label: 'Дрон-облёт',
    group: 'primary',
    floorY: 0.40,
    cameraPos: [-118, 48, 95],
    target: [-30, 12, -25],
    mode: 'drone',
  },
  {
    id: 'view-cutaway',
    label: 'Разрез оболочки',
    group: 'zones',
    floorY: 0.62,
    cameraPos: [-18, 42, 12],
    target: [-52, 8, -40],
    mode: 'orbit',
  },
  {
    id: 'view-reactor-hall',
    label: 'Реактор ВВЭР-1000',
    group: 'zones',
    floorY: 14.41,
    cameraPos: [-62, 27, -20],
    target: [-83.5, 14.8, -40.2],
    mode: 'orbit',
  },
  {
    id: 'view-steam-generators',
    label: 'Парогенераторы и ГЦН',
    group: 'zones',
    floorY: 14.41,
    cameraPos: [-42, 16.01, -38],
    target: [-56, 15.6, -40.1],
    mode: 'walk',
  },
  {
    id: 'view-polar-crane',
    label: 'Полярный кран',
    group: 'zones',
    floorY: 14.41,
    cameraPos: [-60, 29, -56],
    target: [-81, 19.5, -40],
    mode: 'orbit',
  },
  {
    id: 'walk-turbine-hall',
    label: 'Машинный зал',
    group: 'zones',
    floorY: 0.40,
    cameraPos: [0, 2.0, -18],
    target: [0, 3.6, -41],
    mode: 'walk',
  },
  {
    id: 'view-core-catcher',
    label: 'Шахта УЛР',
    group: 'zones',
    floorY: 0.62,
    cameraPos: [-48, 12, -24],
    target: [-62.4, 3.0, -39.9],
    mode: 'orbit',
  },
];

export const ELEVATIONS = FLOOR_VIEWS.map((v) => ({ id: v.id, label: v.label, y: v.floorY }));
