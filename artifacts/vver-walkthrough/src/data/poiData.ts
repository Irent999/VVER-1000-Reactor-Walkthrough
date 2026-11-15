export type POIId =
  | 'rpv'
  | 'steamGenerator'
  | 'polarCrane'
  | 'turboGenerator'
  | 'vverMCR'
  | 'serverRoom'
  | 'containmentCutaway';

export interface POIInfo {
  id: POIId;
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
    position: [-28.0, 5.2, -13.4],
    titleEn: 'Reactor Unit & Core (ВВЭР)',
    titleRu: 'Реакторная установка (РК)',
    categoryEn: 'Reactor Hall · Stainless Steel',
    categoryRu: 'Реакторное отделение',
    color: '#c4ccd4',
    specs: [
      { labelEn: 'Thermal Power', labelRu: 'Тепловая мощность', value: '3000 MWt' },
      { labelEn: 'Electrical Power', labelRu: 'Электрическая мощность', value: '1000 MWe' },
      { labelEn: 'Primary Pressure', labelRu: 'Давление 1-го контура', value: '15.7 MPa' },
      { labelEn: 'Vessel Finish', labelRu: 'Материал корпуса', value: 'Сталь (#c4ccd4)' },
    ],
    descriptionEn:
      'Central reactor pressure vessel assembly in satin stainless steel inside the primary concrete containment.',
    descriptionRu:
      'Центральный корпус реактора ВВЭР с внутрикорпусными узлами и приводами СУЗ в сатинированной нержавеющей стали (#c4ccd4) внутри бетонной защитной оболочки.',
  },
  {
    id: 'steamGenerator',
    position: [-18.0, 5.2, -13.4],
    titleEn: 'Steam Generators & Primary Piping',
    titleRu: 'Парогенераторы и обвязка 1-го контура',
    categoryEn: 'Primary Circuit · Steel & Piping',
    categoryRu: 'Первый контур и трубопроводы',
    color: '#2b5b84',
    specs: [
      { labelEn: 'Steam Pressure', labelRu: 'Давление пара', value: '6.3 MPa' },
      { labelEn: 'Steam Output', labelRu: 'Паропроизводительность', value: '1470 t/h' },
      { labelEn: 'Hull Material', labelRu: 'Корпуса ПГ', value: 'Нержавеющая сталь' },
      { labelEn: 'Piping Palette', labelRu: 'Трубопроводы', value: 'Графит / Синий / Сталь' },
    ],
    descriptionEn:
      'Primary coolant loops, horizontal steam generators, main coolant pumps, and connecting industrial piping.',
    descriptionRu:
      'Горизонтальные парогенераторы в нержавеющей стали, главные циркуляционные насосы и технологические трубопроводы обвязки в графитовых, синих и стальных тонах.',
  },
  {
    id: 'polarCrane',
    position: [-26.5, 6.6, -13.3],
    titleEn: 'Polar & Overhead Bridge Crane',
    titleRu: 'Полярный / мостовой кран',
    categoryEn: 'Lifting Equipment · Safety Yellow',
    categoryRu: 'Грузоподъёмное оборудование',
    color: '#f0a500',
    specs: [
      { labelEn: 'Main Hoist', labelRu: 'Грузоподъёмность', value: '320 t / 32 t' },
      { labelEn: 'Finish Color', labelRu: 'Окраска', value: 'Жёлтый (#f0a500)' },
      { labelEn: 'Rotation', labelRu: 'Поворот', value: '360°' },
    ],
    descriptionEn:
      'Industrial safety yellow overhead/polar bridge crane spanning the reactor hall for refueling and heavy maintenance.',
    descriptionRu:
      'Круговой полярный и мостовой кран в традиционном ярко-промышленном жёлтом цвете (#f0a500) для перегрузки топлива и обслуживания оборудования.',
  },
  {
    id: 'turboGenerator',
    position: [4.3, 2.0, -13.8],
    titleEn: 'Turbine Hall & Turbo-Generator',
    titleRu: 'Машинный зал и турбоагрегат',
    categoryEn: 'Secondary Circuit · Turbine Island',
    categoryRu: 'Второй контур · Машинный зал',
    color: '#9aa3ad',
    specs: [
      { labelEn: 'Rated Output', labelRu: 'Мощность', value: '1000 MWe' },
      { labelEn: 'Shaft Speed', labelRu: 'Частота вращения', value: '1500 rpm' },
      { labelEn: 'Inlet Steam', labelRu: 'Свежий пар', value: '6.0 MPa' },
    ],
    descriptionEn:
      'High-detail multi-cylinder steam turbine and synchronous generator train inside the CAD turbine hall.',
    descriptionRu:
      'Детализированный турбоагрегат в машинном зале сборки assembly.glb с цилиндрами высокого/низкого давления и паропроводами.',
  },
  {
    id: 'vverMCR',
    position: [-18.0, 1.4, 12.0],
    titleEn: 'Main Control Room (БЩУ)',
    titleRu: 'БЩУ (Блочный щит управления)',
    categoryEn: 'Internal Building Room · Control Console',
    categoryRu: 'Интерьер здания сборки · БЩУ',
    color: '#38bdf8',
    specs: [
      { labelEn: 'Placement', labelRu: 'Размещение', value: 'Внутри корпуса сборки' },
      { labelEn: 'Operator Stations', labelRu: 'Пульт управления', value: 'ВИУР + ВИУТ + АЗ-5' },
      { labelEn: 'Display Wall', labelRu: 'Видеостена', value: 'Панорамная мнемосхема' },
    ],
    descriptionEn:
      'Detailed operator console, panoramic reactor display wall, and interactive AZ-5 / RCP controls placed inside the existing control building of assembly.glb.',
    descriptionRu:
      'Интерьер Блочного щита управления (БЩУ), встроенный внутрь существующего корпуса CAD-модели assembly.glb: П-образный пульт, мониторы и панорамная видеостена.',
  },
  {
    id: 'serverRoom',
    position: [-23.3, 1.4, 12.2],
    titleEn: 'I&C Computer & Server Racks (АСУ ТП)',
    titleRu: 'Компьютерные стойки АСУ ТП',
    categoryEn: 'Internal Room · Digital Control Racks',
    categoryRu: 'Интерьер здания · Серверные стойки',
    color: '#34d399',
    specs: [
      { labelEn: 'Cabinets', labelRu: 'Шкафы АСУ ТП', value: '8 × 19" стоек' },
      { labelEn: 'Redundancy', labelRu: 'Резервирование', value: '4 канала безопасности' },
      { labelEn: 'Cabling', labelRu: 'Кабельные трассы', value: 'Ethernet + оптоволокно' },
    ],
    descriptionEn:
      'Rows of 19-inch I&C server cabinets with animated status LEDs and overhead cable trays inside the building.',
    descriptionRu:
      'Ряды 19-дюймовых компьютерных и приборных стоек АСУ ТП со светодиодной индикацией и кабельными лотками внутри помещения БЩУ.',
  },
  {
    id: 'containmentCutaway',
    position: [-16.0, 5.5, -5.0],
    titleEn: 'Architectural Cutaway Mode (Разрез)',
    titleRu: 'Механизм разрезов (Cutaway)',
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
      'Горизонтальный архитектурный разрез бетонной оболочки и кровли, позволяющий заглянуть внутрь залов, осмотреть БЩУ, стойки и компоновку оборудования.',
  },
];

