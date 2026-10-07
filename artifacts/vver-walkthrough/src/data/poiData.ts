export type POIId = 'rpv' | 'coreCatcher' | 'steamGenerator' | 'eccsTanks' | 'polarCrane' | 'serverRoom' | 'reactorPit' | 'turboGenerator';

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
    position: [0, 14, 0],
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
    id: 'coreCatcher',
    position: [0, -8, 2.5],
    titleEn: 'Core Catcher (Ловушка расплава)',
    titleRu: 'Устройство локализации расплава (УЛР)',
    categoryEn: 'Subterranean Passive Safety (-10.0m)',
    categoryRu: 'Пассивная безопасность под РК (-10.0м)',
    color: '#e76f51',
    specs: [
      { labelEn: 'Elevation', labelRu: 'Отметка', value: '-10.000 m' },
      { labelEn: 'Device Type', labelRu: 'Тип устройства', value: 'Core Melt Localization Device (УЛР)' },
      { labelEn: 'Geometry', labelRu: 'Геометрия', value: 'Truncated Conical Guide Funnel' },
      { labelEn: 'Sacrificial Material', labelRu: 'Жертвенный материал', value: 'Fe₂O₃ / Al₂O₃ Ceramic Blocks' },
      { labelEn: 'Vessel Jacket', labelRu: 'Охлаждение корпуса', value: 'Annular Water Cooling Jacket' },
      { labelEn: 'Enclosure', labelRu: 'Ограждение', value: 'Thick Concrete Biological Shield Vault' },
    ],
    descriptionEn:
      'Located directly underneath the bottom head of the Reactor Pit at elevation -10.0m, the Core Catcher consists of a conical guide funnel and a sacrificial material containment vessel. In a severe accident, molten corium is guided into the vessel, mixed with sacrificial oxides to reduce decay heat density, and cooled by the annular water jacket.',
    descriptionRu:
      'Устройство локализации расплава активной зоны (УЛР / «Ловушка расплава») расположено строго под днищем шахты реактора на отметке -10.0 м. Состоит из направляющей воронки, корпуса с жертвенным материалом и наружной водяной рубашки охлаждения в герметичной бетонной шахте биологической защиты.',
  },
  {
    id: 'steamGenerator',
    position: [9, 17.5, 9],
    titleEn: 'Steam Generator (PGV-1000)',
    titleRu: 'Парогенератор (ПГВ-1000)',
    categoryEn: 'Primary Loop · Rosatom Lime-Green',
    categoryRu: 'Первый контур · Цвет Росатом',
    color: '#8DB600',
    specs: [
      { labelEn: 'Steam Pressure', labelRu: 'Давление пара', value: '6.3 MPa' },
      { labelEn: 'Steam Output', labelRu: 'Паропроизводительность', value: '1470 t/h' },
      { labelEn: 'Feedwater Temp', labelRu: 'Температура питательной воды', value: '220 °C' },
      { labelEn: 'Tube Count', labelRu: 'Число труб', value: '11000' },
      { labelEn: 'Length / Diameter', labelRu: 'Длина / Диаметр', value: '14 m / 4 m' },
      { labelEn: 'Finish Standard', labelRu: 'Стандарт окраски', value: 'Rosatom Lime-Green (#8DB600)' },
    ],
    descriptionEn:
      'The PGV-1000 is a horizontal shell-and-tube heat exchanger, 14 meters long and 4 meters in diameter, finished in the iconic Rosatom safety lime-green finish (#8DB600). Primary coolant flows through ~11,000 stainless steel tubes inside the shell, boiling secondary-side water to produce saturated steam at 6.3 MPa.',
    descriptionRu:
      'ПГВ-1000 — горизонтальный парогенератор длиной 14 м и диаметром 4 м в фирменной защитной салатовой окраске Росатома (#8DB600). Теплоноситель первого контура проходит через ~11000 нержавеющих труб, вырабатывая пар 6.3 МПа.',
  },
  {
    id: 'eccsTanks',
    position: [16.2, 19.5, 0],
    titleEn: 'ECCS Accumulator Tanks (ЕО САОЗ)',
    titleRu: 'Гидроемкости САОЗ (ЕО САОЗ)',
    categoryEn: 'Passive Safety Systems',
    categoryRu: 'Пассивные системы безопасности',
    color: '#8DB600',
    specs: [
      { labelEn: 'Unit Count', labelRu: 'Количество емкостей', value: '4 independent' },
      { labelEn: 'Accumulator Volume', labelRu: 'Объем емкости', value: '60 m³ each' },
      { labelEn: 'Boron Solution', labelRu: 'Раствор борной кислоты', value: '16 g/kg H₃BO₃' },
      { labelEn: 'Operating Pressure', labelRu: 'Рабочее давление (N₂)', value: '5.9 MPa' },
      { labelEn: 'Injection Line', labelRu: 'Трубопровод впрыска', value: 'DN 300 to RPV' },
      { labelEn: 'Safety Finish', labelRu: 'Окраска', value: 'Rosatom Lime-Green (#8DB600)' },
    ],
    descriptionEn:
      'The Emergency Core Cooling Tanks (ЕО САОЗ) are 4 passive pressurized hydraulic accumulators containing borated water under nitrogen gas pressure (5.9 MPa). In a loss-of-coolant accident (LOCA), check valves open automatically, flooding the core without requiring AC electric power.',
    descriptionRu:
      'Гидроемкости системы аварийного охлаждения зоны (ЕО САОЗ) — 4 пассивных гидроаккумулятора с раствором бора под давлением азота (5.9 МПа). При разгерметизации контура обратные клапаны автоматически подают борный раствор в реактор без электричества.',
  },
  {
    id: 'reactorPit',
    position: [0, 16.2, 5.5],
    titleEn: 'Reactor Pit & Transport Rails (+15m)',
    titleRu: 'Шахта реактора и рельсовый путь (+15м)',
    categoryEn: 'Main Deck Infrastructure',
    categoryRu: 'Инфраструктура центрального зала',
    color: '#FFCC00',
    specs: [
      { labelEn: 'Elevation', labelRu: 'Отметка зала', value: '+15.000 m' },
      { labelEn: 'Protective Railing', labelRu: 'Ограждение шахты', value: 'Circular Safety Yellow (#FFCC00)' },
      { labelEn: 'Floor Finish', labelRu: 'Покрытие пола', value: 'Dark Grey Anti-Slip Tiles' },
      { labelEn: 'Transport Track', labelRu: 'Транспортный путь', value: 'Embedded Dolly Rails (1520 mm)' },
      { labelEn: 'Service Hatches', labelRu: 'Люки ревизии', value: 'Segmented Shielding Covers' },
    ],
    descriptionEn:
      'The +15.0m elevation deck is the central hall of the reactor building. It features dark grey anti-slip industrial floor tiles, a circular safety yellow guardrail (#FFCC00) enclosing the biological shielding pit, segmented floor inspection hatches, and embedded steel rails for the equipment transport dolly.',
    descriptionRu:
      'Отметка +15.0 м — главный зал реакторного отделения. Пол облицован темно-серой нескользящей плиткой, шахта реактора защищена кольцевым желтым ограждением (#FFCC00), по плите проложены утопленные рельсовые пути для транспортной тележки.',
  },
  {
    id: 'polarCrane',
    position: [12, 42.5, 0],
    titleEn: 'Polar Crane (320t / 32t)',
    titleRu: 'Полярный кран (320т / 32т)',
    categoryEn: 'Containment Lifting · Safety Yellow',
    categoryRu: 'Грузоподъёмное оборудование · Жёлтый',
    color: '#FFCC00',
    specs: [
      { labelEn: 'Max Lifting Capacity', labelRu: 'Макс. грузоподъёмность', value: '320 tons' },
      { labelEn: 'Auxiliary Hoist', labelRu: 'Вспомогательный подъем', value: '32 tons' },
      { labelEn: 'Rail Track Diameter', labelRu: 'Диаметр рельса', value: '36.0 m' },
      { labelEn: 'Rotation', labelRu: 'Угол поворота', value: '360° Continuous' },
      { labelEn: 'Finish Standard', labelRu: 'Окраска', value: 'High-Vis Safety Yellow (#FFCC00)' },
      { labelEn: 'Lighting Ring', labelRu: 'Освещение', value: '4500K High-Bay LED Floodlights' },
    ],
    descriptionEn:
      'The 360-degree polar bridge crane spans the containment dome in high-visibility safety yellow (#FFCC00). It features twin box girders, traveling winch trolley with 320t main and 32t aux hoists, maintenance catwalks with yellow safety railings, and high-bay 4500K LED floodlights mounted beneath the rail beam.',
    descriptionRu:
      'Круговой полярный кран грузоподъемностью 320 тонн в сигнальном желтом цвете (#FFCC00). Оборудован двухбалочным мостом, грузовой тележкой с основным и вспомогательным барабанами, огражденными галереями и кольцом светодиодных прожекторов 4500K.',
  },
  {
    id: 'serverRoom',
    position: [0, -4, 10],
    titleEn: 'I&C Server Room (АСУ ТП / DCS)',
    titleRu: 'Серверная СУ ТБ (АСУ ТП)',
    categoryEn: 'Digital Control System (-5.0m)',
    categoryRu: 'Система управления (-5.0м)',
    color: '#06d6a0',
    specs: [
      { labelEn: 'Elevation', labelRu: 'Отметка', value: '-5.000 m (Above Core Catcher Vault)' },
      { labelEn: 'Redundancy Logic', labelRu: 'Логика резервирования', value: '2 / 4' },
      { labelEn: 'Signal Channels', labelRu: 'Каналы сигналов', value: '4 independent trains (A, B, C, D)' },
      { labelEn: 'Network Bus', labelRu: 'Сетевая шина', value: 'Bundled Blue Ethernet & Orange Fiber' },
      { labelEn: 'Safety Function', labelRu: 'Функция безопасности', value: 'Reactor trip / ECCS actuation' },
      { labelEn: 'Flooring', labelRu: 'Конструкция пола', value: 'Raised Computer Flooring (600mm)' },
    ],
    descriptionEn:
      'The Automated Process Control System (АСУ ТП) at -5.0m elevation is situated in the perimeter annular space directly above the Core Catcher vault ceiling. It features rows of 19-inch racks with animated status LEDs, overhead cable trays with blue Ethernet and orange fiber conduits, and operator monitoring stations.',
    descriptionRu:
      'Серверная АСУ ТП на отметке -5.0 м расположена в кольцевом пространстве непосредственно над перекрытием шахты ловушки расплава. Оборудована рядами 19-дюймовых шкафов с индикацией, кабельными трассами с синими и оранжевыми оптическими кабелями и станциями операторов.',
  },
  {
    id: 'turboGenerator',
    position: [70, 15, -12],
    titleEn: 'Turbo-Generator Set (K-1000-60/1500 & TVV-1000)',
    titleRu: 'Турбоагрегат К-1000-60/1500 и генератор ТВВ-1000',
    categoryEn: 'Secondary Circuit · Turbine Hall (+12.0m)',
    categoryRu: 'Второй контур · Машинный зал (+12.0м)',
    color: '#70933C',
    specs: [
      { labelEn: 'Rated Power', labelRu: 'Электрическая мощность', value: '1000 MWe (1100 MWe gross)' },
      { labelEn: 'Shaft Speed', labelRu: 'Частота вращения', value: '1500 rpm' },
      { labelEn: 'Main Steam Pressure', labelRu: 'Давление свежего пара', value: '6.0 MPa' },
      { labelEn: 'Steam Flow Rate', labelRu: 'Расход свежего пара', value: '5880 t/h' },
      { labelEn: 'Cylinder Arrangement', labelRu: 'Цилиндры турбины', value: '1x HP (ЦВД) + 3x LP (ЦНД)' },
      { labelEn: 'Electric Generator', labelRu: 'Генератор', value: 'TVV-1000-4 (H₂/H₂O cooled)' },
      { labelEn: 'Stator Voltage', labelRu: 'Напряжение статора', value: '24 kV' },
      { labelEn: 'Moisture Separators', labelRu: 'Сепараторы-пароперегреватели', value: '4x SPP-1000' },
    ],
    descriptionEn:
      'The K-1000-60/1500 turbo-generator set transforms secondary circuit steam into 1000 MW of electrical power at 1500 rpm. Saturated steam from the steam generators enters the High-Pressure Cylinder (ЦВД) at 6.0 MPa, exhausts into 4 Moisture Separator Reheaters (СПП-1000) for separation and two-stage superheating, and expands through 3 massive dual-flow Low-Pressure Cylinders (ЦНД) into surface condensers. The TVV-1000 generator outputs 24 kV power.',
    descriptionRu:
      'Турбоагрегат К-1000-60/1500 преобразует энергию пара второго контура в 1000 МВт электроэнергии при 1500 об/мин. Свежий пар 6.0 МПа поступает в цилиндр высокого давления (ЦВД), осушается и перегревается в 4 сепараторах-пароперегревателях (СПП-1000), после чего поступает в 3 двухпоточных цилиндра низкого давления (ЦНД). Генератор ТВВ-1000 вырабатывает напряжение 24 кВ.',
  },
];

