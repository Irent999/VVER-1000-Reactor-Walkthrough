export type POIId =
  | 'rpv'
  | 'coreCatcher'
  | 'steamGenerator'
  | 'pressurizer'
  | 'eccsTanks'
  | 'polarCrane'
  | 'serverRoom'
  | 'reactorPit'
  | 'turboGenerator'
  | 'vverMCR'
  | 'deaerator'
  | 'coolingTowers'
  | 'switchyard'
  | 'specialBuilding'
  | 'ritmCore'
  | 'ritmSG'
  | 'ritmCRD'
  | 'ritmPump'
  | 'ritmTurbine'
  | 'ritmBubbler'
  | 'ritmMCR';

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
    id: 'pressurizer',
    position: [-13.5, 19.5, -8.2],
    titleEn: 'Pressurizer & Relief Tank (КД В-320)',
    titleRu: 'Компенсатор давления и бак-барботер',
    categoryEn: 'Primary Pressure Boundary · 15.7 MPa',
    categoryRu: 'Граница давления 1-го контура · 15.7 МПа',
    color: '#00d2ff',
    specs: [
      { labelEn: 'Vessel Volume', labelRu: 'Объем сосуда КД', value: '79 m³' },
      { labelEn: 'Operating Pressure', labelRu: 'Рабочее давление', value: '15.70 MPa' },
      { labelEn: 'Heater Capacity', labelRu: 'Мощность ТЭН', value: '2520 kW (28 bundles)' },
      { labelEn: 'Surge Line', labelRu: 'Дыхательный трубопровод', value: 'DN 350 to Loop #4' },
      { labelEn: 'Spray Line', labelRu: 'Линия впрыска', value: 'DN 150/200' },
      { labelEn: 'Safety Valves', labelRu: 'Предохранительные клапаны', value: '3x ИПК КД to PRT' },
      { labelEn: 'Relief Tank (PRT)', labelRu: 'Бак-барботер', value: '30 m³ (Elevation +11.2m)' },
    ],
    descriptionEn:
      'The Pressurizer (КД В-320) maintains and controls the 15.7 MPa primary circuit pressure. It contains 79 m³ of saturated water and steam cushion, equipped with 2520 kW electrical heater bundles in the bottom head and spray nozzles at the top head. In overpressure events, 3 pulse relief valves (ИПК КД) vent steam into the Pressurizer Relief Tank (Бак-барботер).',
    descriptionRu:
      'Компенсатор давления (КД В-320) поддерживает и регулирует рабочее давление первого контура 15.7 МПа. Сосуд объемом 79 м³ с паровой подушкой оснащен блоком ТЭН мощностью 2520 кВт в нижнем днище и форсунками впрыска в верхнем куполе. При превышении давления 3 импульсно-предохранительных клапана (ИПК) сбрасывают пар в бак-барботер на отметке +11.2м.',
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
  {
    id: 'vverMCR',
    position: [-32.0, 19.0, 0.0],
    titleEn: 'VVER-1000 Main Control Room (БЩУ-1)',
    titleRu: 'БЩУ ВВЭР-1000',
    categoryEn: 'Auxiliary Building · Control Center (+13.20m)',
    categoryRu: 'Левый вспомогательный корпус РО · Отметка +13.20м',
    color: '#00e5ff',
    specs: [
      { labelEn: 'Reactor Unit', labelRu: 'Энергоблок', value: 'ВВЭР-1000 / В-320' },
      { labelEn: 'Location', labelRu: 'Размещение', value: 'Левый вспомогательный корпус (обстройка РО)' },
      { labelEn: 'Elevation', labelRu: 'Отметка размещения', value: '+13.20 m (Операторский этаж)' },
      { labelEn: 'Operator Stations', labelRu: 'Рабочие места', value: 'ВИУР, ВИУТ, НСБ' },
      { labelEn: 'Primary Coolant Loops', labelRu: 'Контуры циркуляции', value: '4 петли (ГЦЭН-195М, ПГВ-1000)' },
      { labelEn: 'Reactivity Control', labelRu: 'Система СУЗ', value: '61 группа ШУОК + АЗ-5' },
      { labelEn: 'Safety Displays', labelRu: 'Системы визуализации', value: 'Мнемощит АСУ ТП, табло сигнализации' },
    ],
    descriptionEn:
      'The Main Control Room (БЩУ-1) is the central nerve center for Unit 1 VVER-1000, located inside the left auxiliary reactor building (control annex) at elevation +13.20m, directly adjoining the cylindrical containment. Operators monitor and control 4 primary reactor loops, turbine generator K-1000-60/1500, reactor safety systems (AZ-5, ECCS/САОЗ), and automated digital instrumentation in real time.',
    descriptionRu:
      'Блочный щит управления (БЩУ-1) энергоблока ВВЭР-1000 расположен внутри левого вспомогательного реакторного корпуса (обстройки РО / пульта управления) на отметке +13.20м, примыкающего к цилиндрической части контейнмента. Обеспечивает круглосуточное оперативное управление 4 петлями первого контура, ГЦЭН, приводами СУЗ, турбогенератором К-1000-60/1500 и системами безопасности (АЗ-5, САОЗ).',
  },
  {
    id: 'deaerator',
    position: [28.5, 28.0, -12.0],
    titleEn: 'Deaerator Compartment (Деаэраторная этажерка)',
    titleRu: 'Деаэраторная этажерка ВВЭР-1000',
    categoryEn: 'Main Power Block · Intermediate Annex',
    categoryRu: 'Главный корпус · Сопрягающий объем РО и МЗ',
    color: '#e2a34f',
    specs: [
      { labelEn: 'Building Type', labelRu: 'Тип сооружения', value: 'Деаэраторная этажерка (ДЭ)' },
      { labelEn: 'Equipment Type', labelRu: 'Оборудование', value: '2х Деаэратора ДП-1000 (185 м³)' },
      { labelEn: 'Operating Pressure', labelRu: 'Рабочее давление', value: '1.2 MPa' },
      { labelEn: 'Feedwater Temp', labelRu: 'Температура питательной воды', value: '164–188 °C' },
      { labelEn: 'Main Steam Lines', labelRu: 'Паропроводы острого пара', value: '4x Ду 600 (6.0 MPa)' },
      { labelEn: 'Hermetic Penetrations', labelRu: 'Гермопроходки', value: 'Сейсмостойкие узлы РО' },
    ],
    descriptionEn:
      'The multi-story Deaerator Building directly connects the cylindrical reactor containment to the longitudinal turbine hall. On the upper elevation (+27m), two massive horizontal deaerator vessels (DP-1000) remove dissolved oxygen and non-condensable gases from secondary circuit feedwater, while 4 main steam lines (DN 600) deliver 6.0 MPa steam into the machine hall.',
    descriptionRu:
      'Деаэраторная этажерка представляет собой многоэтажный объем главного корпуса, непосредственно сопрягающий контейнмент реакторного отделения с протяженным машинным залом. На верхнем ярусе (+27м) размещены 2 массивных деаэратора ДП-1000 (по 185 м³) с колонками деаэрации, а сквозь здание проходят 4 главных паропровода острого пара Ду 600.',
  },
  {
    id: 'coolingTowers',
    position: [-147.5, 45.0, 15.0],
    titleEn: 'Cooling Towers Cluster (Кластер градирен)',
    titleRu: 'Кластер градирен (4 башни)',
    categoryEn: 'Circulating Water Cooling Infrastructure',
    categoryRu: 'Комплекс оборотного техводоснабжения',
    color: '#3498db',
    specs: [
      { labelEn: 'Cooling Towers Count', labelRu: 'Число башенных градирен', value: '4 гиперболоидные башни' },
      { labelEn: 'Tower Height', labelRu: 'Высота башни', value: '94.0 m' },
      { labelEn: 'Base Diameter', labelRu: 'Диаметр основания', value: '70.0 m' },
      { labelEn: 'Circulating Water Flow', labelRu: 'Расход циркуляционной воды', value: '200,000 m³/h' },
      { labelEn: 'Pump Stations', labelRu: 'Насосные станции', value: '2x БНС (Блочные насосные)' },
      { labelEn: 'Conduit Diameter', labelRu: 'Диаметр водоводов', value: 'Ду 2200 mm' },
    ],
    descriptionEn:
      'The prominent cluster of 4 hyperboloid cooling towers (2 per VVER-1000 power unit) provides closed-loop circulating water cooling for the main turbine surface condensers. The towers stand 94 meters tall, paired with two dedicated Circulating Water Pumphouses (БНС) supplying cooling water via twin DN 2200mm conduits.',
    descriptionRu:
      'Плотная группа из 4 гиперболоидных градирен башенного типа (по 2 башни на каждый энергоблок ВВЭР-1000) обеспечивает оборотное охлаждение конденсаторов турбоагрегатов. Высота каждой башни составляет 94 метра. Между парами градирен размещены блочные насосные станции (БНС), соединенные с машзалом подземными и надземными водоводами Ду 2200 мм.',
  },
  {
    id: 'switchyard',
    position: [160.0, 18.0, 10.0],
    titleEn: '500 kV Switchyard & Transformers (ОРУ-500 кВ)',
    titleRu: 'ОРУ-500 кВ и блочные трансформаторы',
    categoryEn: 'High-Voltage Power Evacuation',
    categoryRu: 'Выдача электрической мощности 500 кВ',
    color: '#f39c12',
    specs: [
      { labelEn: 'Switchyard Type', labelRu: 'Тип распредустройства', value: 'Открытое РУ 500 кВ (ОРУ)' },
      { labelEn: 'Step-Up Transformers', labelRu: 'Блочные трансформаторы', value: 'ТЦ-1000000/500 (24/500 кВ)' },
      { labelEn: 'Firewalls', labelRu: 'Противопожарные стены', value: 'Железобетонные брандмауэры' },
      { labelEn: 'Switchgear', labelRu: 'Коммутационные аппараты', value: 'Элегазовые выключатели ВГТ-500' },
      { labelEn: 'Disconnectors', labelRu: 'Разъединители', value: 'Пантографические РГП-500' },
      { labelEn: 'Transmission Lines', labelRu: 'Опоры ЛЭП', value: 'Анкерные решетчатые опоры 500 кВ' },
    ],
    descriptionEn:
      'The 500 kV Outdoor Switchyard (ОРУ-500 кВ) connects the NPP power units to the regional electrical grid. Massive step-up transformers (ТЦ-1000000/500) stepping 24 kV up to 500 kV are separated by blast firewalls along the machine hall. The switchyard features steel lattice gantry portals, SF6 circuit breakers, pantograph disconnectors, and overhead lines.',
    descriptionRu:
      'Открытое распределительное устройство 500 кВ (ОРУ-500 кВ) осуществляет выдачу 2000 МВт мощности станции в Единую энергосистему. Вдоль стен машзала установлены блочные повышающие трансформаторы ТЦ-1000000/500 с огнестойкими брандмауэрами. Поле ОРУ оснащено порталами ошиновки, элегазовыми выключателями, разъединителями и анкерными опорами ЛЭП.',
  },
  {
    id: 'specialBuilding',
    position: [-28.0, 22.0, -75.0],
    titleEn: 'Special Auxiliary Building (Спецкорпус)',
    titleRu: 'Спецкорпус (Спецводоочистка)',
    categoryEn: 'Nuclear Auxiliary Systems',
    categoryRu: 'Комплекс спецводоочистки и ЖРО',
    color: '#95a5a6',
    specs: [
      { labelEn: 'Building Type', labelRu: 'Назначение корпуса', value: 'Спецкорпус РО / Спецводоочистка' },
      { labelEn: 'Ventilation Stack', labelRu: 'Венттруба спецкорпуса', value: 'Высота 52 m (фильтрованная)' },
      { labelEn: 'Structural Framing', labelRu: 'Конструкция', value: 'Монолитный биозащитный железобетон' },
      { labelEn: 'Transport Bay', labelRu: 'Транспортный шлюз', value: 'Защитные гермоворота (ЖД/авто)' },
      { labelEn: 'Overhead Gallery', labelRu: 'Эстакада трубопроводов', value: 'Связка с РО на отметке +13.5м' },
    ],
    descriptionEn:
      'The Special Auxiliary Building (Спецкорпус) houses specialized radioactive water treatment systems (СВО), liquid and solid radwaste processing facilities, and dedicated active ventilation exhaust systems with a 52m filtered stack. An overhead enclosed gantry pipe rack connects directly to the reactor auxiliary building.',
    descriptionRu:
      'Спецкорпус предназначен для размещения установок специальной водоочистки (СВО), узлов переработки жидких и твердых радиоактивных отходов и вентцентра с отдельной фильтрованной венттрубой высотой 52 м. Соединен с обстройкой реакторного отделения надземной технологической эстакадой на отметке +13.5 м.',
  },
  {
    id: 'ritmCore',
    position: [154, 2.3, 80],
    titleEn: 'RITM-200N Core (Активная зона)',
    titleRu: 'Активная зона РИТМ-200Н',
    categoryEn: 'SMR · Integral Core',
    categoryRu: 'АСММ · Активная зона реактора',
    color: '#00d2ff',
    specs: [
      { labelEn: 'Thermal Output', labelRu: 'Тепловая мощность', value: '190 MWt' },
      { labelEn: 'Electrical Power', labelRu: 'Электрическая мощность', value: '55 MWe (до 60 MWe)' },
      { labelEn: 'Fuel Assemblies', labelRu: 'Число кассет ТВС', value: '69 шт. (шестигранные)' },
      { labelEn: 'Active Core Height', labelRu: 'Высота активной зоны', value: '1.65 m' },
      { labelEn: 'Fuel Enrichment', labelRu: 'Обогащение по ²³⁵U', value: '< 20% (LEU)' },
      { labelEn: 'Refueling Cycle', labelRu: 'Топливная кампания', value: '7–10 лет без перегрузки' },
    ],
    descriptionEn:
      'The RITM-200N reactor core contains 69 hexagonal fuel assemblies with high uranium content, providing continuous operation for up to 10 years without refueling. Located in the lower plenum of the single integral pressure vessel, natural and forced circulation keep fuel temperatures well within safe limits.',
    descriptionRu:
      'Активная зона реактора РИТМ-200Н состоит из 69 шестигранных тепловыделяющих сборок (ТВС). Компактная геометрия и увеличенное замедление обеспечивают длительную кампанию до 10 лет без перегрузки топлива. Зона размещена в нижней части единого интегрального корпуса реактора.',
  },
  {
    id: 'ritmSG',
    position: [154, 5.1, 80],
    titleEn: 'Integral Steam Generator (ПГ)',
    titleRu: 'Встроенный парогенератор (ПГ)',
    categoryEn: 'SMR · Integral Steam Gen',
    categoryRu: 'АСММ · Интегральный парогенератор',
    color: '#64dfdf',
    specs: [
      { labelEn: 'Design Concept', labelRu: 'Компоновка', value: 'Integral Annular Cassettes' },
      { labelEn: 'Cassette Count', labelRu: 'Число кассет ПГ', value: '12 змеевиковых кассет' },
      { labelEn: 'Steam Pressure', labelRu: 'Давление свежего пара', value: '3.82 MPa' },
      { labelEn: 'Steam Temperature', labelRu: 'Температура пара', value: '310 °C (перегретый)' },
      { labelEn: 'Steam Production', labelRu: 'Паропроизводительность', value: '310 t/h' },
      { labelEn: 'Tube Material', labelRu: 'Материал трубок', value: 'Titanium / Stainless Alloy' },
    ],
    descriptionEn:
      'Unlike massive external steam generators of large NPPs, RITM-200N features 12 integral cassette modules arranged annularly around the central riser inside the reactor pressure vessel. This eliminates large primary piping and rules out large-break Loss of Coolant Accidents (LOCA).',
    descriptionRu:
      'В отличие от внешних парогенераторов ВВЭР-1000, в РИТМ-200Н 12 кассетных парогенераторов встроены прямо в кольцевое пространство внутри корпуса реактора вокруг центральной шахты. Это исключает протяженные трубопроводы 1-го контура и предотвращает аварии с разрывом петель.',
  },
  {
    id: 'ritmCRD',
    position: [154, 11.5, 80],
    titleEn: 'Control Rod Drive Mechanisms (СУЗ)',
    titleRu: 'Приводы СУЗ (Крышка реактора)',
    categoryEn: 'SMR · Reactivity Control',
    categoryRu: 'АСММ · Приводы защиты и регулирования',
    color: '#ffd166',
    specs: [
      { labelEn: 'Drive Count', labelRu: 'Число приводов СУЗ', value: '19 герметичных механизмов' },
      { labelEn: 'Drive Type', labelRu: 'Тип привода', value: 'Linear Stepping Motor (ШЭМ)' },
      { labelEn: 'Trip Scram Time', labelRu: 'Время сброса АЗ', value: '< 2.5 с (гравитационный)' },
      { labelEn: 'Design Standard', labelRu: 'Исполнение', value: 'Sealed Pressure Housings' },
      { labelEn: 'Seismic Category', labelRu: 'Сейсмостойкость', value: 'Category I (SSE 8-9 points)' },
    ],
    descriptionEn:
      'The 19 Control Rod Drive Mechanisms (СУЗ) are mounted directly atop the reactor vessel closure head. Employing linear stepping magnetic drives, they regulate reactor power and insert emergency shutdown rods by gravity within 2.5 seconds upon any trip signal.',
    descriptionRu:
      '19 герметичных приводов СУЗ установлены на съемной полусферической крышке реактора. Шаговые электромагнитные механизмы точно регулируют мощность реактора, а при обесточивании мгновенно сбрасывают поглощающие стержни в активную зону под действием силы тяжести менее чем за 2.5 секунды.',
  },
  {
    id: 'ritmPump',
    position: [151.5, 3.5, 82.5],
    titleEn: 'Canned Motor Coolant Pumps (ГЦЭН)',
    titleRu: 'Компактные электронасосы (ГЦЭН)',
    categoryEn: 'SMR · Primary Circulation',
    categoryRu: 'АСММ · Главные циркуляционные насосы',
    color: '#06d6a0',
    specs: [
      { labelEn: 'Pump Units', labelRu: 'Число насосов', value: '4 герметичных ГЦЭН' },
      { labelEn: 'Mounting Style', labelRu: 'Тип монтажа', value: 'Direct on RPV Horizontal Nozzles' },
      { labelEn: 'Flow Rate per Pump', labelRu: 'Подача каждого насоса', value: '1400 m³/h' },
      { labelEn: 'Shaft Seal Type', labelRu: 'Уплотнение вала', value: 'Seal-less Canned Motor (Бессальниковый)' },
      { labelEn: 'Cooling Circuit', labelRu: 'Охлаждение двигателя', value: 'Water jacket (Замкнутый контур)' },
    ],
    descriptionEn:
      'Four compact canned-motor main coolant pumps are flanged directly onto horizontal nozzles machined into the reactor vessel forging. The completely seal-less design eliminates any possibility of coolant leakage along the pump shaft, maximizing SMR safety.',
    descriptionRu:
      'Четыре бессальниковых герметичных электронасоса (ГЦЭН) смонтированы непосредственно на горизонтальных патрубках корпуса реактора РИТМ-200Н. Отсутствие внешних уплотнений вала полностью исключает утечку радиоактивного теплоносителя наружу.',
  },
  {
    id: 'ritmTurbine',
    position: [186, -0.5, 80],
    titleEn: 'SMR Turbo-Generator (55-60 MWe)',
    titleRu: 'Турбоагрегат АСММ (55-60 МВт)',
    categoryEn: 'SMR · Power Generation',
    categoryRu: 'АСММ · Машинный зал',
    color: '#118ab2',
    specs: [
      { labelEn: 'Electric Output', labelRu: 'Электрическая мощность', value: '55 MWe net (до 60 MWe)' },
      { labelEn: 'Shaft Speed', labelRu: 'Частота вращения', value: '3000 rpm' },
      { labelEn: 'Turbine Type', labelRu: 'Тип турбины', value: 'Condensing with Process Extractions' },
      { labelEn: 'Inlet Steam Pressure', labelRu: 'Давление на входе', value: '3.8 MPa' },
      { labelEn: 'Generator Type', labelRu: 'Генератор', value: 'Air/Water Cooled Synchronous' },
      { labelEn: 'Condenser Unit', labelRu: 'Конденсатор', value: 'Under-slung Surface Condenser' },
    ],
    descriptionEn:
      'The compact turbine hall adjacent to the SMR reactor module houses the steam turbine and synchronous generator producing 55 MWe. Superheated steam is delivered from the integral steam generators, expanding through high and low-pressure stages into the surface condenser.',
    descriptionRu:
      'Компактный машинный зал АСММ содержит паровую турбину и синхронный генератор единичной мощностью 55–60 МВт. Перегретый пар из встроенных парогенераторов реактора РИТМ-200Н поступает по защищенному паропроводу, вырабатывая электроэнергию при 3000 об/мин.',
  },
  {
    id: 'ritmBubbler',
    position: [143.5, 2.0, 76],
    titleEn: 'Bubbler Tank & Passive ECCS (САОЗ)',
    titleRu: 'Бак-барботер и САОЗ/СПОР',
    categoryEn: 'SMR · Passive Safety',
    categoryRu: 'АСММ · Пассивная безопасность',
    color: '#ef476f',
    specs: [
      { labelEn: 'Safety Logic', labelRu: 'Принцип работы', value: 'Fully Passive (No AC Power Required)' },
      { labelEn: 'Autonomy Period', labelRu: 'Автономность без действий персонала', value: '72 часа' },
      { labelEn: 'ECCS Storage', labelRu: 'Гидроемкости САОЗ', value: '2 баллона с раствором бора' },
      { labelEn: 'Bubbler Function', labelRu: 'Функция бака-барботера', value: 'Steam Condensation & Pressure Relief' },
      { labelEn: 'Decay Heat Removal', labelRu: 'Отвод остаточного тепла', value: 'Passive Emergency Air/Water Heat Exchangers' },
    ],
    descriptionEn:
      'The bubbler tank and passive safety injection systems (САОЗ/СПОР) provide complete emergency shutdown and cooling autonomy for up to 72 hours without electrical power or operator intervention, condensing relief steam and flooding the vessel passively.',
    descriptionRu:
      'Бак-барботер, гидроаккумуляторы САОЗ и теплообменники системы пассивного отвода тепла (СПОР) обеспечивают 72 часа полной автономности безопасности без внешнего энергоснабжения и вмешательства оператора при любых проектных авариях.',
  },
  {
    id: 'ritmMCR',
    position: [154, 0.5, 69],
    titleEn: 'SMR Main Control Room (БЩУ)',
    titleRu: 'Пульт управления (БЩУ малой АЭС)',
    categoryEn: 'SMR · Automation & Control',
    categoryRu: 'АСММ · Цифровой блочный щит',
    color: '#48cae4',
    specs: [
      { labelEn: 'Architecture', labelRu: 'Архитектура СУ ТБ', value: 'Fully Digital Integrated DCS' },
      { labelEn: 'Display Wall', labelRu: 'Видеостена', value: 'Panoramic Reactor Mimic Display' },
      { labelEn: 'Crew Size', labelRu: 'Оперативный персонал', value: '2 оператора в смене' },
      { labelEn: 'Automation Level', labelRu: 'Уровень автоматизации', value: 'Full digital closed-loop control' },
      { labelEn: 'Emergency Panel', labelRu: 'Резервный пульт', value: 'Hardwired Independent Safety Panel' },
    ],
    descriptionEn:
      'The SMR Main Control Room (БЩУ) features high-density ergonomic digital operator consoles, a panoramic status mimic wall displaying real-time flux and thermal parameters, and redundant digital automation requiring only two licensed operators per shift.',
    descriptionRu:
      'Блочный щит управления (БЩУ) малой АЭС оснащен эргономичными цифровыми пультами, панорамной видеостеной мнемосхем РИТМ-200Н с отображением физических параметров в реальном времени. Высокий уровень автоматизации позволяет управлять станцией силами всего 2 операторов.',
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
    id: 'view-master-plan',
    label: '🗺️ Генплан: Общий вид всей АЭС / Full Master Plan Site View',
    floorY: 20,
    cameraPos: [65, 175, 235],
    target: [15, 20, 10],
    mode: 'orbit',
  },
  {
    id: 'view-cooling-towers',
    label: '🏗️ Кластер градирен (4 башни и БНС) / Cooling Towers Cluster',
    floorY: 30,
    cameraPos: [-145, 115, 175],
    target: [-147, 45, 15],
    mode: 'orbit',
  },
  {
    id: 'view-deaerator',
    label: '🏭 Главный корпус (РО, деаэратор, машзал) / Main Power Block',
    floorY: 20,
    cameraPos: [55, 52, -80],
    target: [28, 24, -12],
    mode: 'orbit',
  },
  {
    id: 'view-switchyard',
    label: '⚡ ОРУ-500 кВ и блочные трансформаторы / 500 kV Switchyard',
    floorY: 15,
    cameraPos: [215, 68, -40],
    target: [155, 15, 10],
    mode: 'orbit',
  },
  {
    id: 'view-special-building',
    label: '🏢 Спецкорпус водоочистки и венттруба / Special Building',
    floorY: 15,
    cameraPos: [-35, 45, -135],
    target: [-28, 18, -75],
    mode: 'orbit',
  },
  {
    id: 'view-drone',
    label: '🛸 Дрон-облёт АЭС / Cinematic Drone Fly-By',
    floorY: 35,
    cameraPos: [-60, 56, 78],
    target: [38, 22, -8],
    mode: 'drone',
  },
  {
    id: 'view-unit1',
    label: '⚛️ Энергоблок ВВЭР-1000 №1 / VVER-1000 Unit 1',
    floorY: 15,
    cameraPos: [65, 45, -75],
    target: [25, 20, -10],
    mode: 'orbit',
  },
  {
    id: 'view-pressurizer',
    label: '🔥 Компенсатор давления и бак-барботер / Pressurizer Box (+19m)',
    floorY: 19.5,
    cameraPos: [-9.5, 23.0, -4.5],
    target: [-13.5, 19.5, -8.2],
    mode: 'orbit',
  },
  {
    id: 'walk-vver-mcr',
    label: '🖥️ ВВЭР-1000: Блочный щит управления (БЩУ) / Main Control Room',
    floorY: 13.2,
    cameraPos: [-32.0, 14.80, 1.8],
    target: [-32.0, 14.70, -2.5],
    mode: 'walk',
  },
  {
    id: 'view-unit2',
    label: '⚛️ Энергоблок ВВЭР-1000 №2 / VVER-1000 Unit 2',
    floorY: 15,
    cameraPos: [65, 45, 135],
    target: [25, 20, 60],
    mode: 'orbit',
  },
  {
    id: 'view-smr',
    label: '🔋 Комплекс МАЭС РИТМ-200Н: Общий вид / RITM-200N SMR Overview',
    floorY: 10,
    cameraPos: [205, 48, 130],
    target: [168, 16, 80],
    mode: 'orbit',
  },
  {
    id: 'view-smr-cutaway',
    label: '🔬 РИТМ-200Н: Разрез реакторного блока / SMR Cutaway View',
    floorY: 6,
    cameraPos: [154, 18, 117],
    target: [154, 8, 80],
    mode: 'orbit',
  },
  {
    id: 'view-smr-core',
    label: '⚛️ РИТМ-200Н: Активная зона, ПГ и ГЦЭН / Core & Steam Gen',
    floorY: 3,
    cameraPos: [154, 6.5, 94],
    target: [154, 4.5, 80],
    mode: 'orbit',
  },
  {
    id: 'view-smr-crdm',
    label: '🕹️ РИТМ-200Н: Приводы СУЗ и крышка реактора / CRDM',
    floorY: 12,
    cameraPos: [154, 15.5, 91],
    target: [154, 11.5, 80],
    mode: 'orbit',
  },
  {
    id: 'view-smr-turbine',
    label: '⚡ РИТМ-200Н: Машинный зал и турбоагрегат / SMR Turbine Hall',
    floorY: 3,
    cameraPos: [186, 7.5, 99],
    target: [186, 1.5, 80],
    mode: 'orbit',
  },
  {
    id: 'walk-smr-mcr',
    label: '🖥️ РИТМ-200Н: Пульт управления (БЩУ) / SMR Control Room',
    floorY: 3.6,
    cameraPos: [154, 5.20, 64],
    target: [154, 4.80, 69],
    mode: 'walk',
  },
  {
    id: 'view-switchyard-grid',
    label: '⚡ ОРУ-500 кВ и ЛЭП / Outdoor Switchyard & Grid',
    floorY: 8,
    cameraPos: [195, 38, -45],
    target: [172, 12, 10],
    mode: 'orbit',
  },
  {
    id: 'view-cooling-tower-1',
    label: '🌀 Градирня №1 / Cooling Tower 1',
    floorY: 25,
    cameraPos: [-185, 70, -45],
    target: [-115, 35, 0],
    mode: 'orbit',
  },
  {
    id: 'view-cooling-tower-2',
    label: '🌀 Градирня №2 / Cooling Tower 2',
    floorY: 25,
    cameraPos: [-185, 70, 115],
    target: [-115, 35, 70],
    mode: 'orbit',
  },
  {
    id: 'view-abk',
    label: '🏢 Административный комплекс (АБК) / Admin Complex',
    floorY: 5,
    cameraPos: [0, 24, 185],
    target: [0, 10, 138],
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
    cameraPos: [-3.5, -3.40, 9.5],
    target: [0.0, -3.60, 10.5],
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
