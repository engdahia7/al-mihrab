import React, { useState, useEffect, useMemo } from 'react';
import {
  Check,
  Plus,
  RotateCcw,
  Copy,
  Heart,
  Image as ImageIcon,
} from 'lucide-react';
import {
  KhatmahPlanState,
  KhatmahLogEntry,
  calculateKhatmahStats,
  getFirstPageOfJuz,
  getLastPageOfJuz,
  computeDaysUntilTargetDate,
  computeTargetDateISOFromDays,
  TOTAL_MUSHAF_PAGES,
} from '../utils/khatmahAndAlerts';
import {
  GroupJuzAssignment,
  calculateGroupKhatmahSummary,
  distributeJuzAmongMembers,
} from '../utils/islamicFeatures';
import { toArabicNumerals } from '../utils/astronomy';
import { JUZ_NAMES_AR } from '../data/quranData';
import {
  loadWaqfDedicationConfig,
  formatWaqfDedicationLineAr,
  type WaqfDedicationConfig,
} from '../utils/dawahShareCards';

const KHATMAH_STORAGE_KEY = 'almihrab_khatmah_plan_v1';
const GROUP_KHATMAH_STORAGE_KEY = 'almihrab_group_khatmah_v1';

const DEFAULT_KHATMAH_STATE: KhatmahPlanState = {
  targetDays: 30,
  currentPage: 40,
  startDateISO: new Date().toISOString().slice(0, 10),
  targetDateISO: computeTargetDateISOFromDays(30),
  completedKhatmahsCount: 1,
  logs: [
    {
      id: 'init-2',
      dateISO: new Date().toISOString().slice(0, 10),
      dateLabelAr: 'اليوم',
      pagesReadCount: 20,
      fromPage: 21,
      toPage: 40,
      noteAr: 'الجزء الثاني كاملاً',
    },
    {
      id: 'init-1',
      dateISO: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
      dateLabelAr: 'أمس',
      pagesReadCount: 20,
      fromPage: 1,
      toPage: 20,
      noteAr: 'الجزء الأول كاملاً',
    },
  ],
};

const DEFAULT_FAMILY_MEMBERS = ['الوالد', 'الوالدة', 'أحمد', 'فاطمة', 'عمر', 'سارة'];

function createDefaultGroupAssignments(): GroupJuzAssignment[] {
  return Array.from({ length: 30 }, (_, i) => ({
    juzNumber: i + 1,
    readerName: DEFAULT_FAMILY_MEMBERS[i % DEFAULT_FAMILY_MEMBERS.length],
    completed: i < 6,
  }));
}

interface KhatmahTrackerPanelProps {
  waqfConfig?: WaqfDedicationConfig;
  onOpenWaqfModal?: () => void;
}