export type ViewMode = 'orbit' | 'walk' | 'drone';

export type FloorGroup = 'overview' | 'vver';

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
    id: 'view-aerial',
    label: '🗺️ Общий вид сборки (Генплан)',
    group: 'overview',
    floorY: 0.14,
    cameraPos: [44, 24, 48],
    target: [-6, 4, -6],
    mode: 'orbit',
  },
  {
    id: 'view-cutaway',
    label: '✂️ Разрез зданий (Изучить внутри)',
    group: 'overview',
    floorY: 0.14,
    cameraPos: [-34, 20, 28],
    target: [-16, 2.0, -2],
    mode: 'orbit',
  },
  {
    id: 'view-drone',
    label: '🛸 Дрон-облёт (Кино-тур)',
    group: 'overview',
    floorY: 0.14,
    cameraPos: [-42, 22, 42],
    target: [-6, 4, -6],
    mode: 'drone',
  },
  {
    id: 'walk-tour',
    label: '🚶 Пеший / VR обход площадки',
    group: 'overview',
    floorY: 0.14,
    cameraPos: [0, 1.74, 34],
    target: [-12, 4.5, -10],
    mode: 'walk',
  },
  {
    id: 'view-reactor-hall',
    label: '⚛️ Реакторный зал и контайнмент',
    group: 'vver',
    floorY: 0.14,
    cameraPos: [-18, 11.5, -3],
    target: [-28, 5.2, -13.4],
    mode: 'orbit',
  },
  {
    id: 'view-polar-crane',
    label: '🏗️ Мостовой / полярный кран',
    group: 'vver',
    floorY: 0.14,
    cameraPos: [-16, 13.0, -19],
    target: [-26, 6.5, -13.4],
    mode: 'orbit',
  },
  {
    id: 'view-turbine-hall',
    label: '⚙️ Машинный зал (Турбоагрегат)',
    group: 'vver',
    floorY: 0.14,
    cameraPos: [18, 8.5, -2],
    target: [4, 2.0, -13.8],
    mode: 'orbit',
  },
  {
    id: 'walk-bshu-interior',
    label: '🖥️ БЩУ и стойки АСУ ТП (Внутри)',
    group: 'vver',
    floorY: 0.14,
    cameraPos: [-18.0, 1.74, 14.3],
    target: [-18.0, 1.45, 10.8],
    mode: 'walk',
  },
];

export const ELEVATIONS = FLOOR_VIEWS.map((v) => ({ id: v.id, label: v.label, y: v.floorY }));