export type ViewMode = 'orbit' | 'walk' | 'drone';

export type FloorTarget = {
  id: string;
  label: string;
  floorY: number;
  cameraPos: [number, number, number];
  target?: [number, number, number];
  mode: ViewMode;
};

export const FLOOR_VIEWS: FloorTarget[] = [
  {
    id: 'view-drone',
    label: '🛸 Дрон-облёт АЭС / Cinematic Drone Fly-By',
    floorY: 35,
    cameraPos: [-60, 56, 78],
    target: [38, 22, -8],
    mode: 'drone',
  },
  {
    id: 'view-aerial',
    label: '🛰️ Общий вид АЭС с высоты / Aerial Bird\'s-Eye View',
    floorY: 15,
    cameraPos: [145, 115, 165],
    target: [0, 18, -25],
    mode: 'orbit',
  },
  {
    id: 'view-construction',
    label: '🏗️ Площадка строительства / Construction Deck Level',
    floorY: 0,
    cameraPos: [0, 3.2, 74],
    target: [0, 24, 0],
    mode: 'orbit',
  },
  {
    id: 'view-cooling-tower',
    label: '🌀 Основание Градирни / Cooling Tower Base View',
    floorY: 0,
    cameraPos: [-125, 4.2, -78],
    target: [-125, 62, -115],
    mode: 'orbit',
  },
  {
    id: 'walk-main',
    label: '⚛️ Центральный зал реактора / Main Reactor Platform (+15m)',
    floorY: 15.0,
    cameraPos: [9, 15 + 1.6, 9],
    target: [0, 16, 0],
    mode: 'walk',
  },
  {
    id: 'walk-turbine',
    label: '⚡ Машинный зал: Турбоагрегат / Turbine Hall (+12m Deck)',
    floorY: 12.0,
    cameraPos: [33, 12.0 + 1.6, -4],
    target: [75, 14.5, -12],
    mode: 'walk',
  },
  {
    id: 'walk-basement',
    label: '🖥️ Подвал: Серверная АСУ ТП / DCS Server Vault (-5m)',
    floorY: -5.0,
    cameraPos: [0, -5 + 1.6, 12],
    target: [0, -4, 0],
    mode: 'walk',
  },
  {
    id: 'walk-upper',
    label: '🏗️ Эстакада Полярного крана (+36м)',
    floorY: 36.0,
    cameraPos: [0, 37.8, 12],
    target: [0, 37.8, 0],
    mode: 'walk',
  },
  {
    id: 'walk-core-catcher',
    label: '🛡️ Шахта УЛР: Ловушка расплава (-10м)',
    floorY: -10.0,
    cameraPos: [0, -10 + 1.6, -6.2],
    target: [0, -8, 0],
    mode: 'walk',
  },
];

export const ELEVATIONS = FLOOR_VIEWS.map((v) => ({ id: v.id, label: v.label, y: v.floorY }));