export const KhatmahTrackerPanel: React.FC<KhatmahTrackerPanelProps> = ({
  waqfConfig,
  onOpenWaqfModal,
}) => {
  const [khatmahMode, setKhatmahMode] = useState<'individual' | 'group'>('individual');
  const activeWaqf = useMemo(
    () => waqfConfig || loadWaqfDedicationConfig(),
    [waqfConfig]
  );

  const [plan, setPlan] = useState<KhatmahPlanState>(() => {
    try {
      const saved = localStorage.getItem(KHATMAH_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.currentPage === 'number') return parsed;
      }
    } catch {
      // ignore
    }
    return DEFAULT_KHATMAH_STATE;
  });

  const [groupTitle, setGroupTitle] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(GROUP_KHATMAH_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.title) return parsed.title;
      }
    } catch {
      // ignore
    }
    return 'ختمة الأسرة والأحبة المباركة';
  });

  const [groupAssignments, setGroupAssignments] = useState<GroupJuzAssignment[]>(() => {
    try {
      const saved = localStorage.getItem(GROUP_KHATMAH_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.assignments) && parsed.assignments.length === 30) {
          return parsed.assignments;
        }
      }
    } catch {
      // ignore
    }
    return createDefaultGroupAssignments();
  });

  const [membersInput, setMembersInput] = useState<string>(
    DEFAULT_FAMILY_MEMBERS.join('، ')
  );
  const [copiedGroupReport, setCopiedGroupReport] = useState<boolean>(false);

  // Logging mode: 'by_page' (تسجيل الصفحة التي وصلت إليها), 'by_juz' (تسجيل الجزء الذي وصلت إليه), or 'add_pages' (إضافة عدد صفحات مقروءة)
  const [progressInputMode, setProgressInputMode] = useState<
    'by_page' | 'by_juz' | 'add_pages'
  >('by_page');
  const [reachedPageInput, setReachedPageInput] = useState<string>(
    String(plan.currentPage || 1)
  );
  const [reachedJuzInput, setReachedJuzInput] = useState<number>(() =>
    Math.max(1, Math.min(30, Math.ceil((plan.currentPage || 20) / 20)))
  );
  const [pagesInput, setPagesInput] = useState<string>('20');
  const [customTargetDays, setCustomTargetDays] = useState<string>(
    String(plan.targetDays)
  );
  const [noteInput, setNoteInput] = useState<string>('');

  useEffect(() => {
    try {
      localStorage.setItem(KHATMAH_STORAGE_KEY, JSON.stringify(plan));
    } catch {
      // ignore
    }
  }, [plan]);

  useEffect(() => {
    try {
      localStorage.setItem(
        GROUP_KHATMAH_STORAGE_KEY,
        JSON.stringify({
          title: groupTitle,
          assignments: groupAssignments,
        })
      );
    } catch {
      // ignore
    }
  }, [groupTitle, groupAssignments]);

  const stats = useMemo(() => calculateKhatmahStats(plan), [plan]);
  const groupSummary = useMemo(
    () => calculateGroupKhatmahSummary(groupAssignments),
    [groupAssignments]
  );

  const handleSetTargetDays = (days: number) => {
    const safeDays = Math.max(1, Math.min(365, days));
    const nextDateISO = computeTargetDateISOFromDays(safeDays);
    setCustomTargetDays(String(safeDays));
    setPlan((prev) => ({
      ...prev,
      targetDays: safeDays,
      targetDateISO: nextDateISO,
    }));
  };

  const handleSetTargetDateISO = (dateISO: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) return;
    const daysLeft = computeDaysUntilTargetDate(dateISO);
    setCustomTargetDays(String(daysLeft));
    setPlan((prev) => ({
      ...prev,
      targetDateISO: dateISO,
      targetDays: daysLeft,
    }));
  };

  const handleSetReachedPage = (targetPage: number, customNote?: string) => {
    const clampedPage = Math.max(
      1,
      Math.min(TOTAL_MUSHAF_PAGES, Math.round(targetPage))
    );
    setReachedPageInput(String(clampedPage));
    setPlan((prev) => {
      const fromPage = Math.max(1, Math.min(clampedPage, prev.currentPage + 1));
      const deltaPages = Math.max(1, Math.abs(clampedPage - prev.currentPage));
      const entry: KhatmahLogEntry = {
        id: `log-${Date.now()}`,
        dateISO: new Date().toISOString().slice(0, 10),
        dateLabelAr: new Date().toLocaleDateString('ar-SA', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        }),
        pagesReadCount: deltaPages,
        fromPage,
        toPage: clampedPage,
        noteAr:
          customNote ||
          noteInput.trim() ||
          `الوصول إلى الصفحة ${toArabicNumerals(clampedPage)}`,
      };
      const isNowComplete =
        clampedPage >= TOTAL_MUSHAF_PAGES && prev.currentPage < TOTAL_MUSHAF_PAGES;
      return {
        ...prev,
        currentPage: clampedPage,
        completedKhatmahsCount: isNowComplete
          ? prev.completedKhatmahsCount + 1
          : prev.completedKhatmahsCount,
        logs: [entry, ...prev.logs.slice(0, 29)],
      };
    });
    setNoteInput('');
  };

  const handleSetReachedJuz = (juzNum: number) => {
    const safeJuz = Math.max(1, Math.min(30, Math.round(juzNum)));
    setReachedJuzInput(safeJuz);
    const startPage = getFirstPageOfJuz(safeJuz);
    const endPage = getLastPageOfJuz(safeJuz);
    const juzName = JUZ_NAMES_AR[safeJuz] || `الجزء ${toArabicNumerals(safeJuz)}`;
    setReachedPageInput(String(endPage));

    setPlan((prev) => {
      const deltaPages = Math.max(
        endPage - startPage + 1,
        Math.abs(endPage - prev.currentPage)
      );
      const entry: KhatmahLogEntry = {
        id: `log-${Date.now()}`,
        dateISO: new Date().toISOString().slice(0, 10),
        dateLabelAr: new Date().toLocaleDateString('ar-SA', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        }),
        pagesReadCount: deltaPages,
        fromPage: startPage,
        toPage: endPage,
        noteAr:
          noteInput.trim() ||
          `إتمام ${juzName} (ص ${toArabicNumerals(startPage)} - ${toArabicNumerals(endPage)})`,
      };
      const isNowComplete =
        endPage >= TOTAL_MUSHAF_PAGES && prev.currentPage < TOTAL_MUSHAF_PAGES;
      return {
        ...prev,
        currentPage: endPage,
        completedKhatmahsCount: isNowComplete
          ? prev.completedKhatmahsCount + 1
          : prev.completedKhatmahsCount,
        logs: [entry, ...prev.logs.slice(0, 29)],
      };
    });
    setNoteInput('');
  };

  const handleLogReading = (pagesToAdd: number, customNote?: string) => {
    const validPages = Math.max(
      1,
      Math.min(TOTAL_MUSHAF_PAGES, Math.round(pagesToAdd))
    );
    setPlan((prev) => {
      const fromPage = Math.min(TOTAL_MUSHAF_PAGES, prev.currentPage + 1);
      const toPage = Math.min(TOTAL_MUSHAF_PAGES, prev.currentPage + validPages);
      const actualAdded = Math.max(0, toPage - prev.currentPage);
      if (actualAdded === 0) return prev;
      setReachedPageInput(String(toPage));

      const entry: KhatmahLogEntry = {
        id: `log-${Date.now()}`,
        dateISO: new Date().toISOString().slice(0, 10),
        dateLabelAr: new Date().toLocaleDateString('ar-SA', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        }),
        pagesReadCount: actualAdded,
        fromPage,
        toPage,
        noteAr:
          customNote ||
          noteInput.trim() ||
          `قراءة من ص ${toArabicNumerals(fromPage)} إلى ص ${toArabicNumerals(toPage)}`,
      };

      const isNowComplete = toPage >= TOTAL_MUSHAF_PAGES;
      return {
        ...prev,
        currentPage: toPage,
        completedKhatmahsCount: isNowComplete
          ? prev.completedKhatmahsCount + 1
          : prev.completedKhatmahsCount,
        logs: [entry, ...prev.logs.slice(0, 29)],
      };
    });
    setNoteInput('');
  };

  const handleResetNewKhatmah = () => {
    setReachedPageInput('1');
    setReachedJuzInput(1);
    setPlan((prev) => ({
      ...prev,
      currentPage: 0,
      startDateISO: new Date().toISOString().slice(0, 10),
      logs: [],
    }));
  };

  const handleAutoDistributeJuz = () => {
    const names = membersInput
      .split(/[،,\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (names.length === 0) return;
    setGroupAssignments((prev) => distributeJuzAmongMembers(prev, names));
  };

  const handleToggleJuzComplete = (juzNum: number) => {
    setGroupAssignments((prev) =>
      prev.map((item) =>
        item.juzNumber === juzNum ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const handleChangeJuzReader = (juzNum: number, name: string) => {
    setGroupAssignments((prev) =>
      prev.map((item) =>
        item.juzNumber === juzNum ? { ...item, readerName: name } : item
      )
    );
  };

  const handleResetGroupKhatmah = () => {
    setGroupAssignments((prev) =>
      prev.map((item) => ({ ...item, completed: false }))
    );
  };

  const handleCopyGroupReport = () => {
    const lines = groupAssignments.map(
      (a) =>
        `الجزء ${toArabicNumerals(a.juzNumber)} (${JUZ_NAMES_AR[a.juzNumber] || ''}): ${
          a.readerName || 'غير مسند'
        } — ${a.completed ? 'تمت القراءة بحمد الله' : 'قيد القراءة'}`
    );
    const report = `${groupTitle}\nنسبة الإنجاز: ${toArabicNumerals(
      groupSummary.completedCount
    )} من ٣٠ جزءاً (${toArabicNumerals(
      groupSummary.completionPercent
    )}٪)\n\n${lines.join('\n')}`;
    navigator.clipboard?.writeText(report);
    setCopiedGroupReport(true);
    setTimeout(() => setCopiedGroupReport(false), 2000);
  };

  return (
    <div className="space-y-5" data-testid="khatmah-tracker-panel">
      {/* Waqf & Sadaqah Jariyah Dedication Banner for the Khatmah */}
      <div
        data-testid="khatmah-waqf-banner"
        className="rounded-2xl bg-[#FAF5E8] border border-[#B59E7A] p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-[#14532D]">
            <Heart className="w-3.5 h-3.5 text-[#78350F] shrink-0" />
            <span>{formatWaqfDedicationLineAr(activeWaqf)}</span>
          </div>
          <p className="text-xs text-stone-700 leading-relaxed">
            {activeWaqf.enabled && activeWaqf.customDuaAr
              ? `«${activeWaqf.customDuaAr}»`
              : 'اجعل ثواب ختمتك القرآنية صدقةً جاريةً خالصةً لوجه الله أو أهدِ ثوابها لروح متوفى أو للوالدين مع بطاقة وقف مصوّرة.'}
          </p>
        </div>

        {onOpenWaqfModal && (
          <button
            type="button"
            data-testid="khatmah-open-waqf-btn"
            onClick={onOpenWaqfModal}
            className="min-h-[36px] px-3.5 py-1.5 rounded-xl bg-[#14532D] hover:bg-[#14532D]/90 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>
              {activeWaqf.enabled
                ? 'بطاقة الوقف وتعديل الإهداء'
                : 'تخصيص إهداء الختمة وبطاقة وقف'}
            </span>
          </button>
        )}
      </div>

      {/* Mode Switcher: Individual vs Family/Group Khatmah */}
      <div
        role="tablist"
        aria-label="نوع الختمة القرآنية"
        className="grid grid-cols-2 gap-1.5 p-1 bg-[#F4EFE6] border border-[#E2D9C8] rounded-xl"
      >
        <button
          type="button"
          role="tab"
          aria-selected={khatmahMode === 'individual'}
          onClick={() => setKhatmahMode('individual')}
          className={`min-h-[40px] py-2 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
            khatmahMode === 'individual'
              ? 'bg-[#14532D] text-white shadow-xs'
              : 'text-stone-700 hover:bg-stone-200/70'
          }`}
        >
          الختمة الفردية (بالصفحة أو الجزء)
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={khatmahMode === 'group'}
          onClick={() => setKhatmahMode('group')}
          className={`min-h-[40px] py-2 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
            khatmahMode === 'group'
              ? 'bg-[#14532D] text-white shadow-xs'
              : 'text-stone-700 hover:bg-stone-200/70'
          }`}
        >
          الختمة الجماعية والعائلية (٣٠ جزءاً)
        </button>
      </div>

      {khatmahMode === 'individual' ? (
        <>
          {/* Top Progress Summary Card */}
          <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-xs font-semibold text-[#14532D] block">
                  متابعة ختم القرآن الكريم · مصحف المدينة (٦٠٤ صفحات · ٣٠ جزءاً)
                </span>
                <h3
                  data-testid="khatmah-completion-percent"
                  className="font-display text-lg sm:text-xl font-bold text-stone-900 mt-0.5"
                >
                  نسبة الإنجاز: {toArabicNumerals(stats.completionPercent)}٪ · الصفحة{' '}
                  {toArabicNumerals(plan.currentPage)} · الجزء{' '}
                  {toArabicNumerals(stats.currentJuz)} من ٣٠
                </h3>
              </div>
              <div className="text-left">
                <span className="text-xs font-semibold text-[#78350F] block">
                  الختمات المكتملة: {toArabicNumerals(plan.completedKhatmahsCount)}
                </span>
                <span className="text-[11px] text-stone-500 block">
                  التاريخ المستهدف: {stats.targetDateISO}
                </span>
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div className="space-y-1.5">
              <div className="w-full h-3 bg-stone-200 rounded-full overflow-hidden">
                <div
                  data-testid="khatmah-progress-bar-fill"
                  className="h-full bg-[#14532D] transition-all duration-300"
                  style={{ width: `${stats.completionPercent}%` }}
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-stone-600">
                <span>
                  المقروء: {toArabicNumerals(stats.pagesRead)} من ٦٠٤ صفحات ({toArabicNumerals(stats.completedJuzCount)} جزءاً مكتملاً)
                </span>
                <span>
                  المتبقي: {toArabicNumerals(stats.pagesRemaining)} صفحة ({toArabicNumerals(30 - stats.completedJuzCount)} جزءاً)
                </span>
              </div>
            </div>

            {/* 4 Metrics separated by clean hairline dividers */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-stone-100">
              <div>
                <span className="text-[11px] text-stone-500 block">الورد اليومي المطلوب</span>
                <span className="font-tabular tabular-nums text-base font-bold text-stone-900 mt-0.5 block">
                  {toArabicNumerals(stats.dailyTargetPages)} صفحة / يوم
                </span>
              </div>
              <div>
                <span className="text-[11px] text-stone-500 block">يعادل بالأجزاء</span>
                <span className="font-tabular tabular-nums text-base font-bold text-[#14532D] mt-0.5 block">
                  {toArabicNumerals(stats.dailyTargetJuz)} جزء يومياً
                </span>
              </div>
              <div>
                <span className="text-[11px] text-stone-500 block">الأجزاء المكتملة</span>
                <span className="font-tabular tabular-nums text-base font-bold text-stone-900 mt-0.5 block">
                  {toArabicNumerals(stats.completedJuzCount)} من ٣٠ جزءاً
                </span>
              </div>
              <div>
                <span className="text-[11px] text-stone-500 block">المتبقي للتاريخ المستهدف</span>
                <span className="font-tabular tabular-nums text-base font-bold text-[#78350F] mt-0.5 block">
                  {toArabicNumerals(stats.daysUntilTargetDate)} يوماً
                </span>
              </div>
            </div>
          </div>

          {/* 2-Column Grid: Log Reached Page/Juz & Target Date Setting */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left 6 Cols: Log Reached Page OR Juz */}
            <div className="lg:col-span-6 bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <h4 className="font-display text-base font-bold text-stone-900">
                  تسجيل الصفحة أو الجزء الذي وصلت إليه
                </h4>
                <button
                  type="button"
                  onClick={handleResetNewKhatmah}
                  className="text-xs text-stone-500 hover:text-stone-900 flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>بدء ختمة جديدة</span>
                </button>
              </div>

              {/* 3-Mode Input Switcher: By Page | By Juz | Add Daily Pages */}
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#F7F4EE] border border-stone-200 rounded-xl">
                <button
                  type="button"
                  data-testid="khatmah-log-mode-page"
                  onClick={() => setProgressInputMode('by_page')}
                  className={`min-h-[36px] px-2 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    progressInputMode === 'by_page'
                      ? 'bg-[#14532D] text-white'
                      : 'text-stone-700 hover:text-stone-900'
                  }`}
                >
                  بالصفحة (١-٦٠٤)
                </button>
                <button
                  type="button"
                  data-testid="khatmah-log-mode-juz"
                  onClick={() => setProgressInputMode('by_juz')}
                  className={`min-h-[36px] px-2 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    progressInputMode === 'by_juz'
                      ? 'bg-[#14532D] text-white'
                      : 'text-stone-700 hover:text-stone-900'
                  }`}
                >
                  بالجزء (١-٣٠)
                </button>
                <button
                  type="button"
                  data-testid="khatmah-log-mode-add"
                  onClick={() => setProgressInputMode('add_pages')}
                  className={`min-h-[36px] px-2 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    progressInputMode === 'add_pages'
                      ? 'bg-[#14532D] text-white'
                      : 'text-stone-700 hover:text-stone-900'
                  }`}
                >
                  إضافة صفحات اليوم
                </button>
              </div>

              {progressInputMode === 'by_page' && (
                <div className="space-y-3" data-testid="khatmah-by-page-box">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label
                        htmlFor="khatmah-reached-page-input"
                        className="block text-xs font-semibold text-stone-700 mb-1"
                      >
                        الصفحة التي وصلت إليها (١ إلى ٦٠٤):
                      </label>
                      <input
                        id="khatmah-reached-page-input"
                        data-testid="khatmah-reached-page-input"
                        type="number"
                        min={1}
                        max={604}
                        value={reachedPageInput}
                        onChange={(e) => setReachedPageInput(e.target.value)}
                        className="w-full min-h-[40px] px-3 py-1.5 text-xs font-bold bg-[#FBF9F5] border border-stone-300 rounded-xl font-tabular tabular-nums"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="khatmah-page-note-input"
                        className="block text-xs text-stone-600 mb-1"
                      >
                        ملاحظة الورد (اختياري):
                      </label>
                      <input
                        id="khatmah-page-note-input"
                        type="text"
                        placeholder="مثال: توقفت عند نهاية الحزب"
                        value={noteInput}
                        onChange={(e) => setNoteInput(e.target.value)}
                        className="w-full min-h-[40px] px-3 py-1.5 text-xs bg-[#FBF9F5] border border-stone-300 rounded-xl"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    data-testid="khatmah-save-page-btn"
                    onClick={() => {
                      const parsed = parseInt(reachedPageInput, 10);
                      if (Number.isFinite(parsed) && parsed >= 1) {
                        handleSetReachedPage(parsed);
                      }
                    }}
                    className="w-full min-h-[42px] px-4 py-2 rounded-xl bg-[#14532D] text-white text-xs font-semibold hover:bg-[#14532D]/90 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>حفظ الوصول إلى الصفحة ({toArabicNumerals(reachedPageInput || 1)})</span>
                  </button>
                </div>
              )}

              {progressInputMode === 'by_juz' && (
                <div className="space-y-3" data-testid="khatmah-by-juz-box">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label
                        htmlFor="khatmah-reached-juz-select"
                        className="block text-xs font-semibold text-stone-700 mb-1"
                      >
                        اختر الجزء الذي أتممته (١ إلى ٣٠):
                      </label>
                      <select
                        id="khatmah-reached-juz-select"
                        data-testid="khatmah-reached-juz-select"
                        value={reachedJuzInput}
                        onChange={(e) => setReachedJuzInput(Number(e.target.value))}
                        className="w-full min-h-[40px] px-3 py-1.5 text-xs font-bold bg-[#FBF9F5] border border-stone-300 rounded-xl text-stone-900"
                      >
                        {Array.from({ length: 30 }, (_, idx) => {
                          const jNum = idx + 1;
                          const sPage = getFirstPageOfJuz(jNum);
                          const ePage = getLastPageOfJuz(jNum);
                          return (
                            <option key={jNum} value={jNum}>
                              الجزء {toArabicNumerals(jNum)} — {JUZ_NAMES_AR[jNum]} (ص{' '}
                              {toArabicNumerals(sPage)} - {toArabicNumerals(ePage)})
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor="khatmah-juz-note-input"
                        className="block text-xs text-stone-600 mb-1"
                      >
                        ملاحظة الورد (اختياري):
                      </label>
                      <input
                        id="khatmah-juz-note-input"
                        type="text"
                        placeholder="مثال: قراءة الجزء بعد الفجر"
                        value={noteInput}
                        onChange={(e) => setNoteInput(e.target.value)}
                        className="w-full min-h-[40px] px-3 py-1.5 text-xs bg-[#FBF9F5] border border-stone-300 rounded-xl"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    data-testid="khatmah-save-juz-btn"
                    onClick={() => handleSetReachedJuz(reachedJuzInput)}
                    className="w-full min-h-[42px] px-4 py-2 rounded-xl bg-[#14532D] text-white text-xs font-semibold hover:bg-[#14532D]/90 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>
                      حفظ إتمام الجزء {toArabicNumerals(reachedJuzInput)} (حتى صفحة{' '}
                      {toArabicNumerals(getLastPageOfJuz(reachedJuzInput))})
                    </span>
                  </button>
                </div>
              )}

              {progressInputMode === 'add_pages' && (
                <div className="space-y-3" data-testid="khatmah-add-pages-box">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label
                        htmlFor="khatmah-pages-input"
                        className="block text-xs text-stone-600 mb-1"
                      >
                        عدد الصفحات المقروءة اليوم
                      </label>
                      <input
                        id="khatmah-pages-input"
                        type="number"
                        min={1}
                        max={604}
                        value={pagesInput}
                        onChange={(e) => setPagesInput(e.target.value)}
                        className="w-full min-h-[40px] px-3 py-1.5 text-xs bg-[#FBF9F5] border border-stone-300 rounded-xl font-tabular tabular-nums"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="khatmah-note-input"
                        className="block text-xs text-stone-600 mb-1"
                      >
                        ملاحظة الورد (اختياري)
                      </label>
                      <input
                        id="khatmah-note-input"
                        type="text"
                        placeholder="مثال: ورد بعد صلاة الفجر"
                        value={noteInput}
                        onChange={(e) => setNoteInput(e.target.value)}
                        className="w-full min-h-[40px] px-3 py-1.5 text-xs bg-[#FBF9F5] border border-stone-300 rounded-xl"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const num = parseInt(pagesInput, 10);
                      if (Number.isFinite(num) && num > 0) {
                        handleLogReading(num);
                      }
                    }}
                    className="w-full min-h-[42px] px-4 py-2 rounded-xl bg-[#14532D] text-white text-xs font-semibold hover:bg-[#14532D]/90 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>تسجيل الصفحات في سجل الختمة</span>
                  </button>
                </div>
              )}

              {/* Quick Preset Buttons */}
              <div className="pt-2 border-t border-stone-100">
                <span className="text-xs text-stone-600 block mb-2">
                  إضافة سريعة للورد المقروء اليوم:
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleLogReading(5, 'قراءة ٥ صفحات (حزب تقريباً)')}
                    className="min-h-[38px] px-2.5 py-1.5 rounded-xl bg-[#F7F4EE] hover:bg-stone-200/80 border border-stone-200 text-xs font-semibold text-stone-800 cursor-pointer"
                  >
                    + ٥ صفحات
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLogReading(10, 'قراءة نصف جزء (١٠ صفحات)')}
                    className="min-h-[38px] px-2.5 py-1.5 rounded-xl bg-[#F7F4EE] hover:bg-stone-200/80 border border-stone-200 text-xs font-semibold text-stone-800 cursor-pointer"
                  >
                    + نصف جزء (١٠ ص)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLogReading(20, 'قراءة جزء كامل (٢٠ صفحة)')}
                    className="min-h-[38px] px-2.5 py-1.5 rounded-xl bg-[#14532D]/10 hover:bg-[#14532D]/20 border border-[#14532D]/30 text-xs font-bold text-[#14532D] cursor-pointer"
                  >
                    + جزء كامل (٢٠ ص)
                  </button>
                </div>
              </div>
            </div>

            {/* Right 6 Cols: Target Date Picker & History Log */}
            <div className="lg:col-span-6 bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="border-b border-stone-100 pb-3">
                <h4 className="font-display text-base font-bold text-stone-900">
                  تحديد التاريخ المستهدف لختم القرآن
                </h4>
                <p className="text-xs text-stone-500 mt-0.5">
                  اختر تاريخاً محدداً للختم أو اختر مدة بالأيام ليحسب التطبيق وردك اليومي تلقائياً
                </p>
              </div>

              {/* Explicit Target Date Picker */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="khatmah-target-date-input"
                    className="block text-xs font-semibold text-stone-700 mb-1"
                  >
                    التاريخ المستهدف لإتمام الختمة:
                  </label>
                  <input
                    id="khatmah-target-date-input"
                    data-testid="khatmah-target-date-input"
                    type="date"
                    min={new Date().toISOString().slice(0, 10)}
                    value={stats.targetDateISO}
                    onChange={(e) => handleSetTargetDateISO(e.target.value)}
                    className="w-full min-h-[38px] px-3 py-1.5 text-xs font-bold bg-[#FBF9F5] border border-stone-300 rounded-xl text-stone-900 font-tabular tabular-nums"
                  />
                </div>

                <div>
                  <label
                    htmlFor="custom-target-days"
                    className="block text-xs font-semibold text-stone-700 mb-1"
                  >
                    أو المدة المستهدفة (بالأيام):
                  </label>
                  <input
                    id="custom-target-days"
                    type="number"
                    min={1}
                    max={365}
                    value={customTargetDays}
                    onChange={(e) => {
                      setCustomTargetDays(e.target.value);
                      const parsed = parseInt(e.target.value, 10);
                      if (Number.isFinite(parsed) && parsed >= 1) {
                        handleSetTargetDays(parsed);
                      }
                    }}
                    className="w-full min-h-[38px] px-3 py-1.5 text-xs font-bold bg-[#FBF9F5] border border-stone-300 rounded-xl font-tabular tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {[
                  { days: 7, label: '٧ أيام' },
                  { days: 15, label: '١٥ يوماً' },
                  { days: 30, label: '٣٠ يوماً' },
                  { days: 60, label: '٦٠ يوماً' },
                ].map((preset) => (
                  <button
                    key={preset.days}
                    type="button"
                    onClick={() => handleSetTargetDays(preset.days)}
                    className={`min-h-[36px] px-2 py-1 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                      plan.targetDays === preset.days
                        ? 'bg-[#14532D] text-white border-[#14532D]'
                        : 'bg-[#FBF9F5] text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Recent Reading Logs */}
              <div className="pt-2 border-t border-stone-100 space-y-2">
                <span className="text-xs font-bold text-stone-800 block">
                  سجل القراءة اليومي ({toArabicNumerals(plan.logs.length)}):
                </span>
                {plan.logs.length === 0 ? (
                  <p className="text-xs text-stone-500 py-2">
                    لم يتم تسجيل قراءات في هذه الختمة بعد. ابدأ بتسجيل الصفحة أو الجزء أعلاه.
                  </p>
                ) : (
                  <div className="divide-y divide-stone-100 max-h-40 overflow-y-auto pr-1">
                    {plan.logs.slice(0, 6).map((log) => (
                      <div
                        key={log.id}
                        className="py-2 flex items-center justify-between gap-2 text-xs"
                      >
                        <div>
                          <span className="font-semibold text-stone-900">
                            {log.noteAr}
                          </span>
                          <span className="text-stone-500 block text-[11px]">
                            من ص {toArabicNumerals(log.fromPage)} إلى ص{' '}
                            {toArabicNumerals(log.toPage)} · {log.dateLabelAr}
                          </span>
                        </div>
                        <span className="font-tabular tabular-nums font-bold text-[#14532D] shrink-0">
                          +{toArabicNumerals(log.pagesReadCount)} ص
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        /* ======================================================================
           الختمة الجماعية أو العائلية (توزيع ٣٠ جزءاً بين الأسرة والأصدقاء)
           ====================================================================== */
        <div className="space-y-5" data-testid="group-khatmah-section">
          {/* Header & Family Auto-Distribution Card */}
          <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-xs font-semibold text-[#14532D] block">
                  الختمة التشاركية (تقسيم ٣٠ جزءاً بين الأسرة والأصدقاء)
                </span>
                <h3 className="font-display text-lg sm:text-xl font-bold text-stone-900 mt-0.5">
                  {groupTitle} — أُنجز {toArabicNumerals(groupSummary.completedCount)} من ٣٠
                  جزءاً ({toArabicNumerals(groupSummary.completionPercent)}٪)
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyGroupReport}
                  className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#14532D] text-white text-xs font-semibold hover:bg-[#14532D]/90 flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedGroupReport ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>تم نسخ التقرير</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>نسخ تقرير الختمة للعائلة</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleResetGroupKhatmah}
                  className="min-h-[38px] px-2.5 py-1.5 rounded-xl bg-[#F7F4EE] border border-stone-200 text-xs text-stone-700 hover:bg-stone-200/70 flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>تصفير الإنجاز</span>
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="w-full h-3 bg-stone-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#14532D] transition-all duration-300"
                  style={{ width: `${groupSummary.completionPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-stone-600">
                <span>
                  الأجزاء المكتملة: {toArabicNumerals(groupSummary.completedCount)} جزءاً ·
                  عدد المشاركين: {toArabicNumerals(groupSummary.participantsCount)}
                </span>
                <span>
                  الأجزاء المتبقية: {toArabicNumerals(groupSummary.remainingCount)} جزءاً
                </span>
              </div>
            </div>

            {/* Family Members Auto-Distributor */}
            <div className="pt-3 border-t border-stone-100 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-4">
                <label
                  htmlFor="group-khatmah-title"
                  className="block text-xs font-semibold text-stone-700 mb-1"
                >
                  اسم الختمة العائلية أو الجماعية
                </label>
                <input
                  id="group-khatmah-title"
                  type="text"
                  value={groupTitle}
                  onChange={(e) => setGroupTitle(e.target.value)}
                  className="w-full min-h-[40px] px-3 py-1.5 text-xs bg-[#FBF9F5] border border-stone-300 rounded-xl"
                />
              </div>
              <div className="md:col-span-5">
                <label
                  htmlFor="group-members-input"
                  className="block text-xs font-semibold text-stone-700 mb-1"
                >
                  أسماء المشاركين (افصل بينهم بفاصلة لتوزيع الـ ٣٠ جزءاً تلقائياً)
                </label>
                <input
                  id="group-members-input"
                  type="text"
                  value={membersInput}
                  onChange={(e) => setMembersInput(e.target.value)}
                  placeholder="مثال: الوالد، الوالدة، أحمد، فاطمة..."
                  className="w-full min-h-[40px] px-3 py-1.5 text-xs bg-[#FBF9F5] border border-stone-300 rounded-xl"
                />
              </div>
              <div className="md:col-span-3">
                <button
                  type="button"
                  onClick={handleAutoDistributeJuz}
                  className="w-full min-h-[40px] px-3 py-2 rounded-xl bg-[#78350F] text-white text-xs font-semibold hover:bg-[#78350F]/90 cursor-pointer"
                >
                  توزيع الأجزاء الثلاثين بالتساوي
                </button>
              </div>
            </div>
          </div>

          {/* 30 Juz Interactive Assignment Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[420px] overflow-y-auto p-1">
            {groupAssignments.map((item) => (
              <div
                key={item.juzNumber}
                className={`p-3 rounded-xl border transition-colors flex flex-col justify-between gap-2.5 ${
                  item.completed
                    ? 'bg-[#14532D]/5 border-[#14532D]/40'
                    : 'bg-white border-stone-200'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-stone-900">
                      الجزء {toArabicNumerals(item.juzNumber)}
                    </span>
                    <span className="text-[11px] text-stone-500 mr-1.5">
                      ({JUZ_NAMES_AR[item.juzNumber]})
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleJuzComplete(item.juzNumber)}
                    className={`min-h-[30px] px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                      item.completed
                        ? 'bg-[#14532D] text-white'
                        : 'bg-[#F7F4EE] text-stone-700 border border-stone-300 hover:bg-stone-200'
                    }`}
                  >
                    <Check className="w-3 h-3" />
                    <span>{item.completed ? 'مكتمل' : 'قيد القراءة'}</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <label
                    htmlFor={`juz-reader-${item.juzNumber}`}
                    className="text-[11px] text-stone-500 shrink-0"
                  >
                    القارئ:
                  </label>
                  <input
                    id={`juz-reader-${item.juzNumber}`}
                    type="text"
                    value={item.readerName}
                    onChange={(e) =>
                      handleChangeJuzReader(item.juzNumber, e.target.value)
                    }
                    placeholder="اسم القارئ..."
                    className="w-full min-h-[32px] px-2.5 py-1 text-xs bg-[#FBF9F5] border border-stone-200 rounded-lg text-stone-900"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
