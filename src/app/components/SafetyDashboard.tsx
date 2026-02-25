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
  GripHorizontal,
  GripVertical,
  Image as ImageIcon,
  Megaphone,
  Plus,
  Save,
  Shield,
  Target,
  Trash2,
  Upload,
  Zap,
} from "lucide-react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";

type DayStatus = "safe" | "nearMiss" | "accident" | null;

interface DailyStatistic {
  day: number;
  status: DayStatus;
}

interface MonthlyData {
  month: number;
  year: number;
  completed: boolean;
  days: DailyStatistic[];
}

interface Announcement {
  id: string;
  text: string;
}

const STORAGE_KEY = "safety-dashboard-layout-data-v3";

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

const DAYS_EN = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const DEFAULT_ANNOUNCEMENTS: Announcement[] = [
  { id: "1", text: "Daily PPE audit at 08:30 before line start." },
  { id: "2", text: "Forklift speed limit in warehouse zone: 10 km/h." },
];

function createYearData(year: number): MonthlyData[] {
  const initData: MonthlyData[] = [];
  for (let i = 0; i < 12; i++) {
    const daysInMonth = new Date(year, i + 1, 0).getDate();
    const days: DailyStatistic[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({ day, status: null });
    }
    initData.push({ month: i, year, completed: false, days });
  }
  return initData;
}

function ResizeHandle({ axis }: { axis: "horizontal" | "vertical" }) {
  return (
    <PanelResizeHandle
      className={`resize-handle ${axis === "horizontal" ? "resize-handle-col" : "resize-handle-row"}`}
    >
      <div className="resize-handle-pill" aria-hidden>
        {axis === "horizontal" ? (
          <GripVertical className="resize-handle-icon" />
        ) : (
          <GripHorizontal className="resize-handle-icon" />
        )}
      </div>
    </PanelResizeHandle>
  );
}

