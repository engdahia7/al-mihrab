import React, { useState, useEffect, useMemo } from 'react';
import {
  MessageCircle,
  Phone,
  Copy,
  Check,
  Send,
  NotebookPen,
  Plus,
  Trash2,
  Headphones,
  ExternalLink,
  Search,
} from 'lucide-react';
import { toArabicNumerals } from '../utils/astronomy';

export interface PersonalIslamicNote {
  id: string;
  title: string;
  content: string;
  category: 'tadabbur' | 'dua' | 'hadith' | 'general';
  createdAtIso: string;
}

const NOTES_STORAGE_KEY = 'almihrab_personal_notes_v1';
export const SUPPORT_WHATSAPP_DISPLAY = '00966564895972';
export const SUPPORT_WHATSAPP_INTL = '966564895972';

const NOTE_CATEGORIES: {
  id: PersonalIslamicNote['category'];
  label: string;
}[] = [
  { id: 'tadabbur', label: 'تدبّر آية' },
  { id: 'hadith', label: 'فائدة حديثية' },
  { id: 'dua', label: 'دعاء مستجاب' },
  { id: 'general', label: 'ملاحظة عامة' },
];

const FEEDBACK_TYPES = [
  { id: 'suggestion', label: 'اقتراح تطوير أو ميزة جديدة' },
  { id: 'support', label: 'دعم فني أو استفسار' },
  { id: 'prayers', label: 'ملاحظة حول المواقيت أو القبلة' },
  { id: 'content', label: 'ملاحظة في المصحف أو الأذكار أو الأحاديث' },
] as const;

