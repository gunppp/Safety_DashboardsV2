import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertCircle,
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  Edit,
  Flame,
  Image as ImageIcon,
  Megaphone,
  Plus,
  Save,
  Shield,
  Target,
  Trash2,
  Upload,
  X,
  Zap,
} from "lucide-react";

type DayStatus = "safe" | "near_miss" | "accident" | null;

interface DailyStatistic {
  day: number;
  status: DayStatus;
}

interface MonthlyData {
  month: number;
  year: number;
  days: DailyStatistic[];
}

interface Announcement {
  id: string;
  text: string;
}

interface SafetyKpi {
  accidentCase: number;
  nearMissCase: number;
  firstAidCase: number;
  fireCase: number;
  ppeCompliance: number;
  trainingCompletion: number;
  ifr: number;
  isr: number;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const DEFAULT_ANNOUNCEMENTS: Announcement[] = [
  { id: "1", text: "PPE Audit ประจำสัปดาห์ทุกวันพฤหัสบดี เวลา 09:00 น." },
  { id: "2", text: "Emergency Drill ไตรมาสนี้กำหนดวันที่ 28 มีนาคม 2026" },
];

const DEFAULT_KPI: SafetyKpi = {
  accidentCase: 0,
  nearMissCase: 2,
  firstAidCase: 4,
  fireCase: 0,
  ppeCompliance: 98,
  trainingCompletion: 94,
  ifr: 0.0,
  isr: 1.2,
};

const DEFAULT_POLICY_LINES = [
  "ปฏิบัติตามกฎความปลอดภัยและสวม PPE ก่อนเข้าพื้นที่ผลิต",
  "แจ้ง Near Miss / Unsafe Condition ทันทีเมื่อพบความเสี่ยง",
  "หยุดงานทันทีเมื่อพบสภาพไม่ปลอดภัย (Stop Work Authority)",
  "ทุกคนมีส่วนร่วมรักษา Zero Accident Workplace",
];

const BASE_VIEWPORT = { width: 1920, height: 1080 };

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getResponsiveRootFontSize(width: number, height: number) {
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);
  const baseScale = Math.min(safeWidth / BASE_VIEWPORT.width, safeHeight / BASE_VIEWPORT.height);

  // Non-linear scaling keeps 4K readable on large TV screens without making laptop layouts overflow.
  const scaled = 16 * Math.pow(baseScale, 0.45);
  return clampNumber(scaled, 14, 24);
}

function createYearData(year: number): MonthlyData[] {
  return Array.from({ length: 12 }, (_, month) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return {
      month,
      year,
      days: Array.from({ length: daysInMonth }, (_, idx) => ({
        day: idx + 1,
        status: null,
      })),
    };
  });
}

function isValidMonthlyData(data: unknown, year: number): data is MonthlyData[] {
  if (!Array.isArray(data) || data.length !== 12) return false;
  return data.every((m, month) => {
    if (!m || typeof m !== "object") return false;
    const mm = m as MonthlyData;
    const expectedDays = new Date(year, month + 1, 0).getDate();
    return (
      mm.month === month &&
      mm.year === year &&
      Array.isArray(mm.days) &&
      mm.days.length === expectedDays
    );
  });
}