export function SafetyDashboard() {
  const now = new Date();
  const currentYear = now.getFullYear();

  const [displayMonth, setDisplayMonth] = useState(now.getMonth());
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>(() =>
    createYearData(currentYear),
  );
  const [safetyStreak, setSafetyStreak] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [policyImage, setPolicyImage] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>(DEFAULT_ANNOUNCEMENTS);
  const [isEditingAnnouncement, setIsEditingAnnouncement] = useState(false);
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as {
        year?: number;
        displayMonth?: number;
        monthlyData?: MonthlyData[];
        announcements?: Announcement[];
        policyImage?: string | null;
      };

      if (parsed.year === currentYear && Array.isArray(parsed.monthlyData)) {
        setMonthlyData(parsed.monthlyData);
      }
      if (typeof parsed.displayMonth === "number") {
        setDisplayMonth(Math.max(0, Math.min(11, parsed.displayMonth)));
      }
      if (Array.isArray(parsed.announcements) && parsed.announcements.length > 0) {
        setAnnouncements(parsed.announcements);
      }
      if (typeof parsed.policyImage === "string" || parsed.policyImage === null) {
        setPolicyImage(parsed.policyImage ?? null);
      }
    } catch {
      // ignore invalid storage
    }
  }, [currentYear]);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        year: currentYear,
        displayMonth,
        monthlyData,
        announcements,
        policyImage,
      }),
    );
  }, [currentYear, displayMonth, monthlyData, announcements, policyImage]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-fill past days as Safe and auto-run today at 16:00
  useEffect(() => {
    const autoFillPastDays = () => {
      const nowDate = new Date();
      const currentMonth = nowDate.getMonth();
      const currentDay = nowDate.getDate();
      const currentHours = nowDate.getHours();
      const currentMinutes = nowDate.getMinutes();

      setMonthlyData((prev) => {
        const monthData = prev[currentMonth];
        if (!monthData) return prev;

        let hasChanges = false;
        const newData = prev.map((m, idx) => {
          if (idx !== currentMonth) return m;
          const clonedDays = m.days.map((d) => ({ ...d }));

          clonedDays.forEach((dayItem, index) => {
            const dayNum = index + 1;
            if (dayNum < currentDay && dayItem.status === null) {
              dayItem.status = "safe";
              hasChanges = true;
            }
            if (
              dayNum === currentDay &&
              dayItem.status === null &&
              (currentHours > 16 || (currentHours === 16 && currentMinutes >= 0))
            ) {
              dayItem.status = "safe";
              hasChanges = true;
            }
          });

          return {
            ...m,
            days: clonedDays,
            completed: clonedDays.every((d) => d.status !== null),
          };
        });

        return hasChanges ? newData : prev;
      });
    };

    autoFillPastDays();
    const interval = setInterval(autoFillPastDays, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!monthlyData.length) return;

    let streak = 0;
    let stop = false;

    for (let m = displayMonth; m >= 0 && !stop; m--) {
      const month = monthlyData[m];
      if (!month) continue;

      const lastTrackedIndex =
        m === displayMonth
          ? month.days.reduce((acc, day, idx) => (day.status !== null ? idx : acc), -1)
          : month.days.length - 1;

      for (let d = lastTrackedIndex; d >= 0 && !stop; d--) {
        const status = month.days[d]?.status;
        if (status === "safe") streak += 1;
        else if (status === "nearMiss" || status === "accident") stop = true;
      }
    }

    setSafetyStreak(streak);
  }, [monthlyData, displayMonth]);

  const handleDayClick = (monthIndex: number, dayIndex: number) => {
    setMonthlyData((prev) => {
      const next = prev.map((month, idx) => {
        if (idx !== monthIndex) return month;

        const days = month.days.map((day, dIdx) => {
          if (dIdx !== dayIndex) return day;
          let nextStatus: DayStatus = null;
          if (day.status === null) nextStatus = "safe";
          else if (day.status === "safe") nextStatus = "nearMiss";
          else if (day.status === "nearMiss") nextStatus = "accident";
          else nextStatus = null;
          return { ...day, status: nextStatus };
        });

        return {
          ...month,
          days,
          completed: days.every((d) => d.status !== null),
        };
      });

      const selectedMonth = next[monthIndex];
      if (selectedMonth?.completed && monthIndex === displayMonth && monthIndex < 11) {
        setDisplayMonth(monthIndex + 1);
      }

      return next;
    });
  };

  const handleMonthSelect = (monthIndex: number) => setDisplayMonth(monthIndex);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = (e) => setPolicyImage((e.target?.result as string) ?? null);
    reader.readAsDataURL(file);
  };

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleAddAnnouncement = () => {
    const id = Date.now().toString();
    const newAnnouncement = { id, text: "New safety announcement..." };
    setAnnouncements((prev) => [...prev, newAnnouncement]);
    setIsEditingAnnouncement(true);
    setEditingAnnouncementId(id);
    setEditText(newAnnouncement.text);
  };

  const handleEditAnnouncement = (id: string) => {
    const target = announcements.find((a) => a.id === id);
    if (!target) return;
    setIsEditingAnnouncement(true);
    setEditingAnnouncementId(id);
    setEditText(target.text);
  };

  const handleSaveAnnouncement = () => {
    if (!editingAnnouncementId) return;
    setAnnouncements((prev) =>
      prev.map((a) => (a.id === editingAnnouncementId ? { ...a, text: editText.trim() || a.text } : a)),
    );
    setIsEditingAnnouncement(false);
    setEditingAnnouncementId(null);
    setEditText("");
  };

  const handleCancelEdit = () => {
    setIsEditingAnnouncement(false);
    setEditingAnnouncementId(null);
    setEditText("");
  };

  const handleDeleteAnnouncement = (id: string) => {
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    if (editingAnnouncementId === id) {
      handleCancelEdit();
    }
  };

  const getStatusChipClass = (status: DayStatus) => {
    switch (status) {
      case "safe":
        return "status-safe";
      case "nearMiss":
        return "status-nearmiss";
      case "accident":
        return "status-accident";
      default:
        return "status-empty";
    }
  };

  const getStatusText = (status: DayStatus) => {
    switch (status) {
      case "safe":
        return "Safe";
      case "nearMiss":
        return "Near Miss";
      case "accident":
        return "Accident";
      default:
        return "No Data";
    }
  };

  const statistics = {
    accidentCase: 1,
    nearMissCase: 5,
    firstAidCase: 3,
    fireCase: 0,
    isr: 1.2,
    ifr: 0.6,
  };

  const currentMonthData = monthlyData[displayMonth];

  const monthSummary = useMemo(() => {
    if (!currentMonthData) {
      return { safe: 0, nearMiss: 0, accident: 0, tracked: 0 };
    }
    return currentMonthData.days.reduce(
      (acc, day) => {
        if (day.status === "safe") acc.safe += 1;
        if (day.status === "nearMiss") acc.nearMiss += 1;
        if (day.status === "accident") acc.accident += 1;
        if (day.status) acc.tracked += 1;
        return acc;
      },
      { safe: 0, nearMiss: 0, accident: 0, tracked: 0 },
    );
  }, [currentMonthData]);

  const formatDate = (date: Date) => {
    const dayName = DAYS_EN[date.getDay()];
    const day = date.getDate();
    const month = MONTHS[date.getMonth()];
    const year = date.getFullYear();
    return `${dayName}, ${month} ${day}, ${year}`;
  };

  const formatTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const seconds = date.getSeconds().toString().padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  };

  return (
    <div className="safety-shell dashboard-container h-screen w-screen overflow-hidden flex flex-col">
      <div className="tv-header dashboard-header rounded-xl">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center section-gap min-w-0">
            <div className="tv-icon-wrap">
              <Clock className="header-icon text-sky-700 flex-shrink-0" />
            </div>
            <div className="min-w-0">
              <p className="header-date font-bold text-slate-800 truncate">{formatDate(currentTime)}</p>
              <p className="header-subtitle text-slate-600">
                Safety Dashboard • {currentYear} • TV Resizable Layout
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="header-time font-bold font-mono tracking-wider text-sky-700">
              {formatTime(currentTime)}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <PanelGroup direction="vertical" autoSaveId="safety-main-vertical" className="h-full">
          <Panel defaultSize={72} minSize={45}>
            <PanelGroup direction="horizontal" autoSaveId="safety-top-horizontal" className="h-full">
              <Panel defaultSize={27} minSize={18}>
                <PanelGroup direction="vertical" autoSaveId="safety-left-vertical" className="h-full">
                  <Panel defaultSize={64} minSize={35}>
                    <div className="panel-wrap h-full">
                      <div className="tv-card tv-card-blue h-full flex flex-col justify-center section-padding">
                        <div className="flex items-center slogan-gap mb-2">
                          <Shield className="slogan-icon text-sky-700 flex-shrink-0" />
                          <h2 className="slogan-title font-bold text-slate-800">Safety Slogan</h2>
                        </div>
                        <div className="rounded-xl bg-white/85 border border-sky-100 section-padding">
                          <p className="slogan-text italic font-bold mb-1 text-center text-slate-800">
                            “ความปลอดภัยเป็นหน้าที่ของทุกคน”
                          </p>
                          <p className="slogan-text-sm italic text-center text-sky-700">
                            “Safety is Everyone&apos;s Responsibility”
                          </p>
                        </div>
                      </div>
                    </div>
                  </Panel>
                  <ResizeHandle axis="vertical" />
                  <Panel defaultSize={36} minSize={22}>
                    <div className="panel-wrap h-full">
                      <div className="tv-card tv-card-yellow h-full flex flex-col justify-center section-padding-sm">
                        <div className="flex items-center justify-between streak-padding">
                          <div className="flex items-center streak-gap">
                            <Award className="streak-icon text-amber-700" />
                            <div>
                              <p className="streak-title font-bold text-slate-700">Safety Streak</p>
                              <div className="flex items-baseline streak-gap-sm">
                                <span className="streak-number font-bold text-emerald-700">{safetyStreak}</span>
                                <span className="streak-label text-slate-700 font-semibold">Days</span>
                              </div>
                            </div>
                          </div>
                          <Zap className="streak-icon text-amber-600 animate-pulse" />
                        </div>
                      </div>
                    </div>
                  </Panel>
                </PanelGroup>
              </Panel>

              <ResizeHandle axis="horizontal" />

              <Panel defaultSize={40} minSize={24}>
                <PanelGroup direction="vertical" autoSaveId="safety-center-vertical" className="h-full">
                  <Panel defaultSize={38} minSize={24}>
                    <div className="panel-wrap h-full">
                      <div className="tv-card h-full section-padding-sm">
                        <h3 className="section-title font-bold text-slate-800 flex items-center">
                          <Target className="section-icon text-emerald-600" />
                          Safety Target
                        </h3>
                        <div className="grid grid-cols-4 target-grid h-[calc(100%-2rem)]">
                          <div className="target-tile target-green">
                            <p className="target-label">Zero Fatality</p>
                            <p className="target-value">0</p>
                          </div>
                          <div className="target-tile target-blue">
                            <p className="target-label">IFR Target</p>
                            <p className="target-value">0</p>
                          </div>
                          <div className="target-tile target-yellow">
                            <p className="target-label">ISR Target</p>
                            <p className="target-value">&lt; 3.0</p>
                          </div>
                          <div className="target-tile target-green-soft">
                            <p className="target-label">Fire Target</p>
                            <p className="target-value">0</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Panel>

                  <ResizeHandle axis="vertical" />

                  <Panel defaultSize={62} minSize={30}>
                    <div className="panel-wrap h-full">
                      <div className="tv-card h-full section-padding-sm">
                        <h3 className="section-title font-bold text-slate-800 flex items-center">
                          <Activity className="section-icon text-sky-600" />
                          Safety Data
                        </h3>
                        <div className="grid grid-cols-3 stat-grid h-[calc(100%-2rem)]">
                          <div className="stat-tile stat-red">
                            <p className="stat-label">Accident</p>
                            <p className="stat-value">{statistics.accidentCase}</p>
                            <AlertCircle className="stat-icon mx-auto" />
                          </div>
                          <div className="stat-tile stat-yellow">
                            <p className="stat-label">Near Miss</p>
                            <p className="stat-value">{statistics.nearMissCase}</p>
                            <Activity className="stat-icon mx-auto" />
                          </div>
                          <div className="stat-tile stat-blue">
                            <p className="stat-label">First Aid</p>
                            <p className="stat-value">{statistics.firstAidCase}</p>
                            <CheckCircle2 className="stat-icon mx-auto" />
                          </div>
                          <div className="stat-tile stat-orange">
                            <p className="stat-label">Fire Case</p>
                            <p className="stat-value">{statistics.fireCase}</p>
                            <Flame className="stat-icon mx-auto" />
                          </div>
                          <div className="stat-tile stat-green">
                            <p className="stat-label">ISR</p>
                            <p className="stat-value">{statistics.isr}</p>
                          </div>
                          <div className="stat-tile stat-cyan">
                            <p className="stat-label">IFR</p>
                            <p className="stat-value">{statistics.ifr}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Panel>
                </PanelGroup>
              </Panel>

              <ResizeHandle axis="horizontal" />

              <Panel defaultSize={33} minSize={22}>
                <PanelGroup direction="vertical" autoSaveId="safety-right-vertical" className="h-full">
                  <Panel defaultSize={56} minSize={28}>
                    <div className="panel-wrap h-full">
                      <div className="tv-card tv-card-yellow h-full section-padding-sm overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between announcement-header">
                          <h3 className="announcement-title font-bold text-slate-800 flex items-center">
                            <Megaphone className="section-icon text-amber-600" />
                            Announcement ({announcements.length})
                          </h3>
                          <button onClick={handleAddAnnouncement} className="announcement-btn tv-btn-blue rounded-lg">
                            <Plus className="announcement-btn-icon" /> Add
                          </button>
                        </div>

                        <div className="announcement-list flex-1 overflow-y-auto pr-1">
                          {announcements.map((announcement, index) => (
                            <div key={announcement.id} className="announcement-card">
                              {isEditingAnnouncement && editingAnnouncementId === announcement.id ? (
                                <div className="flex announcement-item items-start">
                                  <textarea
                                    value={editText}
                                    onChange={(e) => setEditText(e.target.value)}
                                    className="announcement-textarea flex-1 rounded-lg border border-amber-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-300"
                                  />
                                  <div className="flex flex-col announcement-action-btn">
                                    <button onClick={handleSaveAnnouncement} className="announcement-edit-btn tv-btn-green rounded-md">
                                      <Save className="announcement-action-icon" />
                                    </button>
                                    <button onClick={handleCancelEdit} className="announcement-edit-btn tv-btn-gray rounded-md">
                                      <Trash2 className="announcement-action-icon" />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-start announcement-item">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start announcement-text">
                                      <span className="announcement-number text-amber-700 font-bold">{index + 1}.</span>
                                      <p className="announcement-text text-slate-800 font-medium leading-relaxed">
                                        {announcement.text}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex announcement-action-btn">
                                    <button
                                      onClick={() => handleEditAnnouncement(announcement.id)}
                                      className="announcement-edit-btn tv-btn-yellow rounded-md"
                                    >
                                      <Edit className="announcement-edit-icon" />
                                    </button>
                                    {announcements.length > 1 && (
                                      <button
                                        onClick={() => handleDeleteAnnouncement(announcement.id)}
                                        className="announcement-edit-btn tv-btn-red rounded-md"
                                      >
                                        <Trash2 className="announcement-edit-icon" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Panel>

                  <ResizeHandle axis="vertical" />

                  <Panel defaultSize={44} minSize={22}>
                    <div className="panel-wrap h-full">
                      <div className="tv-card tv-card-blue h-full section-padding-sm flex flex-col">
                        <h3 className="policy-title font-bold text-slate-800 flex items-center">
                          <Shield className="section-icon text-sky-700" />
                          Safety Policy
                        </h3>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/jpeg,image/jpg,image/png"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                        <div className="flex-1 min-h-0">
                          {policyImage ? (
                            <div className="relative group h-full">
                              <img
                                src={policyImage}
                                alt="Safety policy poster"
                                className="w-full h-full object-cover rounded-xl border border-sky-100"
                              />
                              <button
                                onClick={handleUploadClick}
                                className="absolute inset-0 bg-slate-900/45 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center"
                              >
                                <div className="text-center text-white">
                                  <Upload className="policy-change-icon mx-auto" />
                                  <p className="policy-change-text font-semibold">Change Poster</p>
                                </div>
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={handleUploadClick}
                              className="policy-upload-container w-full h-full border-2 border-dashed border-sky-300 hover:border-sky-500 rounded-xl text-center bg-white/70 hover:bg-white transition-all cursor-pointer group flex flex-col items-center justify-center"
                            >
                              <ImageIcon className="policy-upload-icon text-sky-400 group-hover:text-sky-600 transition-colors" />
                              <p className="policy-upload-text text-slate-700 font-semibold">Upload Safety Policy Poster</p>
                              <p className="policy-upload-hint text-slate-500">JPG, JPEG, PNG</p>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </Panel>
                </PanelGroup>
              </Panel>
            </PanelGroup>
          </Panel>

          <ResizeHandle axis="vertical" />

          <Panel defaultSize={28} minSize={20}>
            <PanelGroup direction="horizontal" autoSaveId="safety-bottom-horizontal" className="h-full">
              <Panel defaultSize={74} minSize={55}>
                <div className="panel-wrap h-full">
                  <div className="tv-card h-full overflow-hidden flex flex-col">
                    <div className="calendar-head-light calendar-header">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="calendar-icon text-emerald-700" />
                          <div>
                            <div className="calendar-title font-bold text-slate-800">
                              {currentMonthData && MONTHS[displayMonth]} {currentYear}
                            </div>
                            <div className="calendar-subtitle text-slate-600">Safety Calendar • Click day to change status</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="flex items-center calendar-legend">
                            <div className="flex items-center calendar-legend-item">
                              <div className="calendar-legend-dot rounded status-safe"></div>
                              <span className="calendar-legend-text text-slate-700">Safe</span>
                            </div>
                            <div className="flex items-center calendar-legend-item">
                              <div className="calendar-legend-dot rounded status-nearmiss"></div>
                              <span className="calendar-legend-text text-slate-700">Near Miss</span>
                            </div>
                            <div className="flex items-center calendar-legend-item">
                              <div className="calendar-legend-dot rounded status-accident"></div>
                              <span className="calendar-legend-text text-slate-700">Accident</span>
                            </div>
                          </div>
                          {currentMonthData?.completed && (
                            <div className="calendar-complete rounded-lg">
                              <CheckCircle2 className="calendar-complete-icon text-white" />
                              <span className="calendar-complete-text font-semibold text-white">Complete</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="calendar-grid-container flex-1 min-h-0">
                      {currentMonthData && (
                        <div className="h-full rounded-xl bg-slate-50 border border-slate-200 calendar-grid-padding flex flex-col">
                          <div className="grid grid-cols-7 calendar-grid-header">
                            {DAYS_EN.map((day) => (
                              <div key={day} className="text-center calendar-day-header font-bold text-slate-600">
                                {day}
                              </div>
                            ))}
                          </div>
                          <div className="flex-1 grid grid-cols-7 calendar-grid content-start auto-rows-fr min-h-0">
                            {Array.from({ length: new Date(currentYear, displayMonth, 1).getDay() }).map((_, i) => (
                              <div key={`empty-${i}`} />
                            ))}
                            {currentMonthData.days.map((day, dayIndex) => (
                              <button
                                key={day.day}
                                onClick={() => handleDayClick(displayMonth, dayIndex)}
                                className={`calendar-day w-full h-full min-h-0 rounded-lg flex items-center justify-center font-bold transition-all duration-150 shadow-sm hover:shadow-md hover:scale-[1.02] ${getStatusChipClass(day.status)} ${day.status ? "text-white" : "text-slate-700"}`}
                                title={`Day ${day.day} - ${getStatusText(day.status)}`}
                              >
                                {day.day}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Panel>

              <ResizeHandle axis="horizontal" />

              <Panel defaultSize={26} minSize={18}>
                <div className="panel-wrap h-full">
                  <div className="tv-card h-full section-padding-sm flex flex-col">
                    <h3 className="year-overview-header font-bold text-slate-800 flex items-center">
                      <Calendar className="year-overview-icon text-sky-600" />
                      Year Overview {currentYear}
                    </h3>

                    <div className="month-summary-box mb-2">
                      <div className="month-summary-title">{MONTHS[displayMonth]} Summary</div>
                      <div className="month-summary-grid">
                        <div><span>Safe</span><strong>{monthSummary.safe}</strong></div>
                        <div><span>Near Miss</span><strong>{monthSummary.nearMiss}</strong></div>
                        <div><span>Accident</span><strong>{monthSummary.accident}</strong></div>
                        <div><span>Tracked</span><strong>{monthSummary.tracked}</strong></div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 year-grid flex-1 overflow-auto pr-1">
                      {monthlyData.map((monthData) => (
                        <button
                          key={monthData.month}
                          onClick={() => handleMonthSelect(monthData.month)}
                          className={`year-month ${
                            displayMonth === monthData.month
                              ? "year-month-active"
                              : monthData.completed
                                ? "year-month-complete"
                                : "year-month-default"
                          }`}
                        >
                          <div className="flex items-center justify-center year-month-header">
                            <span className="year-month-name font-bold">{MONTHS[monthData.month].slice(0, 3)}</span>
                            {monthData.completed && <CheckCircle2 className="year-month-icon" />}
                          </div>
                          <div className="year-month-count">
                            {monthData.days.filter((d) => d.status === "safe").length}/{monthData.days.length}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </Panel>
            </PanelGroup>
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}
