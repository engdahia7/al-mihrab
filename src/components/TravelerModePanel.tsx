import React, { useState, useMemo } from 'react';
import { CheckCircle2, MapPin } from 'lucide-react';
import {
  CityLocation,
  VERIFIED_CITIES,
  calculateAstronomicalPrayerTimes,
  toArabicNumerals,
} from '../utils/astronomy';
import { calculateTravelStatus } from '../utils/islamicFeatures';

interface TravelerModePanelProps {
  selectedCity: CityLocation;
  onSelectCity: (city: CityLocation) => void;
}

export const TravelerModePanel: React.FC<TravelerModePanelProps> = ({
  selectedCity,
  onSelectCity,
}) => {
  const [isTravelerActive, setIsTravelerActive] = useState<boolean>(true);
  const [originCityId, setOriginCityId] = useState<string>(selectedCity.id || 'makkah');
  const [destinationCityId, setDestinationCityId] = useState<string>(
    selectedCity.id === 'madinah' ? 'riyadh' : 'madinah'
  );

  const originCity = useMemo(
    () => VERIFIED_CITIES.find((c) => c.id === originCityId) || VERIFIED_CITIES[0],
    [originCityId]
  );

  const destinationCity = useMemo(
    () =>
      VERIFIED_CITIES.find((c) => c.id === destinationCityId) || VERIFIED_CITIES[1],
    [destinationCityId]
  );

  const travelStatus = useMemo(
    () => calculateTravelStatus(originCity, destinationCity),
    [originCity, destinationCity]
  );

  const destinationTimes = useMemo(() => {
    return calculateAstronomicalPrayerTimes(
      new Date(),
      destinationCity.latitude,
      destinationCity.longitude,
      destinationCity.timezoneOffsetHours,
      destinationCity.defaultMethod,
      'STANDARD'
    );
  }, [destinationCity]);

  return (
    <section
      aria-labelledby="traveler-mode-heading"
      data-testid="traveler-mode-panel"
      className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h3
            id="traveler-mode-heading"
            className="font-display text-base sm:text-lg font-bold text-stone-900"
          >
            أحكام السفر والقصر والجمع
          </h3>
          <span
            data-testid="travel-distance-km"
            className="font-tabular tabular-nums text-xs font-bold text-[#14532D]"
          >
            · المسافة: {toArabicNumerals(travelStatus.distanceKm)} كم
          </span>
        </div>

        <button
          type="button"
          data-testid="toggle-traveler-mode-btn"
          onClick={() => setIsTravelerActive((prev) => !prev)}
          aria-expanded={isTravelerActive}
          className="text-xs font-semibold text-stone-600 hover:text-stone-900 underline cursor-pointer"
        >
          {isTravelerActive ? 'طي التفاصيل' : 'عرض أحكام الركعات والجمع'}
        </button>
      </div>

      {/* Origin & Destination Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
        <div className="md:col-span-4">
          <label
            htmlFor="travel-origin-select"
            className="block text-xs font-semibold text-stone-700 mb-1"
          >
            مدينة الإقامة
          </label>
          <select
            id="travel-origin-select"
            value={originCityId}
            onChange={(e) => setOriginCityId(e.target.value)}
            className="w-full min-h-[38px] px-3 py-1.5 text-xs bg-[#FBF9F5] border border-stone-300 rounded-xl text-stone-900"
          >
            {VERIFIED_CITIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nameAr} — {c.countryAr}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-4">
          <label
            htmlFor="travel-dest-select"
            className="block text-xs font-semibold text-stone-700 mb-1"
          >
            وجهة السفر
          </label>
          <select
            id="travel-dest-select"
            value={destinationCityId}
            onChange={(e) => setDestinationCityId(e.target.value)}
            className="w-full min-h-[38px] px-3 py-1.5 text-xs bg-[#FBF9F5] border border-stone-300 rounded-xl text-stone-900"
          >
            {VERIFIED_CITIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nameAr} — {c.countryAr}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-4">
          <button
            type="button"
            onClick={() => {
              onSelectCity(destinationCity);
              setIsTravelerActive(true);
            }}
            className="w-full min-h-[38px] px-3 py-1.5 rounded-xl bg-[#78350F] hover:bg-[#78350F]/90 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>اعتماد مواقيت {destinationCity.nameAr}</span>
          </button>
        </div>
      </div>

      {/* Ruling Verdict */}
      <div className="pt-3 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-stone-900">
          <CheckCircle2
            className={`w-4 h-4 shrink-0 ${
              travelStatus.isQasrPermitted ? 'text-[#14532D]' : 'text-[#78350F]'
            }`}
          />
          <span>{travelStatus.rulingTitleAr}</span>
        </div>
        <p className="text-xs text-stone-600">{travelStatus.rulingExplanationAr}</p>
      </div>

      {isTravelerActive && (
        <div className="space-y-3 pt-3 border-t border-stone-100">
          {/* 5 Prayers Shortening (Qasr) Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {travelStatus.prayerRakats.map((p) => (
              <div
                key={p.prayerNameAr}
                className={`p-2.5 rounded-xl border text-center ${
                  p.canShorten
                    ? 'bg-[#14532D]/5 border-[#14532D]/30'
                    : 'bg-[#FBF9F5] border-stone-200'
                }`}
              >
                <span className="text-xs font-bold text-stone-900 block">
                  {p.prayerNameAr}
                </span>
                <span className="font-tabular tabular-nums text-sm font-bold text-[#14532D] mt-0.5 block">
                  {toArabicNumerals(p.travelerRakats)} ركعات
                </span>
                <span className="text-[10px] text-stone-500 block mt-0.5">
                  {p.canShorten ? `تُقصر (بدل ${toArabicNumerals(p.residentRakats)})` : 'تامة بلا قصر'}
                </span>
              </div>
            ))}
          </div>

          {/* Jam' Timings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-stone-700 pt-1">
            <div>
              <strong className="text-[#14532D]">جمع الظهر والعصر ({destinationCity.nameAr}): </strong>
              تقديم في وقت الظهر ({destinationTimes.dhuhr}) أو تأخير في وقت العصر ({destinationTimes.asr}).
            </div>
            <div>
              <strong className="text-[#78350F]">جمع المغرب والعشاء ({destinationCity.nameAr}): </strong>
              تقديم في وقت المغرب ({destinationTimes.maghrib}) أو تأخير في وقت العشاء ({destinationTimes.isha}).
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
