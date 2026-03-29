"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const SKILLS = [
  "System Design",
  "Fullstack Web",
  "Fullstack App",
  "AI/ML",
  "Generative AI",
  "MLOps",
  "DevOps",
  "DSA",
  "OS/Low-Level",
];

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS = ["Mon","","Wed","","Fri","","Sun"];

interface DayLog {
  id?: string;
  date: string;
  worked: boolean;
  hours: number;
  description: string;
  skills: string[];
}

function getLevel(hours: number): number {
  if (hours <= 0) return 0;
  if (hours <= 2) return 1;
  if (hours <= 4) return 2;
  if (hours <= 6) return 3;
  return 4;
}

function generateYearDates(year: number): Date[] {
  const dates: Date[] = [];
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(new Date(d));
  }
  return dates;
}

function groupIntoWeeks(dates: Date[]): (Date | null)[][] {
  const weeks: (Date | null)[][] = [];
  let currentWeek: (Date | null)[] = [];
  const firstDay = dates[0].getDay();
  const paddingDays = firstDay === 0 ? 6 : firstDay - 1;

  for (let i = 0; i < paddingDays; i++) {
    currentWeek.push(null);
  }

  for (const date of dates) {
    currentWeek.push(date);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }
  return weeks;
}

function getMonthPositions(weeks: (Date | null)[][]): { label: string; col: number }[] {
  const positions: { label: string; col: number }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, colIndex) => {
    for (const d of week) {
      if (d) {
        const m = d.getMonth();
        if (m !== lastMonth) {
          positions.push({ label: MONTHS[m], col: colIndex });
          lastMonth = m;
        }
        break;
      }
    }
  });
  return positions;
}

function dateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDate(ds: string): string {
  const d = new Date(ds + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" });
}

function getLevelLabel(hours: number): string {
  if (hours <= 0) return "No activity";
  if (hours <= 2) return `${hours}h — Light`;
  if (hours <= 4) return `${hours}h — Moderate`;
  if (hours <= 6) return `${hours}h — Solid`;
  return `${hours}h — Intense 🔥`;
}

export default function Home() {
  const today = new Date();
  const todayStr = dateStr(today);
  const startYear = today.getFullYear();

  const [selectedYear, setSelectedYear] = useState(startYear);
  const [logs, setLogs] = useState<Record<string, DayLog>>({});
  const [loading, setLoading] = useState(true);
  const [modalDate, setModalDate] = useState<string | null>(null);
  const [modalData, setModalData] = useState<DayLog>({ date: "", worked: false, hours: 0, description: "", skills: [] });
  const [saving, setSaving] = useState(false);
  const [activeSkillFilter, setActiveSkillFilter] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; date: string; hours: number; visible: boolean }>({ x: 0, y: 0, date: "", hours: 0, visible: false });
  const tooltipRef = useRef<HTMLDivElement>(null);

  const years = Array.from({ length: 5 }, (_, i) => startYear + i);
  const yearDates = generateYearDates(selectedYear);
  const weeks = groupIntoWeeks(yearDates);
  const monthPositions = getMonthPositions(weeks);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/logs?year=${selectedYear}`);
      const data: DayLog[] = await res.json();
      const map: Record<string, DayLog> = {};
      data.forEach((l) => { map[l.date] = l; });
      setLogs(map);
    } catch {
      console.error("Failed to fetch logs");
    }
    setLoading(false);
  }, [selectedYear]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const openModal = (ds: string) => {
    const existing = logs[ds];
    if (existing) {
      setModalData({ ...existing });
    } else {
      setModalData({ date: ds, worked: false, hours: 0, description: "", skills: [] });
    }
    setModalDate(ds);
  };

  const saveLog = async () => {
    if (!modalDate) return;
    setSaving(true);
    try {
      const body = { ...modalData, date: modalDate };
      const res = await fetch("/api/logs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const saved: DayLog = await res.json();
      setLogs((prev) => ({ ...prev, [saved.date]: saved }));
      setModalDate(null);
    } catch {
      console.error("Failed to save");
    }
    setSaving(false);
  };

  const toggleSkill = (skill: string) => {
    setModalData((prev) => {
      const has = prev.skills.includes(skill);
      return { ...prev, skills: has ? prev.skills.filter((s) => s !== skill) : [...prev.skills, skill] };
    });
  };

  const totalDays = Object.values(logs).filter((l) => l.worked).length;
  const totalHours = Object.values(logs).reduce((s, l) => s + (l.hours || 0), 0);
  const currentStreak = (() => {
    let streak = 0;
    const d = new Date(today);
    while (true) {
      const ds = dateStr(d);
      if (logs[ds]?.worked) { streak++; d.setDate(d.getDate() - 1); }
      else break;
    }
    return streak;
  })();

  const handleCellHover = (e: React.MouseEvent, ds: string) => {
    const log = logs[ds];
    setTooltip({ x: e.clientX + 10, y: e.clientY - 40, date: ds, hours: log?.hours || 0, visible: true });
  };

  const handleCellLeave = () => {
    setTooltip((t) => ({ ...t, visible: false }));
  };

  const getFilteredLevel = (ds: string): number => {
    const log = logs[ds];
    if (!log || !log.worked) return 0;
    if (activeSkillFilter && !log.skills.includes(activeSkillFilter)) return 0;
    return getLevel(log.hours);
  };

  return (
    <div className="app-container">
      <header className="header">
        <h1>5-Year Training Plan</h1>
        <p>System Design · Fullstack · AI/ML · GenAI · MLOps · DevOps</p>
      </header>

      <div className="stats-bar">
        <div className="stat-card">
          <div className="stat-value">{totalDays}</div>
          <div className="stat-label">Days Trained</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totalHours}</div>
          <div className="stat-label">Total Hours</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{currentStreak}</div>
          <div className="stat-label">Current Streak</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{selectedYear}</div>
          <div className="stat-label">Year</div>
        </div>
      </div>

      <div className="year-nav">
        {years.map((y) => (
          <button key={y} className={`year-btn ${y === selectedYear ? "active" : ""}`} onClick={() => setSelectedYear(y)}>
            {y}
          </button>
        ))}
      </div>

      <div className="skills-filter">
        {SKILLS.map((s) => (
          <button key={s} className={`skill-chip ${activeSkillFilter === s ? "active" : ""}`} onClick={() => setActiveSkillFilter(activeSkillFilter === s ? null : s)}>
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /></div>
      ) : (
        <div className="grid-container">
          <div className="grid-scroll">
            <div className="month-labels">
              {monthPositions.map((mp, i) => (
                <span key={i} style={{ left: `${36 + mp.col * 18}px` }}>{mp.label}</span>
              ))}
            </div>
            <div className="grid-wrapper">
              <div className="day-labels">
                {DAYS.map((d, i) => (<span key={i}>{d}</span>))}
              </div>
              <div className="grid">
                {weeks.map((week, wi) => (
                  <div className="grid-column" key={wi}>
                    {week.map((d, di) => {
                      if (!d) return <div key={di} className="grid-cell" style={{ visibility: "hidden" }} />;
                      const ds = dateStr(d);
                      const isFuture = d > today;
                      const isToday = ds === todayStr;
                      const level = getFilteredLevel(ds);
                      return (
                        <div
                          key={di}
                          className={`grid-cell level-${level} ${isFuture ? "future" : ""} ${isToday ? "today" : ""}`}
                          onClick={() => !isFuture && openModal(ds)}
                          onMouseEnter={(e) => !isFuture && handleCellHover(e, ds)}
                          onMouseLeave={handleCellLeave}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            <div className="legend">
              <span>Less</span>
              <div className="legend-cell" style={{ background: "var(--blue-l0)" }} />
              <div className="legend-cell" style={{ background: "var(--blue-l1)" }} />
              <div className="legend-cell" style={{ background: "var(--blue-l2)" }} />
              <div className="legend-cell" style={{ background: "var(--blue-l3)" }} />
              <div className="legend-cell" style={{ background: "var(--blue-l4)" }} />
              <span>More (hours)</span>
            </div>
          </div>
        </div>
      )}

      {/* Tooltip */}
      <div ref={tooltipRef} className={`tooltip ${tooltip.visible ? "visible" : ""}`} style={{ top: tooltip.y, left: tooltip.x }}>
        <div className="tooltip-date">{tooltip.date && formatDate(tooltip.date)}</div>
        <div className="tooltip-hours">{getLevelLabel(tooltip.hours)}</div>
      </div>

      {/* Modal */}
      {modalDate && (
        <div className="modal-overlay" onClick={() => setModalDate(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{formatDate(modalDate)}</h2>
              <button className="modal-close" onClick={() => setModalDate(null)}>×</button>
            </div>

            <div className="modal-field">
              <label>Did you work today?</label>
              <div className="worked-toggle">
                <button className={modalData.worked ? "active-yes" : ""} onClick={() => setModalData((p) => ({ ...p, worked: true }))}>
                  ✅ Yes
                </button>
                <button className={!modalData.worked ? "active-no" : ""} onClick={() => setModalData((p) => ({ ...p, worked: false, hours: 0 }))}>
                  ❌ No
                </button>
              </div>
            </div>

            {modalData.worked && (
              <>
                <div className="modal-field">
                  <label>Hours Worked</label>
                  <input
                    type="number"
                    min={0}
                    max={24}
                    step={0.5}
                    value={modalData.hours}
                    onChange={(e) => setModalData((p) => ({ ...p, hours: parseFloat(e.target.value) || 0 }))}
                    placeholder="e.g. 4"
                  />
                  <div style={{ marginTop: 6, fontSize: "0.75rem", color: "var(--accent-blue)" }}>
                    {getLevelLabel(modalData.hours)}
                  </div>
                </div>

                <div className="modal-field">
                  <label>Skills Practiced</label>
                  <div className="skills-select">
                    {SKILLS.map((s) => (
                      <button key={s} className={modalData.skills.includes(s) ? "selected" : ""} onClick={() => toggleSkill(s)}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="modal-field">
                  <label>Description <span className="optional-tag">(optional)</span></label>
                  <textarea
                    value={modalData.description}
                    onChange={(e) => setModalData((p) => ({ ...p, description: e.target.value }))}
                    placeholder="What did you learn or build today?"
                  />
                </div>
              </>
            )}

            <div className="modal-actions">
              <button className="btn-save" onClick={saveLog} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </button>
              <button className="btn-cancel" onClick={() => setModalDate(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