export const SupportAndNotesView: React.FC = () => {
  const [subTab, setSubTab] = useState<'contact' | 'notes'>('contact');
  const [copiedPhone, setCopiedPhone] = useState(false);

  // Feedback form state
  const [feedbackType, setFeedbackType] = useState<string>(FEEDBACK_TYPES[0].label);
  const [senderName, setSenderName] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');

  // Personal notes state
  const [notes, setNotes] = useState<PersonalIslamicNote[]>(() => {
    try {
      const raw = localStorage.getItem(NOTES_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [
      {
        id: 'welcome-note-1',
        title: 'فائدة في فضل الذكر عقب الصلوات',
        content:
          'المحافظة على التسبيح (٣٣) والتحميد (٣٣) والتكبير (٣٣) وتمام المائة دبر كل صلاة مكتوبة من أعظم أسباب مغفرة الذنوب وطمأنينة القلب.',
        category: 'tadabbur',
        createdAtIso: new Date().toISOString(),
      },
    ];
  });

  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteCategory, setNoteCategory] =
    useState<PersonalIslamicNote['category']>('tadabbur');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [copiedNoteId, setCopiedNoteId] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
    } catch {
      // ignore
    }
  }, [notes]);

  const handleCopyPhone = async () => {
    try {
      await navigator.clipboard.writeText(SUPPORT_WHATSAPP_DISPLAY);
      setCopiedPhone(true);
      window.setTimeout(() => setCopiedPhone(false), 2500);
    } catch {
      // ignore
    }
  };

  const whatsappDirectHref = useMemo(() => {
    const defaultMsg = 'السلام عليكم ورحمة الله وبركاته، أتواصل معكم من تطبيق المحراب بخصوص الدعم الفني والملاحظات.';
    return `https://wa.me/${SUPPORT_WHATSAPP_INTL}?text=${encodeURIComponent(defaultMsg)}`;
  }, []);

  const whatsappFeedbackHref = useMemo(() => {
    const lines = [
      'السلام عليكم ورحمة الله وبركاته',
      `رسالة من تطبيق المحراب (${feedbackType})`,
      senderName.trim() ? `الاسم: ${senderName.trim()}` : '',
      feedbackMessage.trim()
        ? `الملاحظة:\n${feedbackMessage.trim()}`
        : 'أرغب في التواصل مع الدعم الفني لتطبيق المحراب.',
    ].filter(Boolean);
    return `https://wa.me/${SUPPORT_WHATSAPP_INTL}?text=${encodeURIComponent(lines.join('\n'))}`;
  }, [feedbackType, senderName, feedbackMessage]);

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim() && !noteContent.trim()) return;

    const newNote: PersonalIslamicNote = {
      id: `note-${Date.now()}`,
      title: noteTitle.trim() || 'ملاحظة بدون عنوان',
      content: noteContent.trim(),
      category: noteCategory,
      createdAtIso: new Date().toISOString(),
    };

    setNotes((prev) => [newNote, ...prev]);
    setNoteTitle('');
    setNoteContent('');
  };

  const handleDeleteNote = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const handleCopyNote = async (note: PersonalIslamicNote) => {
    try {
      await navigator.clipboard.writeText(`${note.title}\n${note.content}`);
      setCopiedNoteId(note.id);
      window.setTimeout(() => setCopiedNoteId(null), 2000);
    } catch {
      // ignore
    }
  };

  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      const matchesCat =
        selectedFilter === 'all' || n.category === selectedFilter;
      const q = searchQuery.trim().toLowerCase();
      const matchesQuery =
        !q ||
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });
  }, [notes, selectedFilter, searchQuery]);

  return (
    <div className="space-y-5" data-testid="support-and-notes-view">
      {/* Top Hero Banner with Direct WhatsApp Technical Support */}
      <section className="rounded-2xl bg-[#14532D] text-white p-5 sm:p-6 shadow-md border border-[#14532D]/90 relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 text-xs text-[#FDE68A] font-semibold">
              <Headphones className="w-4 h-4 shrink-0" />
              <span>مركز الدعم الفني والملاحظات · خدمة المستخدمين</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white leading-snug">
              الملاحظات والتواصل مع الدعم الفني
            </h1>
            <p className="text-xs sm:text-sm text-stone-200 leading-relaxed">
              نسعد باستقبال ملاحظاتكم واقتراحاتكم لتطوير تطبيق «المحراب»، كما يمكنكم التواصل المباشر عبر واتساب الدعم الفني على مدار الساعة أو تدوين فوائدكم وملاحظاتكم الإيمانية.
            </p>
          </div>

          {/* Direct WhatsApp Number Box */}
          <div className="bg-black/25 border border-white/15 rounded-2xl p-4 sm:p-5 flex flex-col gap-3 shrink-0 min-w-[270px]">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-[#FDE68A] font-bold">
                رقم واتساب الدعم الفني:
              </span>
              <span className="text-[11px] text-stone-300">متاح عبر واتساب</span>
            </div>

            <div
              dir="ltr"
              data-testid="support-whatsapp-number"
              className="font-mono text-xl sm:text-2xl font-bold tracking-wider text-white text-center py-1.5 px-3 rounded-xl bg-white/10 border border-white/15 select-all"
            >
              {SUPPORT_WHATSAPP_DISPLAY}
            </div>

            <div className="flex items-center gap-2">
              <a
                href={whatsappDirectHref}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="direct-whatsapp-support-link"
                className="flex-1 min-h-[42px] px-3.5 py-2 rounded-xl bg-[#FDE68A] hover:bg-[#FDE68A]/90 text-stone-950 text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
              >
                <MessageCircle className="w-4 h-4 shrink-0" />
                <span>مراسلة عبر واتساب</span>
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              </a>

              <button
                type="button"
                onClick={handleCopyPhone}
                data-testid="copy-whatsapp-number-btn"
                className="min-h-[42px] px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="نسخ رقم واتساب الدعم الفني"
              >
                {copiedPhone ? (
                  <>
                    <Check className="w-4 h-4 text-[#FDE68A]" />
                    <span>تم النسخ</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>نسخ الرقم</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Segmented Sub-Tab Switcher: 1. التواصل وإرسال ملاحظة | 2. دفتر الملاحظات الشخصي */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#F4EFE6] p-1.5 rounded-2xl border border-stone-200/90">
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <button
            type="button"
            data-testid="subtab-support-contact"
            onClick={() => setSubTab('contact')}
            className={`flex-1 sm:flex-initial min-h-[42px] px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
              subTab === 'contact'
                ? 'bg-[#14532D] text-white shadow-xs'
                : 'text-stone-700 hover:bg-stone-200/70'
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            <span>التواصل وإرسال ملاحظة للدعم الفني</span>
          </button>

          <button
            type="button"
            data-testid="subtab-personal-notes"
            onClick={() => setSubTab('notes')}
            className={`flex-1 sm:flex-initial min-h-[42px] px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
              subTab === 'notes'
                ? 'bg-[#14532D] text-white shadow-xs'
                : 'text-stone-700 hover:bg-stone-200/70'
            }`}
          >
            <NotebookPen className="w-4 h-4" />
            <span>دفتر الملاحظات والفوائد ({toArabicNumerals(notes.length)})</span>
          </button>
        </div>

        <div className="hidden md:flex items-center gap-2 px-3 text-xs text-stone-600">
          <span>رقم الدعم المباشر:</span>
          <span dir="ltr" className="font-mono font-bold text-[#14532D]">
            {SUPPORT_WHATSAPP_DISPLAY}
          </span>
        </div>
      </div>

      {subTab === 'contact' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Right Column: Instant WhatsApp Feedback & Support Form */}
          <div className="lg:col-span-7 bg-white border border-stone-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="border-b border-stone-100 pb-3">
              <h2 className="font-display text-lg sm:text-xl font-bold text-stone-900">
                إرسال ملاحظة أو طلب دعم فني عبر واتساب
              </h2>
              <p className="text-xs text-stone-600 mt-1">
                اكتب ملاحظتك أو اقتراحك ليتم تجهيزها وإرسالها مباشرة إلى واتساب الدعم الفني ({SUPPORT_WHATSAPP_DISPLAY}).
              </p>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1.5">
                  نوع الملاحظة أو الرسالة:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {FEEDBACK_TYPES.map((item) => {
                    const active = feedbackType === item.label;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setFeedbackType(item.label)}
                        className={`min-h-[40px] px-3 py-2 rounded-xl text-xs font-semibold text-right border transition-colors cursor-pointer ${
                          active
                            ? 'bg-[#14532D]/10 border-[#14532D] text-[#14532D] font-bold'
                            : 'bg-[#FBF9F5] border-stone-200 text-stone-700 hover:bg-stone-100'
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label
                  htmlFor="support-sender-name"
                  className="block text-xs font-bold text-stone-800 mb-1"
                >
                  الاسم الكريم (اختياري):
                </label>
                <input
                  id="support-sender-name"
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="مثال: أبو عبد الله"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FBF9F5] border border-stone-300 text-xs sm:text-sm text-stone-900 focus:outline-none focus:border-[#14532D]"
                />
              </div>

              <div>
                <label
                  htmlFor="support-feedback-message"
                  className="block text-xs font-bold text-stone-800 mb-1"
                >
                  تفاصيل الملاحظة أو الاستفسار:
                </label>
                <textarea
                  id="support-feedback-message"
                  rows={4}
                  value={feedbackMessage}
                  onChange={(e) => setFeedbackMessage(e.target.value)}
                  placeholder="اكتب ملاحظتك، اقتراحك، أو أي مشكلة واجهتك في التطبيق ليتم إرسالها للدعم الفني..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FBF9F5] border border-stone-300 text-xs sm:text-sm text-stone-900 leading-relaxed focus:outline-none focus:border-[#14532D]"
                />
              </div>

              <div className="pt-1 flex flex-wrap items-center gap-2.5">
                <a
                  href={whatsappFeedbackHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="send-feedback-whatsapp-btn"
                  className="flex-1 min-h-[46px] px-5 py-2.5 rounded-xl bg-[#14532D] hover:bg-[#14532D]/90 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                  <Send className="w-4 h-4 shrink-0" />
                  <span>إرسال الملاحظة عبر واتساب ({SUPPORT_WHATSAPP_DISPLAY})</span>
                </a>
              </div>
            </div>
          </div>

          {/* Left Column: Direct Contact Channels Card */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white border border-stone-200/90 rounded-2xl p-5 space-y-4 shadow-xs">
              <h3 className="font-display text-base sm:text-lg font-bold text-stone-900 border-b border-stone-100 pb-2.5">
                قنوات التواصل المباشر مع الدعم الفني
              </h3>

              <div className="space-y-3">
                {/* WhatsApp Channel */}
                <div className="p-3.5 rounded-xl bg-[#FBF9F5] border border-stone-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#14532D] flex items-center gap-1.5">
                      <MessageCircle className="w-4 h-4" />
                      <span>واتساب الدعم الفني الرسمي</span>
                    </span>
                    <span
                      dir="ltr"
                      className="font-mono text-xs font-bold text-stone-900"
                    >
                      {SUPPORT_WHATSAPP_DISPLAY}
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    للتواصل السريع وإرسال الملاحظات والاستفسارات الفنية مباشرة عبر تطبيق واتساب.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <a
                      href={whatsappDirectHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 min-h-[38px] px-3 py-1.5 rounded-lg bg-[#14532D] hover:bg-[#14532D]/90 text-white text-xs font-bold flex items-center justify-center gap-1.5"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>فتح محادثة واتساب</span>
                    </a>
                    <a
                      href={`tel:+${SUPPORT_WHATSAPP_INTL}`}
                      className="min-h-[38px] px-3 py-1.5 rounded-lg bg-[#F4EFE6] hover:bg-stone-200 text-stone-800 text-xs font-semibold flex items-center justify-center gap-1.5"
                    >
                      <Phone className="w-3.5 h-3.5 text-[#78350F]" />
                      <span>اتصال</span>
                    </a>
                  </div>
                </div>

                {/* Quick Info Note */}
                <div className="p-3.5 rounded-xl bg-[#F7F4EE] border border-stone-200/70 text-xs text-stone-700 space-y-1.5 leading-relaxed">
                  <div className="font-bold text-stone-900">
                    حول الدعم الفني لتطبيق المحراب:
                  </div>
                  <p>
                    تطبيق «المحراب» وقف إسلامي مجاني خالٍ من الإعلانات، وجميع ملاحظاتكم تساهم في تحسين دقة المواقيت وخدمة كتاب الله وسنة نبيه ﷺ.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Personal Notes & Reflections Notebook View */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Add New Note Form */}
          <form
            onSubmit={handleAddNote}
            className="lg:col-span-5 bg-white border border-stone-200/90 rounded-2xl p-5 space-y-3.5 shadow-xs"
          >
            <div className="border-b border-stone-100 pb-2.5">
              <h2 className="font-display text-lg font-bold text-stone-900">
                إضافة ملاحظة أو فائدة جديدة
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                تُحفظ ملاحظاتك وفوائدك التدبرية محلياً على جهازك.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                التصنيف:
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {NOTE_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setNoteCategory(cat.id)}
                    className={`min-h-[36px] px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                      noteCategory === cat.id
                        ? 'bg-[#14532D] text-white border-[#14532D]'
                        : 'bg-[#FBF9F5] text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                عنوان الملاحظة:
              </label>
              <input
                type="text"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="مثال: تدبر في سورة الكهف..."
                className="w-full px-3 py-2 rounded-xl bg-[#FBF9F5] border border-stone-300 text-xs sm:text-sm text-stone-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                نص الملاحظة:
              </label>
              <textarea
                rows={4}
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="اكتب الفائدة أو الخاطرة أو الدعاء..."
                className="w-full px-3 py-2 rounded-xl bg-[#FBF9F5] border border-stone-300 text-xs sm:text-sm text-stone-900 leading-relaxed"
              />
            </div>

            <button
              type="submit"
              data-testid="save-personal-note-btn"
              className="w-full min-h-[42px] px-4 py-2 rounded-xl bg-[#14532D] hover:bg-[#14532D]/90 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>حفظ الملاحظة في الدفتر</span>
            </button>
          </form>

          {/* Saved Notes List */}
          <div className="lg:col-span-7 space-y-3.5">
            <div className="bg-white border border-stone-200/90 rounded-2xl p-4 space-y-3 shadow-xs">
              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث في ملاحظاتك المحفوظة..."
                    className="w-full pr-9 pl-3 py-2 rounded-xl bg-[#FBF9F5] border border-stone-200 text-xs text-stone-900"
                  />
                </div>
                <div className="flex items-center gap-1 overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setSelectedFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer ${
                      selectedFilter === 'all'
                        ? 'bg-[#14532D] text-white'
                        : 'bg-[#F4EFE6] text-stone-700'
                    }`}
                  >
                    الكل
                  </button>
                  {NOTE_CATEGORIES.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedFilter(c.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer ${
                        selectedFilter === c.id
                          ? 'bg-[#14532D] text-white'
                          : 'bg-[#F4EFE6] text-stone-700'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {filteredNotes.length === 0 ? (
              <div className="bg-white border border-stone-200/90 rounded-2xl p-8 text-center text-xs sm:text-sm text-stone-500">
                لا توجد ملاحظات مطابقة حالياً. يمكنك إضافة ملاحظة جديدة من النموذج الجانبي.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredNotes.map((note) => {
                  const catLabel =
                    NOTE_CATEGORIES.find((c) => c.id === note.category)?.label ||
                    'ملاحظة';
                  return (
                    <article
                      key={note.id}
                      className="bg-white border border-stone-200/90 rounded-2xl p-4 sm:p-5 space-y-2.5 shadow-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-[11px] text-[#78350F] font-semibold">
                            {catLabel}
                          </div>
                          <h3 className="font-display text-base sm:text-lg font-bold text-stone-900">
                            {note.title}
                          </h3>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCopyNote(note)}
                            className="p-1.5 rounded-lg bg-[#F7F4EE] hover:bg-stone-200 text-stone-700 text-xs flex items-center gap-1 cursor-pointer"
                            title="نسخ الملاحظة"
                          >
                            {copiedNoteId === note.id ? (
                              <Check className="w-3.5 h-3.5 text-[#14532D]" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteNote(note.id)}
                            className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 cursor-pointer"
                            title="حذف الملاحظة"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs sm:text-sm text-stone-700 leading-relaxed whitespace-pre-line">
                        {note.content}
                      </p>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