export function SafetyDashboard() {
  const nowReal = new Date();
  const [displayMonth, setDisplayMonth] = useState(nowReal.getMonth());
  const [currentYear, setCurrentYear] = useState(nowReal.getFullYear());
  const [currentTime, setCurrentTime] = useState(new Date());
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>(() =>
    createYearData(nowReal.getFullYear())
  );

  const [announcements, setAnnouncements] = useState<Announcement[]>(DEFAULT_ANNOUNCEMENTS);
  const [policyPoster, setPolicyPoster] = useState<string | null>(null);
  const [policyTitle, setPolicyTitle] = useState("Safety Policy");
  const [sloganTh, setSloganTh] = useState("ความปลอดภัย เริ่มที่ตัวเรา");
  const [sloganEn, setSloganEn] = useState("Safety Starts With Me");
  const [kpi, setKpi] = useState<SafetyKpi>(DEFAULT_KPI);

  const [isEditingAnnouncementId, setIsEditingAnnouncementId] = useState<string | null>(null);
  const [announcementDraft, setAnnouncementDraft] = useState("");
  const [isEditingSlogan, setIsEditingSlogan] = useState(false);
  const [sloganThDraft, setSloganThDraft] = useState("");
  const [sloganEnDraft, setSloganEnDraft] = useState("");
  const [isEditingPolicy, setIsEditingPolicy] = useState(false);
  const [policyTitleDraft, setPolicyTitleDraft] = useState("");
  const [policyLines, setPolicyLines] = useState<string[]>(DEFAULT_POLICY_LINES);
  const [policyLinesDraft, setPolicyLinesDraft] = useState<string>(DEFAULT_POLICY_LINES.join("\n"));
  const [isEditingKpi, setIsEditingKpi] = useState(false);
  const [kpiDraft, setKpiDraft] = useState<SafetyKpi>(DEFAULT_KPI);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const storageKey = `safety-dashboard-${currentYear}`;

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const root = document.documentElement;

    const applyResponsiveScale = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const baseScale = Math.min(width / BASE_VIEWPORT.width, height / BASE_VIEWPORT.height);
      const rootFontSize = getResponsiveRootFontSize(width, height);

      root.style.setProperty("--font-size", `${rootFontSize.toFixed(2)}px`);
      root.style.setProperty("--dashboard-scale", baseScale.toFixed(3));
      root.style.setProperty("--dashboard-width", `${width}px`);
      root.style.setProperty("--dashboard-height", `${height}px`);
    };

    applyResponsiveScale();
    window.addEventListener("resize", applyResponsiveScale);

    return () => {
      window.removeEventListener("resize", applyResponsiveScale);
    };
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        setMonthlyData(createYearData(currentYear));
        setAnnouncements(DEFAULT_ANNOUNCEMENTS);
        setPolicyPoster(null);
        setPolicyTitle("Safety Policy");
        setPolicyLines(DEFAULT_POLICY_LINES);
        setSloganTh("ความปลอดภัย เริ่มที่ตัวเรา");
        setSloganEn("Safety Starts With Me");
        setKpi(DEFAULT_KPI);
        return;
      }

      const parsed = JSON.parse(raw);
      setMonthlyData(
        isValidMonthlyData(parsed.monthlyData, currentYear)
          ? parsed.monthlyData
          : createYearData(currentYear)
      );
      setAnnouncements(
        Array.isArray(parsed.announcements) && parsed.announcements.length > 0
          ? parsed.announcements
          : DEFAULT_ANNOUNCEMENTS
      );
      setPolicyPoster(typeof parsed.policyPoster === "string" ? parsed.policyPoster : null);
      setPolicyTitle(typeof parsed.policyTitle === "string" ? parsed.policyTitle : "Safety Policy");
      setPolicyLines(
        Array.isArray(parsed.policyLines) && parsed.policyLines.length > 0
          ? parsed.policyLines
          : DEFAULT_POLICY_LINES
      );
      setSloganTh(typeof parsed.sloganTh === "string" ? parsed.sloganTh : "ความปลอดภัย เริ่มที่ตัวเรา");
      setSloganEn(typeof parsed.sloganEn === "string" ? parsed.sloganEn : "Safety Starts With Me");
      setKpi({ ...DEFAULT_KPI, ...(parsed.kpi ?? {}) });
    } catch {
      setMonthlyData(createYearData(currentYear));
      setAnnouncements(DEFAULT_ANNOUNCEMENTS);
      setPolicyPoster(null);
      setPolicyTitle("Safety Policy");
      setPolicyLines(DEFAULT_POLICY_LINES);
      setSloganTh("ความปลอดภัย เริ่มที่ตัวเรา");
      setSloganEn("Safety Starts With Me");
      setKpi(DEFAULT_KPI);
    }
  }, [storageKey, currentYear]);

  useEffect(() => {
    if (monthlyData.length !== 12) return;
    const payload = {
      monthlyData,
      announcements,
      policyPoster,
      policyTitle,
      policyLines,
      sloganTh,
      sloganEn,
      kpi,
    };
    localStorage.setItem(storageKey, JSON.stringify(payload));
  }, [monthlyData, announcements, policyPoster, policyTitle, policyLines, sloganTh, sloganEn, kpi, storageKey]);

  // Auto mark no-accident (safe) day: all past empty days + today after 16:00
  useEffect(() => {
    const runAutoFill = () => {
      const now = new Date();
      if (now.getFullYear() !== currentYear) return;

      setMonthlyData((prev) => {
        if (prev.length !== 12) return prev;
        let changed = false;
        const next = prev.map((m) => ({ ...m, days: m.days.map((d) => ({ ...d })) }));

        const mIdx = now.getMonth();
        const dToday = now.getDate();
        const cutoffPassed = now.getHours() > 16 || (now.getHours() === 16 && now.getMinutes() >= 0);

        next[mIdx].days.forEach((dayObj, idx) => {
          const dayNum = idx + 1;
          if (dayObj.status !== null) return;
          if (dayNum < dToday || (dayNum === dToday && cutoffPassed)) {
            dayObj.status = "safe";
            changed = true;
          }
        });

        return changed ? next : prev;
      });
    };

    runAutoFill();
    const interval = setInterval(runAutoFill, 60_000);
    return () => clearInterval(interval);
  }, [currentYear]);

  const currentMonthData = monthlyData[displayMonth];

  const safetyStreak = useMemo(() => {
    if (monthlyData.length !== 12) return 0;

    const flattened: Array<{ status: DayStatus; date: Date }> = [];
    monthlyData.forEach((m) => {
      m.days.forEach((d) => {
        flattened.push({
          status: d.status,
          date: new Date(m.year, m.month, d.day),
        });
      });
    });

    flattened.sort((a, b) => a.date.getTime() - b.date.getTime());

    let streak = 0;
    for (let i = flattened.length - 1; i >= 0; i--) {
      const item = flattened[i];
      if (item.status === null) continue;
      if (item.status === "accident") break;
      // safe + near miss both count as "no accident" streak
      streak += 1;
    }
    return streak;
  }, [monthlyData]);

  const monthSummary = useMemo(() => {
    if (!currentMonthData) {
      return { safe: 0, nearMiss: 0, accident: 0, filled: 0, total: 0 };
    }
    return currentMonthData.days.reduce(
      (acc, d) => {
        if (d.status === "safe") acc.safe += 1;
        if (d.status === "near_miss") acc.nearMiss += 1;
        if (d.status === "accident") acc.accident += 1;
        if (d.status !== null) acc.filled += 1;
        acc.total += 1;
        return acc;
      },
      { safe: 0, nearMiss: 0, accident: 0, filled: 0, total: 0 }
    );
  }, [currentMonthData]);

  const handleDayClick = (monthIndex: number, dayIndex: number) => {
    setMonthlyData((prev) => {
      const next = prev.map((m) => ({ ...m, days: m.days.map((d) => ({ ...d })) }));
      const current = next[monthIndex].days[dayIndex].status;
      const order: DayStatus[] = [null, "safe", "near_miss", "accident"];
      const nextStatus = order[(order.indexOf(current) + 1) % order.length];
      next[monthIndex].days[dayIndex].status = nextStatus;
      return next;
    });
  };

  const statusStyle = (status: DayStatus) => {
    switch (status) {
      case "safe":
        return "bg-emerald-500/95 text-white hover:bg-emerald-400";
      case "near_miss":
        return "bg-amber-500/95 text-slate-950 hover:bg-amber-400";
      case "accident":
        return "bg-red-500/95 text-white hover:bg-red-400";
      default:
        return "bg-slate-700/60 text-slate-200 hover:bg-slate-600";
    }
  };

  const statusText = (status: DayStatus) => {
    switch (status) {
      case "safe":
        return "No Accident";
      case "near_miss":
        return "Near Miss";
      case "accident":
        return "Accident";
      default:
        return "No Data";
    }
  };

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => setPolicyPoster(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleAddAnnouncement = () => {
    const next: Announcement = {
      id: Date.now().toString(),
      text: "ประกาศใหม่...",
    };
    setAnnouncements((prev) => [next, ...prev]);
    setIsEditingAnnouncementId(next.id);
    setAnnouncementDraft(next.text);
  };

  const handleEditAnnouncement = (id: string) => {
    const found = announcements.find((a) => a.id === id);
    if (!found) return;
    setIsEditingAnnouncementId(id);
    setAnnouncementDraft(found.text);
  };

  const handleSaveAnnouncement = () => {
    if (!isEditingAnnouncementId) return;
    setAnnouncements((prev) =>
      prev.map((a) => (a.id === isEditingAnnouncementId ? { ...a, text: announcementDraft.trim() || a.text } : a))
    );
    setIsEditingAnnouncementId(null);
    setAnnouncementDraft("");
  };

  const handleDeleteAnnouncement = (id: string) => {
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    if (isEditingAnnouncementId === id) {
      setIsEditingAnnouncementId(null);
      setAnnouncementDraft("");
    }
  };

  const handleSaveSlogan = () => {
    setSloganTh(sloganThDraft.trim() || sloganTh);
    setSloganEn(sloganEnDraft.trim() || sloganEn);
    setIsEditingSlogan(false);
  };

  const openSloganEditor = () => {
    setSloganThDraft(sloganTh);
    setSloganEnDraft(sloganEn);
    setIsEditingSlogan(true);
  };

  const openPolicyEditor = () => {
    setPolicyTitleDraft(policyTitle);
    setPolicyLinesDraft(policyLines.join("\n"));
    setIsEditingPolicy(true);
  };

  const handleSavePolicy = () => {
    setPolicyTitle(policyTitleDraft.trim() || policyTitle);
    const lines = policyLinesDraft
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    setPolicyLines(lines.length > 0 ? lines : DEFAULT_POLICY_LINES);
    setIsEditingPolicy(false);
  };

  const openKpiEditor = () => {
    setKpiDraft(kpi);
    setIsEditingKpi(true);
  };

  const handleSaveKpi = () => {
    const clampPercent = (n: number) => Math.max(0, Math.min(100, n));
    setKpi({
      accidentCase: Math.max(0, Number(kpiDraft.accidentCase) || 0),
      nearMissCase: Math.max(0, Number(kpiDraft.nearMissCase) || 0),
      firstAidCase: Math.max(0, Number(kpiDraft.firstAidCase) || 0),
      fireCase: Math.max(0, Number(kpiDraft.fireCase) || 0),
      ppeCompliance: clampPercent(Number(kpiDraft.ppeCompliance) || 0),
      trainingCompletion: clampPercent(Number(kpiDraft.trainingCompletion) || 0),
      ifr: Math.max(0, Number(kpiDraft.ifr) || 0),
      isr: Math.max(0, Number(kpiDraft.isr) || 0),
    });
    setIsEditingKpi(false);
  };

  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat("en-GB", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(date);

  const formatTime = (date: Date) =>
    new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(date);

  const monthStartOffset = currentMonthData
    ? new Date(currentYear, displayMonth, 1).getDay()
    : 0;

  return (
    <div className="dashboard-tv-root h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="dashboard-tv-shell h-full p-3 lg:p-4 flex flex-col gap-3">
        {/* Header */}
        <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 shadow-2xl px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="rounded-xl bg-emerald-500/15 border border-emerald-400/30 p-2">
                <Shield className="h-7 w-7 text-emerald-300" />
              </div>
              <div className="min-w-0">
                <p className="text-lg lg:text-xl font-bold tracking-wide truncate">Factory Safety Dashboard</p>
                <p className="text-xs lg:text-sm text-slate-300 truncate">{formatDate(currentTime)} • Auto Safe Mark เวลา 16:00 (No Accident)</p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right hidden md:block">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Live Time</p>
                <p className="font-mono font-bold text-emerald-300 text-xl lg:text-2xl">{formatTime(currentTime)}</p>
              </div>

              <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-700 rounded-xl p-1">
                <button
                  onClick={() => setCurrentYear((y) => y - 1)}
                  className="h-8 w-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
                  title="Previous year"
                >
                  −
                </button>
                <div className="px-2 font-semibold text-sm lg:text-base">{currentYear}</div>
                <button
                  onClick={() => setCurrentYear((y) => y + 1)}
                  className="h-8 w-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
                  title="Next year"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main body */}
        <div className="dashboard-main-grid flex-1 min-h-0 grid grid-cols-12 gap-3">
          {/* Left column */}
          <div className="col-span-12 xl:col-span-3 min-h-0 flex flex-col gap-3">
            {/* Slogan */}
            <div className="rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-emerald-700/30 via-emerald-900/30 to-slate-900 shadow-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-emerald-300" />
                  <h2 className="font-bold">Safety Slogan</h2>
                </div>
                {!isEditingSlogan ? (
                  <button
                    onClick={openSloganEditor}
                    className="h-8 px-2 rounded-lg bg-slate-800/90 hover:bg-slate-700 border border-slate-600 text-xs flex items-center gap-1"
                  >
                    <Edit className="h-3.5 w-3.5" /> Edit
                  </button>
                ) : (
                  <div className="flex gap-1">
                    <button
                      onClick={handleSaveSlogan}
                      className="h-8 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs flex items-center gap-1"
                    >
                      <Save className="h-3.5 w-3.5" /> Save
                    </button>
                    <button
                      onClick={() => setIsEditingSlogan(false)}
                      className="h-8 px-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs flex items-center gap-1"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {!isEditingSlogan ? (
                <div className="rounded-xl border border-emerald-400/20 bg-black/20 p-4 space-y-2">
                  <p className="text-xl lg:text-2xl font-bold italic text-center text-emerald-100">“{sloganTh}”</p>
                  <p className="text-sm lg:text-base italic text-center text-emerald-200/90">“{sloganEn}”</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    value={sloganThDraft}
                    onChange={(e) => setSloganThDraft(e.target.value)}
                    className="w-full rounded-lg bg-slate-900 border border-slate-600 px-3 py-2 text-sm"
                    placeholder="Slogan (TH)"
                  />
                  <input
                    value={sloganEnDraft}
                    onChange={(e) => setSloganEnDraft(e.target.value)}
                    className="w-full rounded-lg bg-slate-900 border border-slate-600 px-3 py-2 text-sm"
                    placeholder="Slogan (EN)"
                  />
                </div>
              )}
            </div>

            {/* Safety Streak */}
            <div className="rounded-2xl border border-amber-300/30 bg-gradient-to-br from-amber-500/20 via-orange-500/20 to-slate-900 p-4 shadow-xl">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-amber-200" />
                  <span className="font-bold">Safety Streak</span>
                </div>
                <Zap className="h-5 w-5 text-amber-200 animate-pulse" />
              </div>
              <div className="flex items-end gap-2">
                <span className="text-5xl lg:text-6xl leading-none font-black text-white">{safetyStreak}</span>
                <span className="text-amber-100 font-semibold mb-1">days without accident</span>
              </div>
              <p className="text-xs text-amber-100/80 mt-2">
                * นับรวมวัน Near Miss (ไม่มีอุบัติเหตุ) และจะหยุดนับเมื่อมี Accident
              </p>
            </div>

            {/* Policy */}
            <div className="flex-1 min-h-0 rounded-2xl border border-blue-400/20 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/40 p-4 shadow-xl flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Target className="h-5 w-5 text-blue-300" />
                  <h2 className="font-bold truncate">{policyTitle}</h2>
                </div>
                {!isEditingPolicy ? (
                  <button
                    onClick={openPolicyEditor}
                    className="h-8 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs flex items-center gap-1"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <div className="flex gap-1">
                    <button onClick={handleSavePolicy} className="h-8 px-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs flex items-center gap-1"><Save className="h-3.5 w-3.5" /></button>
                    <button onClick={() => setIsEditingPolicy(false)} className="h-8 px-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs"><X className="h-3.5 w-3.5" /></button>
                  </div>
                )}
              </div>

              {isEditingPolicy ? (
                <div className="space-y-2 mb-3">
                  <input
                    value={policyTitleDraft}
                    onChange={(e) => setPolicyTitleDraft(e.target.value)}
                    className="w-full rounded-lg bg-slate-900 border border-slate-600 px-3 py-2 text-sm"
                    placeholder="Policy title"
                  />
                  <textarea
                    value={policyLinesDraft}
                    onChange={(e) => setPolicyLinesDraft(e.target.value)}
                    className="w-full h-24 rounded-lg bg-slate-900 border border-slate-600 px-3 py-2 text-sm"
                    placeholder="1 บรรทัดต่อ 1 ข้อ"
                  />
                </div>
              ) : (
                <ul className="space-y-2 mb-3 text-sm text-slate-200">
                  {policyLines.map((line, idx) => (
                    <li key={`${line}-${idx}`} className="flex gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-300 mt-0.5 shrink-0" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                onChange={handleImageUpload}
                className="hidden"
              />

              <div className="mt-auto rounded-xl border border-slate-700 bg-slate-950/60 p-2">
                {policyPoster ? (
                  <div className="relative group h-40 lg:h-48">
                    <img src={policyPoster} alt="Safety policy poster" className="w-full h-full object-cover rounded-lg" />
                    <button
                      onClick={handleUploadClick}
                      className="absolute inset-0 rounded-lg bg-black/55 opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
                    >
                      <span className="text-sm flex items-center gap-2"><Upload className="h-4 w-4" /> Change Poster</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleUploadClick}
                    className="w-full h-40 lg:h-48 rounded-lg border-2 border-dashed border-blue-400/30 hover:border-blue-300 bg-blue-500/5 hover:bg-blue-500/10 transition flex flex-col items-center justify-center gap-2 text-slate-300"
                  >
                    <ImageIcon className="h-6 w-6" />
                    <span className="font-medium">Upload Safety Policy Poster</span>
                    <span className="text-xs text-slate-400">PNG / JPG</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Middle column */}
          <div className="col-span-12 xl:col-span-5 min-h-0 flex flex-col gap-3">
            {/* KPI & Targets */}
            <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-4 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-emerald-300" />
                  <h2 className="font-bold">Safety Data / KPI</h2>
                </div>
                {!isEditingKpi ? (
                  <button
                    onClick={openKpiEditor}
                    className="h-8 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs flex items-center gap-1"
                  >
                    <Edit className="h-3.5 w-3.5" /> Edit KPI
                  </button>
                ) : (
                  <div className="flex gap-1">
                    <button onClick={handleSaveKpi} className="h-8 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs flex items-center gap-1"><Save className="h-3.5 w-3.5" /> Save</button>
                    <button onClick={() => setIsEditingKpi(false)} className="h-8 px-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs"><X className="h-3.5 w-3.5" /></button>
                  </div>
                )}
              </div>

              {isEditingKpi && (
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {(
                    [
                      ["accidentCase", "Accident"],
                      ["nearMissCase", "Near Miss"],
                      ["firstAidCase", "First Aid"],
                      ["fireCase", "Fire Case"],
                      ["ppeCompliance", "PPE %"],
                      ["trainingCompletion", "Training %"],
                      ["ifr", "IFR"],
                      ["isr", "ISR"],
                    ] as Array<[keyof SafetyKpi, string]>
                  ).map(([field, label]) => (
                    <label key={field} className="text-xs text-slate-300">
                      <span className="mb-1 block">{label}</span>
                      <input
                        type="number"
                        step={field === "ifr" || field === "isr" ? "0.1" : "1"}
                        value={kpiDraft[field]}
                        onChange={(e) =>
                          setKpiDraft((prev) => ({
                            ...prev,
                            [field]: Number(e.target.value),
                          }))
                        }
                        className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-1.5 text-sm"
                      />
                    </label>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
                <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-3">
                  <div className="flex items-center justify-between text-xs text-red-200"><span>Accident</span><AlertCircle className="h-4 w-4" /></div>
                  <div className="text-2xl font-bold text-red-300">{kpi.accidentCase}</div>
                </div>
                <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-3">
                  <div className="flex items-center justify-between text-xs text-amber-100"><span>Near Miss</span><Activity className="h-4 w-4" /></div>
                  <div className="text-2xl font-bold text-amber-300">{kpi.nearMissCase}</div>
                </div>
                <div className="rounded-xl border border-blue-400/20 bg-blue-500/10 p-3">
                  <div className="flex items-center justify-between text-xs text-blue-100"><span>First Aid</span><CheckCircle2 className="h-4 w-4" /></div>
                  <div className="text-2xl font-bold text-blue-300">{kpi.firstAidCase}</div>
                </div>
                <div className="rounded-xl border border-orange-400/20 bg-orange-500/10 p-3">
                  <div className="flex items-center justify-between text-xs text-orange-100"><span>Fire Case</span><Flame className="h-4 w-4" /></div>
                  <div className="text-2xl font-bold text-orange-300">{kpi.fireCase}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3">
                  <div className="text-xs text-emerald-100 mb-1">PPE Compliance</div>
                  <div className="flex items-end justify-between gap-2">
                    <div className="text-2xl font-bold text-emerald-300">{kpi.ppeCompliance}%</div>
                    <div className="text-xs text-slate-300">Target ≥ 95%</div>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-700 overflow-hidden">
                    <div className="h-full bg-emerald-400" style={{ width: `${Math.max(0, Math.min(100, kpi.ppeCompliance))}%` }} />
                  </div>
                </div>
                <div className="rounded-xl border border-indigo-400/20 bg-indigo-500/10 p-3">
                  <div className="text-xs text-indigo-100 mb-1">Training Completion</div>
                  <div className="flex items-end justify-between gap-2">
                    <div className="text-2xl font-bold text-indigo-300">{kpi.trainingCompletion}%</div>
                    <div className="text-xs text-slate-300">Target 100%</div>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-700 overflow-hidden">
                    <div className="h-full bg-indigo-400" style={{ width: `${Math.max(0, Math.min(100, kpi.trainingCompletion))}%` }} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 mt-3">
                {[
                  { label: "Zero Fatality", value: "0", tone: "emerald" },
                  { label: "IFR Target", value: "0", tone: "blue" },
                  { label: "ISR", value: kpi.isr.toFixed(1), tone: "violet" },
                  { label: "IFR", value: kpi.ifr.toFixed(1), tone: "cyan" },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl bg-slate-950/70 border border-slate-700 p-2 text-center">
                    <div className="text-[0.65rem] lg:text-xs text-slate-400">{item.label}</div>
                    <div className="text-lg lg:text-xl font-bold text-white mt-1">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Announcement */}
            <div className="flex-1 min-h-0 rounded-2xl border border-slate-700 bg-slate-900/80 p-4 shadow-xl flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Megaphone className="h-5 w-5 text-amber-300" />
                  <h2 className="font-bold">Announcements</h2>
                </div>
                <button
                  onClick={handleAddAnnouncement}
                  className="h-8 px-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Add
                </button>
              </div>

              <div className="tv-scroll flex-1 min-h-0 overflow-y-auto pr-1 space-y-2">
                {announcements.map((item, idx) => (
                  <div key={item.id} className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">
                    {isEditingAnnouncementId === item.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={announcementDraft}
                          onChange={(e) => setAnnouncementDraft(e.target.value)}
                          className="w-full h-20 rounded-lg bg-slate-900 border border-slate-600 px-3 py-2 text-sm"
                        />
                        <div className="flex justify-end gap-2">
                          <button onClick={handleSaveAnnouncement} className="h-8 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs flex items-center gap-1"><Save className="h-3.5 w-3.5" /> Save</button>
                          <button onClick={() => setIsEditingAnnouncementId(null)} className="h-8 px-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs flex items-center gap-1"><X className="h-3.5 w-3.5" /> Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <div className="h-7 w-7 shrink-0 rounded-lg bg-amber-500/20 border border-amber-400/20 text-amber-300 flex items-center justify-center text-xs font-bold">
                          {idx + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-slate-100 leading-relaxed break-words">{item.text}</p>
                        </div>
                        <div className="shrink-0 flex gap-1">
                          <button onClick={() => handleEditAnnouncement(item.id)} className="h-8 w-8 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600"><Edit className="h-4 w-4 mx-auto" /></button>
                          <button onClick={() => handleDeleteAnnouncement(item.id)} className="h-8 w-8 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-400/20 text-red-300"><Trash2 className="h-4 w-4 mx-auto" /></button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="col-span-12 xl:col-span-4 min-h-0 flex flex-col gap-3">
            {/* Calendar panel */}
            <div className="flex-1 min-h-0 rounded-2xl border border-slate-700 bg-slate-900/80 shadow-xl flex flex-col overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-700 bg-slate-900/95">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-emerald-300" />
                    <div>
                      <h2 className="font-bold">Daily Safety Calendar</h2>
                      <p className="text-xs text-slate-400">คลิกวันที่เพื่อเปลี่ยนสถานะ: Safe → Near Miss → Accident</p>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold">
                    {MONTHS[displayMonth]} {currentYear}
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded bg-emerald-500" />Safe</div>
                    <div className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded bg-amber-500" />Near Miss</div>
                    <div className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded bg-red-500" />Accident</div>
                  </div>
                </div>
              </div>

              <div className="px-3 pt-3">
                <div className="grid grid-cols-7 gap-1 text-[0.7rem] lg:text-xs text-slate-400 mb-1">
                  {DAY_HEADERS.map((d) => (
                    <div key={d} className="text-center py-1 font-semibold">{d}</div>
                  ))}
                </div>
              </div>

              <div className="flex-1 min-h-0 px-3 pb-3">
                {currentMonthData && (
                  <div className="h-full grid grid-cols-7 gap-1 auto-rows-fr">
                    {Array.from({ length: monthStartOffset }).map((_, i) => (
                      <div key={`empty-${i}`} />
                    ))}

                    {currentMonthData.days.map((day, idx) => (
                      <button
                        key={day.day}
                        onClick={() => handleDayClick(displayMonth, idx)}
                        className={`rounded-lg text-xs lg:text-sm font-bold transition border border-white/5 ${statusStyle(day.status)}`}
                        title={`Day ${day.day} - ${statusText(day.status)}`}
                      >
                        {day.day}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Summary + Year overview */}
            <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-4 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-300" />
                  <h3 className="font-bold text-sm">Safety Month Summary</h3>
                </div>
                <span className="text-xs text-slate-400">Filled {monthSummary.filled}/{monthSummary.total}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="rounded-lg p-2 bg-emerald-500/10 border border-emerald-400/20 text-center">
                  <div className="text-[0.7rem] text-emerald-100">Safe</div>
                  <div className="font-bold text-emerald-300 text-lg">{monthSummary.safe}</div>
                </div>
                <div className="rounded-lg p-2 bg-amber-500/10 border border-amber-400/20 text-center">
                  <div className="text-[0.7rem] text-amber-100">Near Miss</div>
                  <div className="font-bold text-amber-300 text-lg">{monthSummary.nearMiss}</div>
                </div>
                <div className="rounded-lg p-2 bg-red-500/10 border border-red-400/20 text-center">
                  <div className="text-[0.7rem] text-red-100">Accident</div>
                  <div className="font-bold text-red-300 text-lg">{monthSummary.accident}</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {monthlyData.map((m) => {
                  const safeCount = m.days.filter((d) => d.status === "safe").length;
                  const accidentCount = m.days.filter((d) => d.status === "accident").length;
                  const isActive = m.month === displayMonth;
                  return (
                    <button
                      key={m.month}
                      onClick={() => setDisplayMonth(m.month)}
                      className={`rounded-lg border p-2 text-center transition ${
                        isActive
                          ? "bg-blue-600/20 border-blue-400/40"
                          : "bg-slate-950/70 border-slate-700 hover:bg-slate-800"
                      }`}
                    >
                      <div className="text-xs font-semibold">{MONTHS[m.month].slice(0, 3)}</div>
                      <div className="text-[0.65rem] text-slate-400 mt-1">{safeCount} safe</div>
                      <div className={`text-[0.65rem] ${accidentCount > 0 ? "text-red-300" : "text-slate-500"}`}>
                        {accidentCount} acc
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
