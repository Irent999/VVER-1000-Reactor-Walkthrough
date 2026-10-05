export type POIId = 'rpv' | 'steamGenerator' | 'polarCrane' | 'serverRoom';

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
    position: [0, 13, 0],
    titleEn: 'Reactor Pressure Vessel (RPV)',
    titleRu: 'Корпус реактора (РК)',
    categoryEn: 'Reactor Core',
    categoryRu: 'Активная зона',
    color: '#ff6b35',
    specs: [
      { labelEn: 'Thermal Power', labelRu: 'Тепловая мощность', value: '3000 MWt' },
      { labelEn: 'Electrical Power', labelRu: 'Электрическая мощность', value: '1000 MWe' },
      { labelEn: 'Coolant Inlet Temp', labelRu: 'Температура на входе', value: '291 °C' },
      { labelEn: 'Coolant Outlet Temp', labelRu: 'Температура на выходе', value: '320 °C' },
      { labelEn: 'Primary Pressure', labelRu: 'Давление 1-го контура', value: '15.7 MPa' },
      { labelEn: 'Coolant Flow Rate', labelRu: 'Расход теплоносителя', value: '84800 m³/h' },
    ],
    descriptionEn:
      'The VVER-1000 (V-392M) Reactor Pressure Vessel is 12 meters tall and 4.5 meters in diameter, housing 163 fuel assemblies. The primary coolant circuit operates at 15.7 MPa, circulating water through four independent loops. Each loop connects the RPV to a horizontal steam generator via a main coolant pump.',
    descriptionRu:
      'Корпус реактора ВВЭР-1000 (В-392М) высотой 12 м и диаметром 4.5 м содержит 163 тепловыделяющих сборки. Первый контур работает при давлении 15.7 МПа, циркулируя воду через четыре независимые петли. Каждая петля соединяет РК с горизонтальным парогенератором через главный циркуляционный насос.',
  },
  {
    id: 'steamGenerator',
    position: [9, 17.5, 9],
    titleEn: 'Steam Generator (PGV-1000)',
    titleRu: 'Парогенератор (ПГВ-1000)',
    categoryEn: 'Primary Loop',
    categoryRu: 'Первый контур',
    color: '#4cc9f0',
    specs: [
      { labelEn: 'Steam Pressure', labelRu: 'Давление пара', value: '6.3 MPa' },
      { labelEn: 'Steam Output', labelRu: 'Паропроизводительность', value: '1470 t/h' },
      { labelEn: 'Feedwater Temp', labelRu: 'Температура питательной воды', value: '220 °C' },
      { labelEn: 'Tube Count', labelRu: 'Число труб', value: '11000' },
      { labelEn: 'Length / Diameter', labelRu: 'Длина / Диаметр', value: '14 m / 4 m' },
      { labelEn: 'Type', labelRu: 'Тип', value: 'Horizontal' },
    ],
    descriptionEn:
      'The PGV-1000 is a horizontal shell-and-tube heat exchanger, 14 meters long and 4 meters in diameter. Primary coolant flows through ~11,000 stainless steel tubes inside the shell, boiling secondary-side water to produce saturated steam at 6.3 MPa that drives the turbine.',
    descriptionRu:
      'ПГВ-1000 — горизонтальный кожухотрубный теплообменник длиной 14 м и диаметром 4 м. Теплоноситель первого контура проходит через ~11000 нержавеющих труб, испаряя воду второго контура с образованием насыщенного пара при 6.3 МПа для привода турбины.',
  },
  {
    id: 'polarCrane',
    position: [12, 42, 0],
    titleEn: 'Polar Crane',
    titleRu: 'Полярный кран',
    categoryEn: 'Containment Lifting',
    categoryRu: 'Грузоподъёмное оборудование',
    color: '#fcbf49',
    specs: [
      { labelEn: 'Max Lifting Capacity', labelRu: 'Макс. грузоподъёмность', value: '320 tons' },
      { labelEn: 'Rail Diameter', labelRu: 'Диаметр рельса', value: '~36 m' },
      { labelEn: 'Rotation', labelRu: 'Поворот', value: '360°' },
      { labelEn: 'Function', labelRu: 'Назначение', value: 'RPV head / cask handling' },
    ],
    descriptionEn:
      'The polar crane is a circular overhead bridge crane running on a 360-degree rail around the inner containment dome at +36m elevation. It is used during refueling outages to lift the reactor head, move shielding casks, and handle heavy components up to 320 tons.',
    descriptionRu:
      'Полярный кран — круговой мостовой кран, перемещающийся по кольцевому рельсу внутри купола на отметке +36 м. Используется при перегрузке топлива для снятия крышки реактора, перемещения защитных контейнеров и тяжёлого оборудования весом до 320 тонн.',
  },
  {
    id: 'serverRoom',
    position: [0, -4, 10],
    titleEn: 'I&C Server Room (АСУ ТП / DCS)',
    titleRu: 'Серверная СУ ТБ (АСУ ТП)',
    categoryEn: 'Digital Control System',
    categoryRu: 'Система управления',
    color: '#06d6a0',
    specs: [
      { labelEn: 'Redundancy Logic', labelRu: 'Логика резервирования', value: '2 / 4' },
      { labelEn: 'Signal Channels', labelRu: 'Каналы сигналов', value: '4 independent' },
      { labelEn: 'Network Bus', labelRu: 'Сетевая шина', value: 'Fiber-optic Ethernet' },
      { labelEn: 'Safety Function', labelRu: 'Функция безопасности', value: 'Reactor trip / ECCS' },
      { labelEn: 'Update Rate', labelRu: 'Частота обновления', value: '100 ms' },
    ],
    descriptionEn:
      'The Automated Process Control System (АСУ ТП) uses a 2-out-of-4 voting logic for all safety-grade functions. Four independent trains of I&C cabinets monitor neutron flux, temperature, pressure, and flow, executing reactor trip and ECCS actuation signals via fiber-optic Ethernet.',
    descriptionRu:
      'Автоматизированная система управления технологическим процессом (АСУ ТП) использует логику «2 из 4» для всех функций, важных для безопасности. Четыре независимых комплекта шкафов контролируют нейтронный поток, температуру, давление и расход, формируя команды аварийной защиты и САОЗ.',
  },
];

export type ViewMode = 'orbit' | 'walk';

export type FloorTarget = {
  id: string;
  label: string;
  floorY: number;
  cameraPos: [number, number, number];
  mode: ViewMode;
};

export const FLOOR_VIEWS: FloorTarget[] = [
  {
    id: 'orbit-cutaway',
    label: 'View: Containment Cutaway Outer Tour',
    floorY: 20,
    cameraPos: [50, 30, 60],
    mode: 'orbit',
  },
  {
    id: 'walk-basement',
    label: 'Walk: Basement Server Room (-5m)',
    floorY: -5.0,
    cameraPos: [0, -5 + 1.6, 12],
    mode: 'walk',
  },
  {
    id: 'walk-main',
    label: 'Walk: Reactor & Steam Generators Deck (+15m)',
    floorY: 15.0,
    cameraPos: [10, 15 + 1.6, 10],
    mode: 'walk',
  },
  {
    id: 'walk-upper',
    label: 'Walk: Polar Crane Walkway (+36m)',
    floorY: 36.0,
    cameraPos: [10, 36 + 1.6, 10],
    mode: 'walk',
  },
];

export const ELEVATIONS = FLOOR_VIEWS.map((v) => ({ id: v.id, label: v.label, y: v.floorY }));
