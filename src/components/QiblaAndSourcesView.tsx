import React, { useState, useEffect, useMemo } from 'react';
import {
  Check,
  RotateCcw,
  Navigation,
  Compass,
} from 'lucide-react';
import {
  CityLocation,
  CALCULATION_METHODS,
  calculateQiblaDirection,
  calculateDistanceToKaaba,
  getCardinalDirectionAr,
  gregorianToHijri,
} from '../utils/astronomy';
import {
  calculateTawafOrSaiLapInfo,
  calculateInheritance,
  InheritanceInput,
  calculateComprehensiveZakat,
  ZakatInput,
} from '../utils/islamicFeatures';
import { NearbyMosquesMap } from './NearbyMosquesMap';
import { MANASIK_CHECKLIST_ITEMS } from '../data/thematicAndNamesData';
import { toArabicNumerals } from '../data/quranData';
import {
  detectUserLocation,
  EXTENDED_ARAB_AND_WORLD_CITIES,
  computeQiblaCompassAlignment,
} from '../utils/geolocationService';

export type QiblaSubTab =
  | 'qibla_mosques'
  | 'hajj_umrah'
  | 'inheritance'
  | 'hijri_sources';

interface QiblaAndSourcesViewProps {
  selectedCity: CityLocation;
  onSelectCity: (city: CityLocation) => void;
  hijriAdjustment: number;
  onChangeHijriAdjustment: (adj: number) => void;
  initialSubTab?: QiblaSubTab;
  navigationSignal?: number;
}

const MANASIK_STORAGE_KEY = 'almihrab_manasik_checklist_v1';

const ISLAMIC_OCCASIONS = [
  {
    nameAr: 'رأس السنة الهجرية (غرّة محرّم)',
    hijriDateAr: '١ محرّم',
    noteAr: 'بداية العام الهجري القمري',
  },
  {
    nameAr: 'يوم عاشوراء وتاسوعاء',
    hijriDateAr: '٩ - ١٠ محرّم',
    noteAr: 'صيام يوم عاشوراء يكفّر السنة الماضية (رواه مسلم ١١٦٢)',
  },
  {
    nameAr: 'غرّة شهر رمضان المبارك',
    hijriDateAr: '١ رمضان',
    noteAr: 'فرض صيام شهر رمضان وقيام لياليه',
  },
  {
    nameAr: 'العشر الأواخر وليلة القدر',
    hijriDateAr: '٢١ - ٢٩ رمضان',
    noteAr: 'تحرّي ليلة القدر في الوتر من العشر الأواخر (رواه البخاري ٢٠١٧)',
  },
  {
    nameAr: 'عيد الفطر السعيد',
    hijriDateAr: '١ شوّال',
    noteAr: 'إخراج زكاة الفطر قبل صلاة العيد وصيام ستّ من شوال',
  },
  {
    nameAr: 'عشر ذي الحجة ويوم عرفة',
    hijriDateAr: '١ - ٩ ذو الحجة',
    noteAr: 'صيام يوم عرفة لغير الحاج يكفّر سنتين (رواه مسلم ١١٦٢)',
  },
  {
    nameAr: 'عيد الأضحى المبارك وأيام التشريق',
    hijriDateAr: '١٠ - ١٣ ذو الحجة',
    noteAr: 'يوم النحر وأيام منى أكلٌ وشربٌ وذكرٌ لله عز وجل',
  },
  {
    nameAr: 'الأيام البيض من كل شهر هجري',
    hijriDateAr: '١٣، ١٤، ١٥ من كل شهر',
    noteAr: 'وصيّة النبي ﷺ بصيام ثلاثة أيام من كل شهر (متفق عليه)',
  },
];

