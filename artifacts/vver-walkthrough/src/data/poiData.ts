export type POIId =
  | 'rpv'
  | 'steamGenerator'
  | 'polarCrane'
  | 'turboGenerator'
  | 'ritm200n'
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
    position: [-27.6, 5.1, -72.75],
    titleEn: 'Turbine Hall & K-1000',
    titleRu: 'Турбоагрегат К-1000',
    categoryEn: 'Secondary Circuit',
    categoryRu: 'Машинный зал',
    color: '#cbd5e1',
    specs: [
      { labelEn: 'Rated Output', labelRu: 'Мощность', value: '1000 MWe' },
      { labelEn: 'Configuration', labelRu: 'Компоновка', value: 'ЦВД + 3×ЦНД + ТВВ' },
      { labelEn: 'Shaft Speed', labelRu: 'Обороты', value: '1500 об/мин' },
    ],
    descriptionEn:
      'Full-scale K-1000 multi-cylinder steam turbine, condensers, and synchronous generator train.',
    descriptionRu:
      'Полноразмерный турбоагрегат К-1000 (ЦВД, 3 ЦНД, конденсаторы, валопровод и турбогенератор ТВВ-1000) вдоль оси машинного зала.',
  },
  {
    id: 'ritm200n',
    viewId: 'walk-ritm-200n',
    position: [35.5, 7.5, -70.9],
    titleEn: 'RITM-200N Small Modular Reactor Complex',
    titleRu: 'Комплекс РИТМ-200Н',
    categoryEn: 'SMR Block',
    categoryRu: 'Энергоблок АСММ',
    color: '#38bdf8',
    specs: [
      { labelEn: 'Thermal Power', labelRu: 'Тепловая мощность', value: '190 MWt' },
      { labelEn: 'Electrical Power', labelRu: 'Электрическая мощность', value: '55 MWe' },
      { labelEn: 'Layout', labelRu: 'Компоновка', value: 'Интегральный реактор + ТГ' },
    ],
    descriptionEn:
      'Integral RITM-200N reactor vessel with vertical CRDM drives and adjacent compact turbine-generator set inside the dedicated SMR hall.',
    descriptionRu:
      'Интегральный корпус реактора РИТМ-200Н с приводами СУЗ и компактный турбоагрегат вдоль продольной оси корпуса АСММ.',
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

export type FloorGroup = 'primary' | 'walk' | 'zones';

export type FloorTarget = {
  id: string;
  label: string;
  shortLabel?: string;
  group: FloorGroup;
  floorY: number;
  cameraPos: [number, number, number];
  target?: [number, number, number];
  mode: ViewMode;
};

export const FLOOR_VIEWS: FloorTarget[] = [
  {
    id: 'walk-tour',
    label: 'Площадка АЭС (улица)',
    shortLabel: 'Площадка АЭС',
    group: 'walk',
    floorY: 0.40,
    cameraPos: [-32, 2.05, -18],
    target: [-60, 8.0, -40],
    mode: 'walk',
  },
  {
    id: 'walk-ritm-200n',
    label: 'Комплекс РИТМ-200Н (зал)',
    shortLabel: 'Зал РИТМ-200Н',
    group: 'walk',
    floorY: 0.62,
    cameraPos: [35.5, 2.27, -87.5],
    target: [35.0, 4.6, -69.0],
    mode: 'walk',
  },
  {
    id: 'walk-reactor-hall',
    label: 'Центральный зал ВВЭР-1000',
    shortLabel: 'Центральный зал',
    group: 'walk',
    floorY: 14.41,
    cameraPos: [-76.8, 16.06, -40.0],
    target: [-84.1, 15.8, -40.2],
    mode: 'walk',
  },
  {
    id: 'walk-turbine-hall',
    label: 'Машинный зал (турбоагрегат)',
    shortLabel: 'Машинный зал',
    group: 'walk',
    floorY: 0.62,
    cameraPos: [-22.4, 2.27, -58.5],
    target: [-27.6, 4.2, -72.8],
    mode: 'walk',
  },
  {
    id: 'walk-polar-crane',
    label: 'Эстакада полярного крана',
    shortLabel: 'Эстакада крана',
    group: 'walk',
    floorY: 19.71,
    cameraPos: [-80.8, 21.36, -44.2],
    target: [-83.2, 19.2, -39.5],
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
    label: 'Разрез оболочки и машзала',
    group: 'zones',
    floorY: 0.62,
    cameraPos: [-18, 54, -122],
    target: [-20, 7, -68],
    mode: 'orbit',
  },
  {
    id: 'view-ritm-200n',
    label: 'Комплекс РИТМ-200Н (разрез)',
    group: 'zones',
    floorY: 0.62,
    cameraPos: [10, 32, -112],
    target: [35.5, 5.5, -70.9],
    mode: 'orbit',
  },
  {
    id: 'view-reactor-hall',
    label: 'Реактор ВВЭР-1000 (3D)',
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
    cameraPos: [-42, 22, -20],
    target: [-56, 15.6, -40.1],
    mode: 'orbit',
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
