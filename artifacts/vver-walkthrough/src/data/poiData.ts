export type POIId =
  | 'rpv'
  | 'steamGenerator'
  | 'polarCrane'
  | 'turboGenerator'
  | 'coreCatcher'
  | 'vverMCR'
  | 'serverRoom'
  | 'deaeratorWing'
  | 'adminComplex'
  | 'coolingZone'
  | 'ritm200n'
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
    titleRu: 'Центральный зал и корпус реактора ВВЭР-1000',
    categoryEn: 'Reactor Hall · Stainless Steel',
    categoryRu: 'Реакторное отделение',
    color: '#c4ccd4',
    specs: [
      { labelEn: 'Thermal Power', labelRu: 'Тепловая мощность', value: '3000 MWt' },
      { labelEn: 'Electrical Power', labelRu: 'Электрическая мощность', value: '1000 MWe' },
      { labelEn: 'Primary Pressure', labelRu: 'Давление 1-го контура', value: '15.7 MPa' },
      { labelEn: 'Scale Height', labelRu: 'Высота узла (1:1)', value: '14.6 м' },
    ],
    descriptionEn:
      'Central VVER-1000 reactor pressure vessel and CRDM upper internals in satin stainless steel inside the primary containment shaft.',
    descriptionRu:
      'Центральный корпус реактора ВВЭР-1000 с верхним блоком и приводами СУЗ в сатинированной нержавеющей стали (#c4ccd4) внутри бетонной защитной оболочки (масштаб 1:1).',
  },
  {
    id: 'steamGenerator',
    viewId: 'view-steam-generators',
    position: [-53.5, 15.6, -40.1],
    titleEn: 'Steam Generators (PGV-1000) & MCPs',
    titleRu: 'Парогенераторы (ПГВ-1000) и ГЦН',
    categoryEn: 'Primary Circuit · Steel & Piping',
    categoryRu: 'Первый контур и петли',
    color: '#2b5b84',
    specs: [
      { labelEn: 'Steam Pressure', labelRu: 'Давление пара', value: '6.3 MPa' },
      { labelEn: 'Steam Output', labelRu: 'Паропроизводительность', value: '1470 t/h' },
      { labelEn: 'Hull Material', labelRu: 'Корпуса ПГ', value: 'Нержавеющая сталь' },
      { labelEn: 'Loops Span', labelRu: 'Протяжённость петель', value: '70.4 м' },
    ],
    descriptionEn:
      'Four primary coolant loops, horizontal PGV-1000 steam generators, and main coolant pumps connecting the reactor hall and turbine piping.',
    descriptionRu:
      'Горизонтальные парогенераторы ПГВ-1000 в нержавеющей стали, главные циркуляционные насосы ГЦЭН-195 и технологические трубопроводы обвязки.',
  },
  {
    id: 'polarCrane',
    viewId: 'view-polar-crane',
    position: [-81.0, 19.5, -40.0],
    titleEn: 'Polar & Overhead Bridge Crane',
    titleRu: 'Эстакада полярного крана',
    categoryEn: 'Lifting Equipment · Safety Yellow',
    categoryRu: 'Грузоподъёмное оборудование',
    color: '#f0a500',
    specs: [
      { labelEn: 'Main Hoist', labelRu: 'Грузоподъёмность', value: '320 т / 32 т' },
      { labelEn: 'Elevation', labelRu: 'Отметка рельса', value: '+14.4 .. +23.4 м' },
      { labelEn: 'Rotation', labelRu: 'Угол поворота', value: '360°' },
    ],
    descriptionEn:
      'Industrial safety yellow polar bridge crane spanning the reactor hall for refueling and heavy maintenance.',
    descriptionRu:
      'Круговой полярный и мостовой кран в промышленном жёлтом цвете (#f0a500) на подкрановой эстакаде для перегрузки топлива и обслуживания корпуса реактора.',
  },
  {
    id: 'turboGenerator',
    viewId: 'walk-turbine-hall',
    position: [13.1, 4.0, -41.3],
    titleEn: 'Turbine Hall & K-1000 Turbo-Generator',
    titleRu: 'Машинный зал с турбоагрегатом К-1000',
    categoryEn: 'Secondary Circuit · Turbine Island',
    categoryRu: 'Второй контур · Машинный зал',
    color: '#9aa3ad',
    specs: [
      { labelEn: 'Rated Output', labelRu: 'Мощность', value: '1000 MWe' },
      { labelEn: 'Train Length', labelRu: 'Длина валопровода', value: '146.5 м' },
      { labelEn: 'Shaft Speed', labelRu: 'Частота вращения', value: '1500 об/мин' },
    ],
    descriptionEn:
      'Full-scale multi-cylinder steam turbine and synchronous generator train inside the main machine hall.',
    descriptionRu:
      'Полноразмерный турбоагрегат К-1000-60/1500 длиной 146.5 м с цилиндрами высокого и низкого давления в машинном зале assembly.glb.',
  },
  {
    id: 'coreCatcher',
    viewId: 'view-core-catcher',
    position: [-62.4, 2.9, -39.9],
    titleEn: 'Core Catcher Shaft & Lower Skid',
    titleRu: 'Шахта УЛР и нижний ярус реактора',
    categoryEn: 'Passive Safety · Sub-Reactor Zone',
    categoryRu: 'Пассивная безопасность',
    color: '#e2a34f',
    specs: [
      { labelEn: 'Elevation', labelRu: 'Отметка яруса', value: '+0.62 .. +5.1 м' },
      { labelEn: 'Passive Cooling', labelRu: 'Охлаждение', value: 'Контур залива' },
      { labelEn: 'Materials', labelRu: 'Защита', value: 'Жаропрочная сталь' },
    ],
    descriptionEn:
      'Sub-reactor equipment vault and lower core catcher localization skid beneath the primary reactor foundation.',
    descriptionRu:
      'Нижний технологический ярус шахты устройства локализации расплава (УЛР) и подреакторного оборудования.',
  },
  {
    id: 'vverMCR',
    viewId: 'walk-bshu-interior',
    position: [36.15, 2.0, -73.5],
    titleEn: 'Main Control Room (БЩУ)',
    titleRu: 'БЩУ (Блочный щит управления)',
    categoryEn: 'Internal Building Room · Control Console',
    categoryRu: 'Интерьер здания · БЩУ',
    color: '#38bdf8',
    specs: [
      { labelEn: 'Placement', labelRu: 'Размещение', value: 'Восточный корпус (1:1)' },
      { labelEn: 'Operator Stations', labelRu: 'Пульт управления', value: 'ВИУР + ВИУТ + АЗ-5' },
      { labelEn: 'Display Wall', labelRu: 'Видеостена', value: 'Панорамная мнемосхема' },
    ],
    descriptionEn:
      'Human-scale Main Control Room with interactive AZ-5 / RCP controls and live telemetry placed inside the enclosed East Wing room of assembly.glb.',
    descriptionRu:
      'Интерьер Блочного щита управления (БЩУ) в натуральную величину 1:1 внутри закрытого зала восточного крыла assembly.glb: П-образный пульт, мониторы и видеостена.',
  },
  {
    id: 'serverRoom',
    viewId: 'walk-server-room',
    position: [33.5, 2.0, -73.5],
    titleEn: 'I&C Server Room & Basement (АСУ ТП)',
    titleRu: 'Подвал / Серверная АСУ ТП',
    categoryEn: 'Internal Room · Digital Control Racks',
    categoryRu: 'Интерьер здания · Серверные стойки',
    color: '#34d399',
    specs: [
      { labelEn: 'Cabinets', labelRu: 'Шкафы АСУ ТП', value: '8 × 19" стоек' },
      { labelEn: 'Redundancy', labelRu: 'Резервирование', value: '4 канала безопасности' },
      { labelEn: 'Cabling', labelRu: 'Кабельные трассы', value: 'Ethernet + оптоволокно' },
    ],
    descriptionEn:
      'Rows of 19-inch I&C server cabinets with animated status LEDs and overhead cable trays inside the East Wing hall.',
    descriptionRu:
      'Ряды 19-дюймовых компьютерных и приборных стоек АСУ ТП со светодиодной индикацией и верхними кабельными лотками.',
  },
  {
    id: 'deaeratorWing',
    viewId: 'walk-deaerator',
    position: [-48.0, 8.0, -62.0],
    titleEn: 'Auxiliary & Deaerator Building',
    titleRu: 'Деаэраторная и вспомогательный корпус',
    categoryEn: 'North Complex · Feedwater & Auxiliaries',
    categoryRu: 'Северное крыло · Вспомогательные системы',
    color: '#8ec8ff',
    specs: [
      { labelEn: 'Height', labelRu: 'Высота корпуса', value: '34.8 м' },
      { labelEn: 'Systems', labelRu: 'Системы', value: 'Деаэраторы, ПН, СВО' },
      { labelEn: 'Structure', labelRu: 'Конструктив', value: 'Монолитный ж/б каркас' },
    ],
    descriptionEn:
      'North auxiliary and deaerator gallery housing feedwater heaters, chemical purification, and steam-piping bridges.',
    descriptionRu:
      'Северный вспомогательный корпус и деаэраторная этажерка между реакторным отделением и машзалом.',
  },
  {
    id: 'adminComplex',
    viewId: 'walk-admin-complex',
    position: [-55.0, 12.0, 40.0],
    titleEn: 'Administrative & Engineering Complex',
    titleRu: 'Административно-инженерный комплекс',
    categoryEn: 'South Wing · Operations & Staff',
    categoryRu: 'Южное крыло · АБК и санпропускник',
    color: '#b2bac2',
    specs: [
      { labelEn: 'Footprint', labelRu: 'Габариты крыла', value: '85 × 120 м' },
      { labelEn: 'Elevation', labelRu: 'Высота', value: 'до 35.0 м' },
      { labelEn: 'Facilities', labelRu: 'Помещения', value: 'АБК, УТЦ, лаборатории' },
    ],
    descriptionEn:
      'South administrative, sanitary lock, and engineering support complex on the main plant terrace.',
    descriptionRu:
      'Южный административно-бытовой и учебно-инженерный комплекс энергоблока на основной площадке АЭС.',
  },
  {
    id: 'coolingZone',
    viewId: 'walk-cooling-zone',
    position: [50.0, 9.5, -42.0],
    titleEn: 'Cooling Water & Switchyard Bay',
    titleRu: 'Градирни и контур охлаждения / ОРУ',
    categoryEn: 'East Perimeter · Condenser Cooling',
    categoryRu: 'Восточный периметр · Охлаждение и ОРУ',
    color: '#62d1a2',
    specs: [
      { labelEn: 'Cooling Flow', labelRu: 'Расход цирк. воды', value: '185 000 м³/ч' },
      { labelEn: 'Output Grid', labelRu: 'Выдача мощности', value: 'ОРУ 500 кВ' },
      { labelEn: 'Turbine Interface', labelRu: 'Сопряжение', value: 'Восточный торец К-1000' },
    ],
    descriptionEn:
      'East perimeter circulation water cooling zone, generator busducts, and transformer bay adjacent to the turbine hall.',
    descriptionRu:
      'Восточный сектор циркуляционного водоснабжения конденсаторов турбины, градирен и выдачи электрической мощности.',
  },
  {
    id: 'ritm200n',
    viewId: 'walk-ritm200n',
    position: [-65.0, 10.0, 36.0],
    titleEn: 'SMR Compact Block Wing (РИТМ-200Н)',
    titleRu: 'Энергоблок АСММ РИТМ-200Н (Модульный блок)',
    categoryEn: 'Small Modular Reactor · Integral Unit',
    categoryRu: 'Малый модульный энергоблок',
    color: '#60a5fa',
    specs: [
      { labelEn: 'Thermal Power', labelRu: 'Тепловая мощность', value: '190 MWt' },
      { labelEn: 'Electric Output', labelRu: 'Электр. мощность', value: '55 MWe' },
      { labelEn: 'Layout', labelRu: 'Компоновка', value: 'Интегральный моноблок' },
    ],
    descriptionEn:
      'Dedicated compact modular annex wing dedicated to SMR RITM-200N integration and auxiliary steam supply.',
    descriptionRu:
      'Компактный модульный энергоблок малой мощности (АСММ) на базе интегральной установки РИТМ-200Н в юго-западном секторе площадки.',
  },
  {
    id: 'containmentCutaway',
    viewId: 'view-cutaway',
    position: [36.15, 9.5, -73.5],
    titleEn: 'Architectural Cutaway Mode (Разрез)',
    titleRu: 'Разрез оболочки и корпусов (Cutaway)',
    categoryEn: 'Section Analysis · Concrete Envelope',
    categoryRu: 'Послойный срез конструкций',
    color: '#9aa3ad',
    specs: [
      { labelEn: 'Concrete Color', labelRu: 'Цвет бетона', value: 'Матовый серый (#9aa3ad)' },
      { labelEn: 'Section Plane', labelRu: 'Плоскость среза', value: 'Горизонтальный срез по Y' },
      { labelEn: 'Preserved Core', labelRu: 'Оборудование', value: 'Не обрезается при срезе' },
    ],
    descriptionEn:
      'Dynamic horizontal section plane slicing concrete walls and roofs while keeping reactor vessels, cranes, piping, and control room interiors intact.',
    descriptionRu:
      'Горизонтальный архитектурный разрез бетонной оболочки и кровли, позволяющий осмотреть внутреннюю компоновку БЩУ, стоек АСУ ТП, машзала и реактора.',
  },
];