export const QiblaAndSourcesView: React.FC<QiblaAndSourcesViewProps> = ({
  selectedCity,
  onSelectCity,
  hijriAdjustment,
  onChangeHijriAdjustment,
  initialSubTab,
  navigationSignal,
}) => {
  // 4 Sub-Sections: Qibla & Mosques | Hajj & Umrah Mutawif | Inheritance Calculator | Hijri & Sources
  const [activeSubTab, setActiveSubTab] = useState<QiblaSubTab>(
    initialSubTab || 'qibla_mosques'
  );

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab, navigationSignal]);

  // Hajj & Umrah Mutawif State
  const [ritualType, setRitualType] = useState<'tawaf' | 'sai'>('tawaf');
  const [currentLap, setCurrentLap] = useState<number>(1);
  const [manasikFilter, setManasikFilter] = useState<
    'ALL' | 'umrah' | 'ihram' | 'hajj_days'
  >('ALL');
  const [checkedManasikIds, setCheckedManasikIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(MANASIK_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return ['um-1'];
  });

  useEffect(() => {
    try {
      localStorage.setItem(
        MANASIK_STORAGE_KEY,
        JSON.stringify(checkedManasikIds)
      );
    } catch {
      // ignore
    }
  }, [checkedManasikIds]);

  // Inheritance Calculator State
  const [inheritanceInput, setInheritanceInput] = useState<InheritanceInput>({
    estateAmount: 120000,
    deceasedGender: 'female',
    hasHusband: true,
    wivesCount: 0,
    hasFather: false,
    hasMother: false,
    sonsCount: 1,
    daughtersCount: 1,
    fullBrothersCount: 0,
    fullSistersCount: 0,
  });
  const [currencyLabel, setCurrencyLabel] = useState<string>('ريال');
  const [financialToolMode, setFinancialToolMode] = useState<
    'zakat' | 'inheritance'
  >('zakat');
  const [zakatInput, setZakatInput] = useState<ZakatInput>({
    cashAndSavings: 45000,
    tradeGoodsAndStocks: 15000,
    goldGrams24K: 20,
    goldGrams21K: 40,
    goldGrams18K: 0,
    silverGrams: 0,
    immediateDebts: 5000,
    goldPricePerGram24K: 315,
    silverPricePerGram: 3.9,
    nisabStandard: 'gold_85g',
    calendarYearType: 'hijri_lunar',
    familyMembersCount: 5,
    fitrCostPerPerson: 25,
  });

  const [compassHeading, setCompassHeading] = useState<number>(0);
  const [sensorActive, setSensorActive] = useState<boolean>(false);
  const [sensorStatusAr, setSensorStatusAr] = useState<string>('');
  const [isLocatingQibla, setIsLocatingQibla] = useState<boolean>(false);
  const [qiblaGeoStatus, setQiblaGeoStatus] = useState<string>('');

  const qiblaAngle = calculateQiblaDirection(
    selectedCity.latitude,
    selectedCity.longitude
  );
  const distanceKm = calculateDistanceToKaaba(
    selectedCity.latitude,
    selectedCity.longitude
  );
  const cardinalAr = getCardinalDirectionAr(qiblaAngle);
  const todayHijri = gregorianToHijri(new Date(), hijriAdjustment);

  const alignment = useMemo(() => {
    return computeQiblaCompassAlignment(
      selectedCity.latitude,
      selectedCity.longitude,
      compassHeading
    );
  }, [selectedCity.latitude, selectedCity.longitude, compassHeading]);

  useEffect(() => {
    if (!sensorActive || typeof window === 'undefined') return;

    const handleOrientation = (event: DeviceOrientationEvent) => {
      const webkitHeading = (
        event as DeviceOrientationEvent & { webkitCompassHeading?: number }
      ).webkitCompassHeading;

      if (typeof webkitHeading === 'number' && !Number.isNaN(webkitHeading)) {
        setCompassHeading(Math.round(webkitHeading));
        return;
      }

      if (typeof event.alpha === 'number' && !Number.isNaN(event.alpha)) {
        const heading = (360 - event.alpha) % 360;
        setCompassHeading(Math.round(heading));
      }
    };

    const win = window as Window & typeof globalThis;
    win.addEventListener('deviceorientationabsolute', handleOrientation as EventListener, true);
    win.addEventListener('deviceorientation', handleOrientation as EventListener, true);

    return () => {
      win.removeEventListener('deviceorientationabsolute', handleOrientation as EventListener, true);
      win.removeEventListener('deviceorientation', handleOrientation as EventListener, true);
    };
  }, [sensorActive]);

  const handleToggleLiveCompassSensor = async () => {
    if (sensorActive) {
      setSensorActive(false);
      setCompassHeading(0);
      setSensorStatusAr('تم إيقاف البوصلة الحية والعودة للشمال الحقيقي (0°).');
      return;
    }

    if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) {
      setSensorStatusAr(
        'جهازك الحالي لا يحتوي على حساس بوصلة مغناطيسي؛ استخدم أزرار وشريط توجيه البوصلة أدناه.'
      );
      return;
    }

    try {
      const DevOrient = DeviceOrientationEvent as unknown as {
        requestPermission?: () => Promise<'granted' | 'denied'>;
      };
      if (typeof DevOrient.requestPermission === 'function') {
        const permission = await DevOrient.requestPermission();
        if (permission !== 'granted') {
          setSensorStatusAr('لم يتم منح إذن حساس الاتجاه؛ يمكنك تدوير البوصلة يدوياً أدناه.');
          return;
        }
      }
      setSensorActive(true);
      setSensorStatusAr('البوصلة الحية مفعّلة — أدر هاتفك أفقياً حتى يتطابق رمز الكعبة مع السهم العلوي.');
    } catch {
      setSensorActive(true);
      setSensorStatusAr('البوصلة الحية مفعّلة — أدر هاتفك أو حرّك مؤشر الاتجاه للمحاذاة.');
    }
  };

  const handleDetectLocationForQibla = async () => {
    if (isLocatingQibla) return;
    setIsLocatingQibla(true);
    setQiblaGeoStatus('جاري تحديد موقعك وحساب زاوية القبلة الدقيقة...');
    try {
      const result = await detectUserLocation();
      onSelectCity(result.city);
      setQiblaGeoStatus(result.statusMessageAr);
    } catch {
      setQiblaGeoStatus('تعذّر تحديد الموقع تلقائياً؛ اختر مدينتك من القائمة.');
    } finally {
      setIsLocatingQibla(false);
    }
  };

  const currentLapInfo = useMemo(() => {
    return calculateTawafOrSaiLapInfo(ritualType, currentLap);
  }, [ritualType, currentLap]);

  const filteredManasikList = useMemo(() => {
    if (manasikFilter === 'ALL') return MANASIK_CHECKLIST_ITEMS;
    return MANASIK_CHECKLIST_ITEMS.filter((i) => i.category === manasikFilter);
  }, [manasikFilter]);

  const inheritanceResult = useMemo(() => {
    return calculateInheritance(inheritanceInput);
  }, [inheritanceInput]);

  const zakatResult = useMemo(() => {
    return calculateComprehensiveZakat(zakatInput);
  }, [zakatInput]);

  const handleToggleManasikCheck = (id: string) => {
    setCheckedManasikIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Compact Header & 4-Tab Section Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="font-display text-xl sm:text-2xl font-bold text-stone-900">
          القبلة والمناسك والمواريث
        </h1>
      </div>

      <div
        role="tablist"
        aria-label="أدوات القبلة والمناسك والمواريث"
        className="grid grid-cols-2 lg:grid-cols-4 gap-1.5 p-1 bg-[#F4EFE6] border border-stone-200 rounded-xl"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeSubTab === 'qibla_mosques'}
          onClick={() => setActiveSubTab('qibla_mosques')}
          className={`min-h-[38px] px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer whitespace-nowrap ${
            activeSubTab === 'qibla_mosques'
              ? 'bg-[#14532D] text-white shadow-xs'
              : 'text-stone-700 hover:bg-stone-200/70'
          }`}
        >
          <span>القبلة والمساجد</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeSubTab === 'hajj_umrah'}
          onClick={() => setActiveSubTab('hajj_umrah')}
          className={`min-h-[38px] px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer whitespace-nowrap ${
            activeSubTab === 'hajj_umrah'
              ? 'bg-[#14532D] text-white shadow-xs'
              : 'text-stone-700 hover:bg-stone-200/70'
          }`}
        >
          <span>الحج والعمرة</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeSubTab === 'inheritance'}
          onClick={() => setActiveSubTab('inheritance')}
          className={`min-h-[38px] px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer whitespace-nowrap ${
            activeSubTab === 'inheritance'
              ? 'bg-[#14532D] text-white shadow-xs'
              : 'text-stone-700 hover:bg-stone-200/70'
          }`}
        >
          <span>الزكاة والمواريث</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeSubTab === 'hijri_sources'}
          onClick={() => setActiveSubTab('hijri_sources')}
          className={`min-h-[38px] px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer whitespace-nowrap ${
            activeSubTab === 'hijri_sources'
              ? 'bg-[#14532D] text-white shadow-xs'
              : 'text-stone-700 hover:bg-stone-200/70'
          }`}
        >
          <span>التقويم والمصادر</span>
        </button>
      </div>

      {/* =====================================================================
          SUB-TAB 1: QIBLA COMPASS & NEARBY MOSQUES FINDER
         ===================================================================== */}
      {activeSubTab === 'qibla_mosques' && (
        <div
          className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch"
          data-testid="qibla-mosques-section"
        >
          {/* Qibla Compass Card (5 cols) */}
          <section
            aria-labelledby="qibla-compass-heading"
            className="lg:col-span-5 bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-3.5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
              <div>
                <h2
                  id="qibla-compass-heading"
                  className="font-display text-base sm:text-lg font-bold text-stone-900"
                >
                  اتجاه القبلة — {selectedCity.nameAr}
                </h2>
                <span className="text-[11px] text-stone-500">
                  إحداثيات موقعك: {selectedCity.latitude.toFixed(2)}° ش ·{' '}
                  {selectedCity.longitude.toFixed(2)}° ق
                </span>
              </div>

              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                <select
                  aria-label="تغيير المدينة لحساب القبلة والمساجد"
                  data-testid="qibla-city-select"
                  value={selectedCity.id}
                  onChange={(e) => {
                    const found = EXTENDED_ARAB_AND_WORLD_CITIES.find(
                      (c) => c.id === e.target.value
                    );
                    if (found) {
                      onSelectCity(found);
                      setQiblaGeoStatus('');
                    }
                  }}
                  className="flex-1 sm:flex-initial min-w-0 min-h-[34px] px-2.5 py-1 text-xs font-semibold bg-[#FBF9F5] border border-stone-300 rounded-xl text-stone-800 truncate"
                >
                  {!EXTENDED_ARAB_AND_WORLD_CITIES.some(
                    (c) => c.id === selectedCity.id
                  ) && (
                    <option value={selectedCity.id}>
                      موقعي: {selectedCity.nameAr} — {selectedCity.countryAr}
                    </option>
                  )}
                  {EXTENDED_ARAB_AND_WORLD_CITIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nameAr} — {c.countryAr}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  data-testid="qibla-detect-location-btn"
                  onClick={handleDetectLocationForQibla}
                  disabled={isLocatingQibla}
                  className="min-h-[34px] px-2.5 py-1 rounded-xl bg-[#14532D] hover:bg-[#14532D]/90 text-white text-xs font-semibold flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Navigation
                    className={`w-3.5 h-3.5 ${isLocatingQibla ? 'animate-spin' : ''}`}
                  />
                  <span>{isLocatingQibla ? 'جاري التحديد...' : 'موقعي'}</span>
                </button>
              </div>
            </div>

            {qiblaGeoStatus && (
              <p
                role="status"
                data-testid="qibla-geo-status"
                className="text-xs font-medium text-[#14532D] bg-[#14532D]/10 border border-[#14532D]/25 px-3 py-1.5 rounded-xl"
              >
                {qiblaGeoStatus}
              </p>
            )}

            {/* Live Alignment Guidance Banner */}
            <div
              data-testid="qibla-alignment-banner"
              className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 transition-colors ${
                alignment.isAligned
                  ? 'bg-[#14532D] text-white border-[#14532D]'
                  : 'bg-[#FBF9F5] text-stone-800 border-stone-200'
              }`}
            >
              <span>{alignment.guidanceTextAr}</span>
              {alignment.isAligned && (
                <span className="px-2 py-0.5 rounded-md bg-white/20 text-[#FDE68A] text-[11px] flex items-center gap-1 whitespace-nowrap shrink-0">
                  <Check className="w-3.5 h-3.5" />
                  <span>مطابق للقبلة</span>
                </span>
              )}
            </div>

            {/* Interactive SVG Architectural Compass Dial */}
            <div className="flex flex-col items-center justify-center py-1">
              {/* Top Phone / User Facing Marker */}
              <div className="flex flex-col items-center mb-1">
                <span className="text-[10px] font-bold text-[#78350F]">
                  اتجاهك الأمامي ({compassHeading}°)
                </span>
              </div>

              <div className="relative w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center">
                <svg
                  viewBox="0 0 260 260"
                  className="w-full h-full"
                  role="img"
                  aria-label={`مؤشر اتجاه القبلة لمدينة ${selectedCity.nameAr} بزاوية ${qiblaAngle} درجة من الشمال الحقيقي`}
                >
                  {/* Outer Stationary Bezel */}
                  <circle
                    cx="130"
                    cy="130"
                    r="122"
                    fill="#FBF9F5"
                    stroke={alignment.isAligned ? '#14532D' : '#D6CEBE'}
                    strokeWidth={alignment.isAligned ? '3.5' : '2'}
                  />
                  {/* Fixed Top Reference Triangle on Outer Bezel */}
                  <polygon points="130,4 125,13 135,13" fill="#78350F" />

                  {/* Rotating Compass Rose Dial (rotates by -compassHeading so North matches real world) */}
                  <g transform={`rotate(${-compassHeading} 130 130)`}>
                    <circle
                      cx="130"
                      cy="130"
                      r="96"
                      fill="none"
                      stroke="#E7E5E4"
                      strokeWidth="1"
                      strokeDasharray="3 3"
                    />
                    {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(
                      (deg) => (
                        <line
                          key={deg}
                          x1="130"
                          y1="14"
                          x2="130"
                          y2={deg % 90 === 0 ? '26' : '20'}
                          stroke={
                            deg === 0
                              ? '#991B1B'
                              : deg % 90 === 0
                              ? '#78350F'
                              : '#A8A29E'
                          }
                          strokeWidth={deg % 90 === 0 ? '2.2' : '1.2'}
                          transform={`rotate(${deg} 130 130)`}
                        />
                      )
                    )}
                    {/* Upright Cardinal Labels on Inner Ring (r=68) that orbit with -compassHeading while staying horizontal */}
                  </g>
                  {[
                    { label: 'شمال', deg: 0, isNorth: true },
                    { label: 'شرق', deg: 90, isNorth: false },
                    { label: 'جنوب', deg: 180, isNorth: false },
                    { label: 'غرب', deg: 270, isNorth: false },
                  ].map((dir) => {
                    const rad = ((dir.deg - compassHeading) * Math.PI) / 180;
                    const x = 130 + 68 * Math.sin(rad);
                    const y = 130 - 68 * Math.cos(rad) + 4;
                    return (
                      <text
                        key={dir.deg}
                        x={x}
                        y={y}
                        textAnchor="middle"
                        className={
                          dir.isNorth
                            ? 'text-[11px] font-bold fill-red-800'
                            : 'text-[10px] font-bold fill-stone-600'
                        }
                      >
                        {dir.label}
                      </text>
                    );
                  })}

                  {/* Rotating Qibla Pointer & Holy Kaaba Emblem (rotates by relativePointerDeg = qiblaAngle - compassHeading) */}
                  <g
                    data-testid="qibla-compass-needle"
                    transform={`rotate(${alignment.relativePointerDeg} 130 130)`}
                  >
                    <line
                      x1="130"
                      y1="130"
                      x2="130"
                      y2="46"
                      stroke="#14532D"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />
                    <polygon points="130,35 122,51 138,51" fill="#14532D" />
                    {/* Kaaba Icon on Outer Ring (y=16..32) */}
                    <rect
                      x="122"
                      y="17"
                      width="16"
                      height="16"
                      rx="2.5"
                      fill="#1C1917"
                      stroke="#FDE68A"
                      strokeWidth="1.4"
                    />
                    <line
                      x1="122"
                      y1="22.5"
                      x2="138"
                      y2="22.5"
                      stroke="#F59E0B"
                      strokeWidth="2.2"
                    />
                  </g>

                  <circle cx="130" cy="130" r="6.5" fill="#78350F" />
                  <circle cx="130" cy="130" r="2.5" fill="#FBF9F5" />
                </svg>
              </div>
            </div>

            {/* Live Sensor Activation + Interactive Heading Calibration */}
            <div className="bg-[#FBF9F5] border border-stone-200 rounded-xl p-3 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  data-testid="toggle-live-compass-sensor-btn"
                  onClick={handleToggleLiveCompassSensor}
                  className={`min-h-[32px] px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    sensorActive
                      ? 'bg-[#14532D] text-white'
                      : 'bg-white border border-stone-300 text-stone-800 hover:bg-stone-100'
                  }`}
                >
                  <Compass className="w-3.5 h-3.5 text-[#78350F]" />
                  <span>
                    {sensorActive
                      ? 'إيقاف حساس البوصلة الحي'
                      : 'تفعيل البوصلة الحية (حساس الهاتف)'}
                  </span>
                </button>

                <button
                  type="button"
                  data-testid="align-to-qibla-btn"
                  onClick={() => setCompassHeading(Math.round(qiblaAngle))}
                  className="min-h-[32px] px-2.5 py-1 rounded-lg bg-[#14532D]/10 hover:bg-[#14532D]/20 text-[#14532D] text-xs font-semibold cursor-pointer"
                >
                  محاذاة نحو القبلة ({Math.round(qiblaAngle)}°)
                </button>
              </div>

              {sensorStatusAr && (
                <p className="text-[11px] text-stone-600">{sensorStatusAr}</p>
              )}

              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-stone-600">
                  <label htmlFor="compass-heading-slider" className="font-semibold">
                    تدوير اتجاه الوقوف الحالي يدوياً:
                  </label>
                  <span className="font-tabular font-bold text-stone-900">
                    {compassHeading}° ({getCardinalDirectionAr(compassHeading)})
                  </span>
                </div>
                <input
                  id="compass-heading-slider"
                  data-testid="compass-heading-slider"
                  type="range"
                  min={0}
                  max={359}
                  value={compassHeading}
                  onChange={(e) => setCompassHeading(Number(e.target.value))}
                  className="w-full accent-[#14532D] cursor-pointer h-1.5"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-stone-100 text-center">
              <div>
                <span className="text-[11px] text-stone-500 block">
                  زاوية القبلة من الشمال
                </span>
                <span
                  className="font-tabular text-base font-bold text-[#14532D] mt-0.5 block"
                  data-testid="qibla-view-angle"
                >
                  {qiblaAngle}°
                </span>
              </div>
              <div>
                <span className="text-[11px] text-stone-500 block">
                  الجهة الجغرافية
                </span>
                <span className="text-xs font-bold text-stone-900 mt-1 block">
                  {cardinalAr}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-stone-500 block">
                  المسافة للكعبة
                </span>
                <span className="font-tabular text-base font-bold text-[#78350F] mt-0.5 block">
                  {distanceKm.toLocaleString('en-US')} كم
                </span>
              </div>
            </div>
          </section>

          {/* Interactive Nearby Mosques Map & Turn-by-Turn Navigation (7 cols) */}
          <NearbyMosquesMap
            selectedCity={selectedCity}
            onDetectLocation={handleDetectLocationForQibla}
            isLocating={isLocatingQibla}
          />
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 2: HAJJ & UMRAH MUTAWIF (مطوّف الحج والعمرة التفاعلي)
         ===================================================================== */}
      {activeSubTab === 'hajj_umrah' && (
        <div
          className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start"
          data-testid="hajj-umrah-section"
        >
          {/* Left 6 Cols: Interactive 7-Lap Tawaf & Sa'i Counter */}
          <section className="lg:col-span-6 bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="border-b border-stone-100 pb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-base sm:text-lg font-bold text-stone-900">
                عدّاد أشواط الطواف والسعي (٧ أشواط)
              </h2>
              <button
                type="button"
                onClick={() => setCurrentLap(1)}
                className="text-xs text-stone-600 hover:text-stone-900 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>البدء من ١</span>
              </button>
            </div>

            {/* Switch Tawaf vs Sa'i */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#F4EFE6] border border-stone-200 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setRitualType('tawaf');
                  setCurrentLap(1);
                }}
                className={`min-h-[36px] py-1.5 px-3 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  ritualType === 'tawaf'
                    ? 'bg-[#14532D] text-white'
                    : 'text-stone-700 hover:bg-stone-200/70'
                }`}
              >
                الطواف بالبيت الحرام
              </button>
              <button
                type="button"
                onClick={() => {
                  setRitualType('sai');
                  setCurrentLap(1);
                }}
                className={`min-h-[36px] py-1.5 px-3 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  ritualType === 'sai'
                    ? 'bg-[#14532D] text-white'
                    : 'text-stone-700 hover:bg-stone-200/70'
                }`}
              >
                السعي بين الصفا والمروة
              </button>
            </div>

            {/* 7 Laps Selector Pills */}
            <div className="grid grid-cols-7 gap-1.5">
              {[1, 2, 3, 4, 5, 6, 7].map((lap) => (
                <button
                  key={lap}
                  type="button"
                  data-testid={`lap-btn-${lap}`}
                  onClick={() => setCurrentLap(lap)}
                  className={`min-h-[38px] rounded-xl font-bold text-xs transition-colors cursor-pointer border ${
                    currentLap === lap
                      ? 'bg-[#14532D] text-white border-[#14532D]'
                      : lap < currentLap
                      ? 'bg-[#14532D]/15 text-[#14532D] border-[#14532D]/30'
                      : 'bg-[#FBF9F5] text-stone-700 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  شوط {toArabicNumerals(lap)}
                </button>
              ))}
            </div>

            {/* Active Lap Details (No Nested Cards) */}
            <div className="pt-2 border-t border-stone-100 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3
                  data-testid="active-lap-title"
                  className="font-display text-base font-bold text-stone-900"
                >
                  {currentLapInfo.titleAr}
                </h3>
                <span className="text-xs font-semibold text-[#14532D]">
                  {currentLapInfo.routeAr} ({toArabicNumerals(currentLap)} / ٧)
                </span>
              </div>

              <p className="font-quran text-xl sm:text-2xl text-stone-900 leading-loose text-right py-1">
                «{currentLapInfo.duaTextAr}»
              </p>

              <p className="text-xs text-stone-600 leading-relaxed pt-2 border-t border-stone-100">
                <strong className="text-[#78350F]">السنة في هذا الشوط: </strong>
                {currentLapInfo.sunnahActionAr}
              </p>

              <div className="flex items-center justify-between gap-2 pt-2">
                <button
                  type="button"
                  disabled={currentLap <= 1}
                  onClick={() => setCurrentLap((l) => Math.max(1, l - 1))}
                  className="min-h-[38px] px-4 py-1.5 rounded-xl bg-[#FBF9F5] border border-stone-300 text-xs font-semibold text-stone-700 disabled:opacity-40 cursor-pointer"
                >
                  الشوط السابق
                </button>
                <button
                  type="button"
                  data-testid="next-lap-btn"
                  onClick={() =>
                    setCurrentLap((l) => (l < 7 ? l + 1 : 1))
                  }
                  className="flex-1 min-h-[38px] px-4 py-1.5 rounded-xl bg-[#14532D] text-white text-xs font-semibold hover:bg-[#14532D]/90 cursor-pointer"
                >
                  {currentLap < 7
                    ? `إتمام الشوط ${toArabicNumerals(currentLap)} والانتقال للشوط ${toArabicNumerals(
                        currentLap + 1
                      )}`
                    : 'تمت الأشواط السبعة بحمد الله (إعادة من الأول)'}
                </button>
              </div>
            </div>
          </section>

          {/* Right 6 Cols: Interactive Checklist for Umrah, Ihram Prohibitions & Hajj Days */}
          <section className="lg:col-span-6 bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="border-b border-stone-100 pb-3">
              <h2 className="font-display text-base sm:text-lg font-bold text-stone-900">
                دليل المناسك ومحظورات الإحرام وأيام الحج
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: 'ALL', label: 'جميع المناسك' },
                  { id: 'umrah', label: 'خطوات العمرة' },
                  { id: 'ihram', label: 'محظورات الإحرام' },
                  { id: 'hajj_days', label: 'أيام الحج (٨-١٣ ذو الحجة)' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setManasikFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    manasikFilter === tab.id
                      ? 'bg-[#14532D] text-white'
                      : 'bg-[#F7F4EE] text-stone-700 hover:bg-stone-200/70'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="space-y-2.5 max-h-[430px] overflow-y-auto pr-1">
              {filteredManasikList.map((item) => {
                const isChecked = checkedManasikIds.includes(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => handleToggleManasikCheck(item.id)}
                    className={`p-3.5 rounded-xl border transition-colors cursor-pointer flex items-start gap-3 ${
                      isChecked
                        ? 'bg-[#14532D]/5 border-[#14532D]/40'
                        : 'bg-[#FBF9F5] border-stone-200'
                    }`}
                  >
                    <button
                      type="button"
                      aria-label={`تحديد ${item.titleAr}`}
                      className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center shrink-0 border ${
                        isChecked
                          ? 'bg-[#14532D] border-[#14532D] text-white'
                          : 'bg-white border-stone-300'
                      }`}
                    >
                      {isChecked && <Check className="w-3.5 h-3.5" />}
                    </button>

                    <div className="space-y-1 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-bold text-[#78350F]">
                          {item.dayBadgeAr} · {item.rulingTypeAr}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-stone-900">
                        {item.titleAr}
                      </h3>
                      <p className="text-xs text-stone-700 leading-relaxed">
                        {item.detailsAr}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 3: ZAKAT & ISLAMIC INHERITANCE CALCULATORS (حاسبة الزكاة والمواريث الشرعية)
         ===================================================================== */}
      {activeSubTab === 'inheritance' && (
        <div className="space-y-4">
          {/* Mode Toggle: Zakat Calculator vs Inheritance Calculator */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-white border border-stone-200 rounded-2xl p-3">
            <div>
              <h2 className="font-display text-base sm:text-lg font-bold text-stone-900">
                الحاسبات المالية الشرعية الموثّقة
              </h2>
              <p className="text-xs text-stone-600">
                حساب نصاب الزكاة وربع العشر وزكاة الفطر، وتقسيم المواريث الشرعية وفق كتاب الله وسنة رسوله ﷺ
              </p>
            </div>
            <div className="flex items-center gap-1.5 bg-[#F4EFE6] p-1 rounded-xl border border-stone-200">
              <button
                type="button"
                data-testid="switch-to-zakat-btn"
                onClick={() => setFinancialToolMode('zakat')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                  financialToolMode === 'zakat'
                    ? 'bg-[#14532D] text-white'
                    : 'text-stone-700 hover:text-stone-900'
                }`}
              >
                حاسبة الزكاة الشرعية
              </button>
              <button
                type="button"
                data-testid="switch-to-inheritance-btn"
                onClick={() => setFinancialToolMode('inheritance')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                  financialToolMode === 'inheritance'
                    ? 'bg-[#14532D] text-white'
                    : 'text-stone-700 hover:text-stone-900'
                }`}
              >
                حاسبة المواريث (الفرائض)
              </button>
            </div>
          </div>

          {financialToolMode === 'zakat' ? (
            <div
              className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start"
              data-testid="zakat-calculator-section"
            >
              {/* Left 6 Cols: Zakat Wealth & Gold/Silver Inputs */}
              <section className="lg:col-span-6 bg-white border border-stone-200 rounded-2xl p-4 sm:p-6 space-y-4">
                <div className="border-b border-stone-100 pb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-display text-base sm:text-lg font-bold text-stone-900">
                      بيانات الأموال والذهب وعروض التجارة
                    </h3>
                    <p className="text-xs text-stone-600 mt-0.5">
                      أدخل الأموال المدّخرة التي حال عليها الحول وأوزان الذهب غير المعدّ للزينة المعتادة (أو على القول بوجوبها)
                    </p>
                  </div>
                </div>

                {/* Standard & Year Type */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <span className="block text-xs font-semibold text-stone-700 mb-1">
                      معيار النصاب الشرعي:
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          setZakatInput((prev) => ({
                            ...prev,
                            nisabStandard: 'gold_85g',
                          }))
                        }
                        className={`py-1.5 px-2 rounded-xl text-xs font-semibold border cursor-pointer ${
                          zakatInput.nisabStandard === 'gold_85g'
                            ? 'bg-[#14532D] text-white border-[#14532D]'
                            : 'bg-[#FBF9F5] text-stone-700 border-stone-200'
                        }`}
                      >
                        نصاب الذهب (٨٥جم)
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setZakatInput((prev) => ({
                            ...prev,
                            nisabStandard: 'silver_595g',
                          }))
                        }
                        className={`py-1.5 px-2 rounded-xl text-xs font-semibold border cursor-pointer ${
                          zakatInput.nisabStandard === 'silver_595g'
                            ? 'bg-[#14532D] text-white border-[#14532D]'
                            : 'bg-[#FBF9F5] text-stone-700 border-stone-200'
                        }`}
                      >
                        نصاب الفضة (٥٩٥جم)
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="block text-xs font-semibold text-stone-700 mb-1">
                      نوع الحَوْل (السنة الزكوية):
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          setZakatInput((prev) => ({
                            ...prev,
                            calendarYearType: 'hijri_lunar',
                          }))
                        }
                        className={`py-1.5 px-2 rounded-xl text-xs font-semibold border cursor-pointer ${
                          zakatInput.calendarYearType === 'hijri_lunar'
                            ? 'bg-[#78350F] text-white border-[#78350F]'
                            : 'bg-[#FBF9F5] text-stone-700 border-stone-200'
                        }`}
                      >
                        هجري قمري (٢.٥٪)
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setZakatInput((prev) => ({
                            ...prev,
                            calendarYearType: 'gregorian_solar',
                          }))
                        }
                        className={`py-1.5 px-2 rounded-xl text-xs font-semibold border cursor-pointer ${
                          zakatInput.calendarYearType === 'gregorian_solar'
                            ? 'bg-[#78350F] text-white border-[#78350F]'
                            : 'bg-[#FBF9F5] text-stone-700 border-stone-200'
                        }`}
                      >
                        ميلادي شمسي (٢.٥٧٧٪)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Cash, Trade Goods, Debts */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label
                      htmlFor="zakat-cash-input"
                      className="block text-xs font-semibold text-stone-700 mb-1"
                    >
                      النقد والأرصدة البنكية
                    </label>
                    <input
                      id="zakat-cash-input"
                      type="number"
                      min={0}
                      value={zakatInput.cashAndSavings}
                      onChange={(e) =>
                        setZakatInput((prev) => ({
                          ...prev,
                          cashAndSavings: Math.max(0, Number(e.target.value) || 0),
                        }))
                      }
                      className="w-full min-h-[38px] px-3 py-1 text-xs font-tabular tabular-nums bg-[#FBF9F5] border border-stone-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="zakat-trade-input"
                      className="block text-xs font-semibold text-stone-700 mb-1"
                    >
                      عروض التجارة والأسهم
                    </label>
                    <input
                      id="zakat-trade-input"
                      type="number"
                      min={0}
                      value={zakatInput.tradeGoodsAndStocks}
                      onChange={(e) =>
                        setZakatInput((prev) => ({
                          ...prev,
                          tradeGoodsAndStocks: Math.max(0, Number(e.target.value) || 0),
                        }))
                      }
                      className="w-full min-h-[38px] px-3 py-1 text-xs font-tabular tabular-nums bg-[#FBF9F5] border border-stone-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="zakat-debts-input"
                      className="block text-xs font-semibold text-stone-700 mb-1"
                    >
                      الديون الحالّة (تُخصم)
                    </label>
                    <input
                      id="zakat-debts-input"
                      type="number"
                      min={0}
                      value={zakatInput.immediateDebts}
                      onChange={(e) =>
                        setZakatInput((prev) => ({
                          ...prev,
                          immediateDebts: Math.max(0, Number(e.target.value) || 0),
                        }))
                      }
                      className="w-full min-h-[38px] px-3 py-1 text-xs font-tabular tabular-nums bg-[#FBF9F5] border border-stone-300 rounded-xl"
                    />
                  </div>
                </div>

                {/* Gold Grams by Karat (24K, 21K, 18K) */}
                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label
                      htmlFor="zakat-g24-input"
                      className="block text-xs font-semibold text-stone-700 mb-1"
                    >
                      ذهب عيار ٢٤ (جرام)
                    </label>
                    <input
                      id="zakat-g24-input"
                      type="number"
                      min={0}
                      value={zakatInput.goldGrams24K}
                      onChange={(e) =>
                        setZakatInput((prev) => ({
                          ...prev,
                          goldGrams24K: Math.max(0, Number(e.target.value) || 0),
                        }))
                      }
                      className="w-full min-h-[38px] px-3 py-1 text-xs font-tabular tabular-nums bg-[#FBF9F5] border border-stone-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="zakat-g21-input"
                      className="block text-xs font-semibold text-stone-700 mb-1"
                    >
                      ذهب عيار ٢١ (جرام)
                    </label>
                    <input
                      id="zakat-g21-input"
                      type="number"
                      min={0}
                      value={zakatInput.goldGrams21K}
                      onChange={(e) =>
                        setZakatInput((prev) => ({
                          ...prev,
                          goldGrams21K: Math.max(0, Number(e.target.value) || 0),
                        }))
                      }
                      className="w-full min-h-[38px] px-3 py-1 text-xs font-tabular tabular-nums bg-[#FBF9F5] border border-stone-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="zakat-g18-input"
                      className="block text-xs font-semibold text-stone-700 mb-1"
                    >
                      ذهب عيار ١٨ (جرام)
                    </label>
                    <input
                      id="zakat-g18-input"
                      type="number"
                      min={0}
                      value={zakatInput.goldGrams18K}
                      onChange={(e) =>
                        setZakatInput((prev) => ({
                          ...prev,
                          goldGrams18K: Math.max(0, Number(e.target.value) || 0),
                        }))
                      }
                      className="w-full min-h-[38px] px-3 py-1 text-xs font-tabular tabular-nums bg-[#FBF9F5] border border-stone-300 rounded-xl"
                    />
                  </div>
                </div>

                {/* Gold & Silver Gram Prices + Zakat Al-Fitr Family Members */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-stone-100">
                  <div>
                    <label
                      htmlFor="gold-price-input"
                      className="block text-[11px] font-semibold text-stone-700 mb-1"
                    >
                      سعر جرام ذهب ٢٤
                    </label>
                    <input
                      id="gold-price-input"
                      type="number"
                      min={1}
                      value={zakatInput.goldPricePerGram24K}
                      onChange={(e) =>
                        setZakatInput((prev) => ({
                          ...prev,
                          goldPricePerGram24K: Math.max(1, Number(e.target.value) || 1),
                        }))
                      }
                      className="w-full min-h-[36px] px-2.5 py-1 text-xs font-tabular tabular-nums bg-[#FBF9F5] border border-stone-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="silver-price-input"
                      className="block text-[11px] font-semibold text-stone-700 mb-1"
                    >
                      سعر جرام الفضة
                    </label>
                    <input
                      id="silver-price-input"
                      type="number"
                      min={0.5}
                      step="0.1"
                      value={zakatInput.silverPricePerGram}
                      onChange={(e) =>
                        setZakatInput((prev) => ({
                          ...prev,
                          silverPricePerGram: Math.max(0.5, Number(e.target.value) || 1),
                        }))
                      }
                      className="w-full min-h-[36px] px-2.5 py-1 text-xs font-tabular tabular-nums bg-[#FBF9F5] border border-stone-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="fitr-members-input"
                      className="block text-[11px] font-semibold text-stone-700 mb-1"
                    >
                      أفراد زكاة الفطر
                    </label>
                    <input
                      id="fitr-members-input"
                      type="number"
                      min={1}
                      max={50}
                      value={zakatInput.familyMembersCount}
                      onChange={(e) =>
                        setZakatInput((prev) => ({
                          ...prev,
                          familyMembersCount: Math.max(1, Number(e.target.value) || 1),
                        }))
                      }
                      className="w-full min-h-[36px] px-2.5 py-1 text-xs font-tabular tabular-nums bg-[#FBF9F5] border border-stone-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="fitr-cost-input"
                      className="block text-[11px] font-semibold text-stone-700 mb-1"
                    >
                      قيمة صاع الفطر للفرد
                    </label>
                    <input
                      id="fitr-cost-input"
                      type="number"
                      min={1}
                      value={zakatInput.fitrCostPerPerson}
                      onChange={(e) =>
                        setZakatInput((prev) => ({
                          ...prev,
                          fitrCostPerPerson: Math.max(1, Number(e.target.value) || 25),
                        }))
                      }
                      className="w-full min-h-[36px] px-2.5 py-1 text-xs font-tabular tabular-nums bg-[#FBF9F5] border border-stone-300 rounded-xl"
                    />
                  </div>
                </div>
              </section>

              {/* Right 6 Cols: Zakat Output Summary & Breakdown */}
              <section className="lg:col-span-6 bg-white border border-stone-200 rounded-2xl p-4 sm:p-6 space-y-4">
                <div className="border-b border-stone-100 pb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span
                      className={`text-xs font-bold block ${
                        zakatResult.isNisabReached
                          ? 'text-[#14532D]'
                          : 'text-[#78350F]'
                      }`}
                    >
                      {zakatResult.isNisabReached
                        ? 'بلغ المال النصاب الشرعي — تجب فيه الزكاة'
                        : 'لم يبلغ النصاب الشرعي — لا زكاة واجبة'}
                    </span>
                    <h3 className="font-display text-base sm:text-lg font-bold text-stone-900">
                      مقدار الزكاة الواجبة وتفصيل الوعاء الزكوي
                    </h3>
                  </div>

                  <div className="px-3.5 py-1.5 rounded-xl bg-[#14532D] text-white text-right">
                    <span className="text-[10px] text-[#FDE68A] block">
                      الزكاة الواجبة إخراجها:
                    </span>
                    <span
                      data-testid="zakat-total-due-amount"
                      className="font-tabular tabular-nums text-base sm:text-lg font-bold"
                    >
                      {zakatResult.totalZakatDueAmount.toLocaleString('en-US')}{' '}
                      {currencyLabel}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-stone-700 leading-relaxed">
                  {zakatResult.rulingSummaryAr}
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  <div className="p-3 rounded-xl bg-[#FCF9F2] border border-[#E5DAC3]">
                    <span className="text-[11px] text-stone-600 block">
                      صافي الوعاء الزكوي
                    </span>
                    <span className="font-tabular tabular-nums text-sm font-bold text-stone-900">
                      {zakatResult.netZakatableWealth.toLocaleString('en-US')}{' '}
                      {currencyLabel}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#FCF9F2] border border-[#E5DAC3]">
                    <span className="text-[11px] text-stone-600 block">
                      قيمة النصاب المعتمد
                    </span>
                    <span className="font-tabular tabular-nums text-sm font-bold text-[#78350F]">
                      {zakatResult.activeNisabThresholdAmount.toLocaleString('en-US')}{' '}
                      {currencyLabel}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#FCF9F2] border border-[#E5DAC3]">
                    <span className="text-[11px] text-stone-600 block">
                      الذهب الصافي المكافئ (٢٤)
                    </span>
                    <span className="font-tabular tabular-nums text-sm font-bold text-stone-900">
                      {zakatResult.pureGoldEquivalentGrams} جم (
                      {zakatResult.goldValuationAmount.toLocaleString('en-US')})
                    </span>
                  </div>
                </div>

                {/* Zakat Al-Fitr Summary Box */}
                <div className="p-3.5 rounded-xl bg-[#F7F4EE] border border-stone-200 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-stone-900 block">
                      زكاة الفطر للأسرة ({toArabicNumerals(zakatInput.familyMembersCount)} أفراد)
                    </span>
                    <span className="text-[11px] text-stone-600">
                      المقدار النبوي بالوزن: <strong>{zakatResult.zakatAlFitrTotalKg} كجم</strong> من غالب قوت البلد (صاع = ٢.٥ كجم للفرد)
                    </span>
                  </div>
                  <div className="px-3 py-1 rounded-lg bg-white border border-stone-300 font-tabular tabular-nums text-xs font-bold text-[#14532D]">
                    نقداً: {zakatResult.zakatAlFitrTotalAmount.toLocaleString('en-US')}{' '}
                    {currencyLabel}
                  </div>
                </div>

                <p className="font-quran text-sm text-[#78350F] bg-[#FCF9F2] border border-[#E5DAC3] rounded-xl p-3 leading-relaxed">
                  {zakatResult.shariahEvidenceAr}
                </p>
              </section>
            </div>
          ) : (
            <div
              className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start"
              data-testid="inheritance-calculator-section"
            >
              {/* Left 5 Cols: Estate & Heirs Inputs */}
              <section className="lg:col-span-5 bg-white border border-stone-200 rounded-2xl p-4 sm:p-6 space-y-4">
                <div className="border-b border-stone-100 pb-3">
                  <h2 className="font-display text-lg sm:text-xl font-bold text-stone-900">
                    بيانات التركة والورثة الشرعيين
                  </h2>
              <p className="text-xs text-stone-600 mt-0.5">
                أدخل صافي التركة بعد سداد الديون وتنفيذ الوصية المشروعة، وحدد الورثة الأحياء
              </p>
            </div>

            {/* Quick Preset Cases */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-stone-700 block">
                أمثلة فقهية جاهزة للمعاينة:
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    setInheritanceInput({
                      estateAmount: 120000,
                      deceasedGender: 'female',
                      hasHusband: true,
                      wivesCount: 0,
                      hasFather: false,
                      hasMother: false,
                      sonsCount: 1,
                      daughtersCount: 1,
                      fullBrothersCount: 0,
                      fullSistersCount: 0,
                    })
                  }
                  className="px-2.5 py-1 rounded-lg bg-[#F7F4EE] border border-stone-200 text-xs text-stone-800 hover:bg-stone-200 cursor-pointer"
                >
                  زوج وابن وبنت
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setInheritanceInput({
                      estateAmount: 240000,
                      deceasedGender: 'male',
                      hasHusband: false,
                      wivesCount: 1,
                      hasFather: true,
                      hasMother: true,
                      sonsCount: 2,
                      daughtersCount: 1,
                      fullBrothersCount: 0,
                      fullSistersCount: 0,
                    })
                  }
                  className="px-2.5 py-1 rounded-lg bg-[#F7F4EE] border border-stone-200 text-xs text-stone-800 hover:bg-stone-200 cursor-pointer"
                >
                  زوجة وأب وأم وابنان وبنت
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setInheritanceInput({
                      estateAmount: 70000,
                      deceasedGender: 'female',
                      hasHusband: true,
                      wivesCount: 0,
                      hasFather: false,
                      hasMother: false,
                      sonsCount: 0,
                      daughtersCount: 0,
                      fullBrothersCount: 0,
                      fullSistersCount: 2,
                    })
                  }
                  className="px-2.5 py-1 rounded-lg bg-[#F7F4EE] border border-stone-200 text-xs text-stone-800 hover:bg-stone-200 cursor-pointer"
                >
                  مسألة عَوْل (زوج وأختان)
                </button>
              </div>
            </div>

            {/* Estate Value & Currency */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="col-span-2">
                <label
                  htmlFor="estate-amount-input"
                  className="block text-xs font-semibold text-stone-700 mb-1"
                >
                  قيمة التركة الصافية
                </label>
                <input
                  id="estate-amount-input"
                  type="number"
                  min={0}
                  step="100"
                  value={inheritanceInput.estateAmount}
                  onChange={(e) =>
                    setInheritanceInput((prev) => ({
                      ...prev,
                      estateAmount: Math.max(0, Number(e.target.value) || 0),
                    }))
                  }
                  className="w-full min-h-[40px] px-3 py-1.5 text-xs font-tabular tabular-nums bg-[#FBF9F5] border border-stone-300 rounded-xl"
                />
              </div>
              <div>
                <label
                  htmlFor="estate-currency-input"
                  className="block text-xs font-semibold text-stone-700 mb-1"
                >
                  العملة
                </label>
                <input
                  id="estate-currency-input"
                  type="text"
                  value={currencyLabel}
                  onChange={(e) => setCurrencyLabel(e.target.value)}
                  className="w-full min-h-[40px] px-3 py-1.5 text-xs bg-[#FBF9F5] border border-stone-300 rounded-xl"
                />
              </div>
            </div>

            {/* Deceased Gender */}
            <div>
              <span className="block text-xs font-semibold text-stone-700 mb-1">
                جنس المُتوفّى:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setInheritanceInput((prev) => ({
                      ...prev,
                      deceasedGender: 'male',
                      hasHusband: false,
                    }))
                  }
                  className={`min-h-[38px] rounded-xl text-xs font-semibold border cursor-pointer ${
                    inheritanceInput.deceasedGender === 'male'
                      ? 'bg-[#14532D] text-white border-[#14532D]'
                      : 'bg-[#FBF9F5] text-stone-700 border-stone-200'
                  }`}
                >
                  مُتوفّى (ذكر)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setInheritanceInput((prev) => ({
                      ...prev,
                      deceasedGender: 'female',
                      wivesCount: 0,
                    }))
                  }
                  className={`min-h-[38px] rounded-xl text-xs font-semibold border cursor-pointer ${
                    inheritanceInput.deceasedGender === 'female'
                      ? 'bg-[#14532D] text-white border-[#14532D]'
                      : 'bg-[#FBF9F5] text-stone-700 border-stone-200'
                  }`}
                >
                  مُتوفّاة (أنثى)
                </button>
              </div>
            </div>

            {/* Spouse & Parents Checkboxes */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {inheritanceInput.deceasedGender === 'female' ? (
                <label className="flex items-center gap-2 p-2.5 rounded-xl bg-[#FBF9F5] border border-stone-200 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inheritanceInput.hasHusband}
                    onChange={(e) =>
                      setInheritanceInput((prev) => ({
                        ...prev,
                        hasHusband: e.target.checked,
                      }))
                    }
                    className="accent-[#14532D]"
                  />
                  <span>الزوج حيّ</span>
                </label>
              ) : (
                <div>
                  <label
                    htmlFor="wives-count-select"
                    className="block text-[11px] font-semibold text-stone-700 mb-0.5"
                  >
                    عدد الزوجات
                  </label>
                  <select
                    id="wives-count-select"
                    value={inheritanceInput.wivesCount}
                    onChange={(e) =>
                      setInheritanceInput((prev) => ({
                        ...prev,
                        wivesCount: Number(e.target.value),
                      }))
                    }
                    className="w-full min-h-[36px] px-2 py-1 text-xs bg-[#FBF9F5] border border-stone-300 rounded-lg"
                  >
                    <option value={0}>لا يوجد (٠)</option>
                    <option value={1}>زوجة واحدة (١)</option>
                    <option value={2}>زوجتان (٢)</option>
                    <option value={3}>٣ زوجات</option>
                    <option value={4}>٤ زوجات</option>
                  </select>
                </div>
              )}

              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-[#FBF9F5] border border-stone-200 text-xs font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={inheritanceInput.hasFather}
                  onChange={(e) =>
                    setInheritanceInput((prev) => ({
                      ...prev,
                      hasFather: e.target.checked,
                    }))
                  }
                  className="accent-[#14532D]"
                />
                <span>الأب حيّ</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-[#FBF9F5] border border-stone-200 text-xs font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={inheritanceInput.hasMother}
                  onChange={(e) =>
                    setInheritanceInput((prev) => ({
                      ...prev,
                      hasMother: e.target.checked,
                    }))
                  }
                  className="accent-[#14532D]"
                />
                <span>الأم حيّة</span>
              </label>
            </div>

            {/* Descendants & Siblings Counters */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label
                  htmlFor="sons-count"
                  className="block text-xs font-semibold text-stone-700 mb-1"
                >
                  عدد الأبناء الذكور
                </label>
                <input
                  id="sons-count"
                  type="number"
                  min={0}
                  max={20}
                  value={inheritanceInput.sonsCount}
                  onChange={(e) =>
                    setInheritanceInput((prev) => ({
                      ...prev,
                      sonsCount: Math.max(0, Number(e.target.value) || 0),
                    }))
                  }
                  className="w-full min-h-[38px] px-3 py-1 text-xs font-tabular tabular-nums bg-[#FBF9F5] border border-stone-300 rounded-xl"
                />
              </div>
              <div>
                <label
                  htmlFor="daughters-count"
                  className="block text-xs font-semibold text-stone-700 mb-1"
                >
                  عدد البنات
                </label>
                <input
                  id="daughters-count"
                  type="number"
                  min={0}
                  max={20}
                  value={inheritanceInput.daughtersCount}
                  onChange={(e) =>
                    setInheritanceInput((prev) => ({
                      ...prev,
                      daughtersCount: Math.max(0, Number(e.target.value) || 0),
                    }))
                  }
                  className="w-full min-h-[38px] px-3 py-1 text-xs font-tabular tabular-nums bg-[#FBF9F5] border border-stone-300 rounded-xl"
                />
              </div>
              <div>
                <label
                  htmlFor="brothers-count"
                  className="block text-xs font-semibold text-stone-700 mb-1"
                >
                  الإخوة الأشقاء
                </label>
                <input
                  id="brothers-count"
                  type="number"
                  min={0}
                  max={20}
                  value={inheritanceInput.fullBrothersCount}
                  onChange={(e) =>
                    setInheritanceInput((prev) => ({
                      ...prev,
                      fullBrothersCount: Math.max(0, Number(e.target.value) || 0),
                    }))
                  }
                  className="w-full min-h-[38px] px-3 py-1 text-xs font-tabular tabular-nums bg-[#FBF9F5] border border-stone-300 rounded-xl"
                />
              </div>
              <div>
                <label
                  htmlFor="sisters-count"
                  className="block text-xs font-semibold text-stone-700 mb-1"
                >
                  الأخوات الشقيقات
                </label>
                <input
                  id="sisters-count"
                  type="number"
                  min={0}
                  max={20}
                  value={inheritanceInput.fullSistersCount}
                  onChange={(e) =>
                    setInheritanceInput((prev) => ({
                      ...prev,
                      fullSistersCount: Math.max(0, Number(e.target.value) || 0),
                    }))
                  }
                  className="w-full min-h-[38px] px-3 py-1 text-xs font-tabular tabular-nums bg-[#FBF9F5] border border-stone-300 rounded-xl"
                />
              </div>
            </div>
          </section>

          {/* Right 7 Cols: Fara'id Shares Breakdown & Quranic Evidence */}
          <section className="lg:col-span-7 bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="border-b border-stone-100 pb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-xs font-semibold text-[#14532D] block">
                  {inheritanceResult.caseTypeAr}
                </span>
                <h2 className="font-display text-base sm:text-lg font-bold text-stone-900">
                  توزيع الأنصبة الشرعية
                </h2>
              </div>
              <div className="px-3 py-1 rounded-xl bg-[#F7F4EE] border border-stone-200 text-xs font-tabular tabular-nums font-bold text-stone-900">
                التركة: {inheritanceResult.estateAmount.toLocaleString('en-US')} {currencyLabel}
              </div>
            </div>

            <p className="text-xs text-stone-600">
              {inheritanceResult.summaryNoteAr}
            </p>

            {/* Shares Cards */}
            <div className="space-y-3">
              {inheritanceResult.shares.map((share) => (
                <div
                  key={share.id}
                  data-testid={`heir-share-${share.id}`}
                  className="p-4 rounded-xl bg-[#FCF9F2] border border-[#E5DAC3] space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-[#14532D]">
                        {share.shareTypeAr} · {share.fractionLabelAr}
                      </span>
                      <h3 className="text-base font-bold text-stone-900">
                        {share.heirTitleAr}
                      </h3>
                    </div>

                    <div className="text-left">
                      <div className="font-tabular tabular-nums text-base font-bold text-[#14532D]">
                        {Math.round(share.totalAmount).toLocaleString('en-US')}{' '}
                        {currencyLabel}
                      </div>
                      {share.count > 1 && (
                        <div className="text-[11px] font-tabular tabular-nums text-stone-600">
                          لكل فرد:{' '}
                          {Math.round(share.amountPerPerson).toLocaleString(
                            'en-US'
                          )}{' '}
                          {currencyLabel}
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-stone-700">{share.explanationAr}</p>
                  <p className="font-quran text-sm text-[#78350F] pt-2 border-t border-[#E5DAC3]/80">
                    {share.quranicEvidenceAr}
                  </p>
                </div>
              ))}

              {/* Blocked Heirs (المحجوبون) */}
              {inheritanceResult.blockedHeirs.map((b) => (
                <div
                  key={b.id}
                  className="p-3.5 rounded-xl bg-stone-100/80 border border-stone-200 space-y-1"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-stone-700">
                    <span>{b.heirTitleAr}</span>
                    <span className="text-red-800">{b.fractionLabelAr}</span>
                  </div>
                  <p className="text-xs text-stone-600">{b.explanationAr}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
          )}
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 4: HIJRI CALENDAR & ASTRONOMICAL SOURCES
         ===================================================================== */}
      {activeSubTab === 'hijri_sources' && (
        <div className="space-y-5" data-testid="hijri-sources-section">
          <section
            aria-labelledby="hijri-calendar-heading"
            className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3">
              <div>
                <h2
                  id="hijri-calendar-heading"
                  className="font-display text-base sm:text-lg font-bold text-stone-900"
                >
                  التقويم الهجري والمواسم الشرعية
                </h2>
                <p className="text-xs text-stone-600 mt-0.5">
                  التاريخ اليوم: <strong>{todayHijri.formattedAr}</strong>
                </p>
              </div>

              <div className="flex items-center gap-1 bg-[#F7F4EE] p-1 rounded-lg border border-stone-200">
                <span className="text-[11px] text-stone-600 px-2">
                  تعديل الهلال:
                </span>
                {[-2, -1, 0, 1, 2].map((adj) => (
                  <button
                    key={adj}
                    type="button"
                    onClick={() => onChangeHijriAdjustment(adj)}
                    className={`px-2 py-1 text-xs font-tabular rounded transition-colors cursor-pointer ${
                      hijriAdjustment === adj
                        ? 'bg-[#14532D] text-white font-bold'
                        : 'text-stone-700 hover:bg-stone-200'
                    }`}
                  >
                    {adj > 0 ? `+${adj}` : adj}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {ISLAMIC_OCCASIONS.map((occ) => (
                <div
                  key={occ.nameAr}
                  className="p-3 rounded-xl bg-[#FBF9F5] border border-stone-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-3"
                >
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-stone-900">
                      {occ.nameAr}
                    </h3>
                    <p className="text-[11px] text-stone-600 mt-0.5">
                      {occ.noteAr}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-[#78350F] whitespace-nowrap shrink-0">
                    {occ.hijriDateAr}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section
            aria-labelledby="sources-verification-heading"
            className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 space-y-4"
          >
            <h2
              id="sources-verification-heading"
              className="font-display text-base sm:text-lg font-bold text-stone-900 border-b border-stone-100 pb-3"
            >
              توثيق المصادر الشرعية والمعايير الفلكية
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <h3 className="text-sm font-bold text-[#14532D]">
                  ١. النص القرآني والتفسير
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  رسم مصحف المدينة النبوية (رواية حفص عن عاصم) الصادر عن مجمع الملك فهد لطباعة المصحف الشريف، مع التفسير الميسر.
                </p>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-sm font-bold text-[#78350F]">
                  ٢. تخريج الأحاديث والأذكار
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  أذكار الصباح والمساء والنوم والاستيقاظ والصلاة مقتبسة من كتاب «حصن المسلم من أذكار الكتاب والسنة».
                </p>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-sm font-bold text-[#14532D]">
                  ٣. المعايير الفلكية للمواقيت
                </h3>
                <ul className="text-[11px] text-stone-600 space-y-1">
                  {Object.values(CALCULATION_METHODS).map((m) => (
                    <li key={m.id}>
                      • <strong>{m.nameAr}:</strong> فجر {m.fajrAngle}° / عشاء{' '}
                      {m.ishaIntervalMinutes
                        ? `${toArabicNumerals(m.ishaIntervalMinutes)} دقيقة`
                        : `${m.ishaAngle}°`}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