export type ViewMode = 'orbit' | 'walk' | 'drone';

export type FloorGroup = 'overview' | 'vver' | 'infra';

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
  // 1. Общий обзор, обход 1:1 и туры
  {
    id: 'walk-tour',
    label: '🚶 Площадка у оборудования (Старт 1:1)',
    group: 'overview',
    floorY: 0.40,
    cameraPos: [64, 2.0, -18],
    target: [36, 4.0, -41],
    mode: 'walk',
  },
  {
    id: 'view-aerial',
    label: '🗺️ Генплан АЭС (Общий обзор)',
    group: 'overview',
    floorY: 0.40,
    cameraPos: [118, 74, 124],
    target: [-22, 10, -25],
    mode: 'orbit',
  },
  {
    id: 'view-drone',
    label: '🛸 Дрон-облёт (Кино-тур по периметру)',
    group: 'overview',
    floorY: 0.40,
    cameraPos: [-118, 48, 95],
    target: [-30, 12, -25],
    mode: 'drone',
  },
  {
    id: 'view-cutaway',
    label: '✂️ Разрез оболочки и цехов (Внутри)',
    group: 'overview',
    floorY: 0.62,
    cameraPos: [68, 42, -8],
    target: [28, 6, -68],
    mode: 'orbit',
  },

  // 2. Энергоблок ВВЭР-1000 и основные цеха
  {
    id: 'view-vver-block',
    label: '🏛️ Энергоблок ВВЭР-1000 (Внешний контур)',
    group: 'vver',
    floorY: 0.40,
    cameraPos: [-122, 30, -2],
    target: [-74, 16, -40],
    mode: 'orbit',
  },
  {
    id: 'view-reactor-hall',
    label: '⚛️ Центральный зал реактора (ВВЭР-1000)',
    group: 'vver',
    floorY: 14.41,
    cameraPos: [-62, 27, -20],
    target: [-83.5, 14.8, -40.2],
    mode: 'orbit',
  },
  {
    id: 'view-steam-generators',
    label: '🔥 Парогенераторы (ПГВ-1000) и ГЦН',
    group: 'vver',
    floorY: 14.41,
    cameraPos: [-42, 16.01, -38],
    target: [-56, 15.6, -40.1],
    mode: 'walk',
  },
  {
    id: 'view-polar-crane',
    label: '🏗️ Эстакада полярного крана',
    group: 'vver',
    floorY: 14.41,
    cameraPos: [-60, 29, -56],
    target: [-81, 19.5, -40],
    mode: 'orbit',
  },
  {
    id: 'walk-turbine-hall',
    label: '⚙️ Машинный зал с турбоагрегатом К-1000',
    group: 'vver',
    floorY: 0.40,
    cameraPos: [0, 2.0, -18],
    target: [0, 3.6, -41],
    mode: 'walk',
  },
  {
    id: 'view-core-catcher',
    label: '🛡️ Шахта УЛР и нижний технологический ярус',
    group: 'vver',
    floorY: 0.62,
    cameraPos: [-48, 12, -24],
    target: [-62.4, 3.0, -39.9],
    mode: 'orbit',
  },

  // 3. БЩУ, АСУ ТП и инфраструктура станции
  {
    id: 'walk-bshu-interior',
    label: '🖥️ БЩУ (Блочный щит управления — внутри)',
    group: 'infra',
    floorY: 0.62,
    cameraPos: [36.15, 2.22, -67.8],
    target: [36.15, 1.9, -76.5],
    mode: 'walk',
  },
  {
    id: 'walk-server-room',
    label: '🗄️ Подвал / Серверная АСУ ТП и стойки',
    group: 'infra',
    floorY: 0.62,
    cameraPos: [36.15, 2.22, -71.5],
    target: [33.5, 1.85, -73.5],
    mode: 'walk',
  },
  {
    id: 'walk-deaerator',
    label: '🏭 Деаэраторная и вспомогательный корпус',
    group: 'infra',
    floorY: 0.40,
    cameraPos: [-48, 2.0, -100],
    target: [-48, 12, -62],
    mode: 'walk',
  },
  {
    id: 'walk-admin-complex',
    label: '🏢 Административно-инженерный комплекс',
    group: 'infra',
    floorY: 0.40,
    cameraPos: [-55, 2.0, 92],
    target: [-55, 12, 40],
    mode: 'walk',
  },
  {
    id: 'walk-cooling-zone',
    label: '🌊 Градирни и циркуляционный контур',
    group: 'infra',
    floorY: 0.40,
    cameraPos: [85, 2.0, -68],
    target: [50, 9.5, -42],
    mode: 'walk',
  },
  {
    id: 'walk-ritm200n',
    label: '⚡ Модульный блок АСММ РИТМ-200Н',
    group: 'infra',
    floorY: 0.40,
    cameraPos: [-105, 2.0, 36],
    target: [-65, 10, 36],
    mode: 'walk',
  },
];

export const ELEVATIONS = FLOOR_VIEWS.map((v) => ({ id: v.id, label: v.label, y: v.floorY }));
