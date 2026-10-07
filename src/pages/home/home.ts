import type { BloodPressureRecord } from "../../types/blood-pressure";
import { getBloodPressureRecords } from "../../services/api";
import homeTemplate from "./home.html?raw";

type ChartPeriod = "week" | "month";

let currentChartPeriod: ChartPeriod = "week";
let cachedRecords: BloodPressureRecord[] = [];

export function renderHomePage(): string {
  return homeTemplate;
}

export function initializeHomePage(): void {
  initializeChartPeriodToggle();
  void loadHomeDashboard();
  console.log("HOME: initialized");
}

async function loadHomeDashboard(): Promise<void> {
  try {
    const records = await getBloodPressureRecords();
    const nextRecords = records.length > 0 ? sortRecords(records) : buildReferenceChartData();
    cachedRecords = nextRecords;
    updateLatestMeasurement(cachedRecords[0]);
    renderChart(cachedRecords);
  } catch (error) {
    console.error("HOME: error loading dashboard", error);
    const fallbackRecords = buildReferenceChartData();
    cachedRecords = fallbackRecords;
    updateLatestMeasurement(cachedRecords[0]);
    renderChart(cachedRecords);
  }
}

function initializeChartPeriodToggle(): void {
  const buttons = document.querySelectorAll<HTMLButtonElement>(".chart-period-button");

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const period = button.dataset.chartPeriod as ChartPeriod | undefined;

      if (!period) {
        return;
      }

      currentChartPeriod = period;
      buttons.forEach((item) => {
        const isActive = item === button;
        item.classList.toggle("active", isActive);
        item.setAttribute("aria-pressed", String(isActive));
      });

      renderChart(cachedRecords);
    });
  });
}

function updateLatestMeasurement(record?: BloodPressureRecord): void {
  const systolica = document.getElementById("latest-sistolica");
  const diastolica = document.getElementById("latest-diastolica");
  const pulso = document.getElementById("latest-pulso");

  if (!record) {
    systolica && (systolica.textContent = "--");
    diastolica && (diastolica.textContent = "--");
    pulso && (pulso.textContent = "--");
    return;
  }

  systolica && (systolica.textContent = String(record.sistolica));
  diastolica && (diastolica.textContent = String(record.diastolica));
  pulso && (pulso.textContent = String(record.pulso));
}

function buildReferenceChartData(): BloodPressureRecord[] {
  const today = new Date();
  const reference = [
    { date: 0, sistolica: 128, diastolica: 82 },
    { date: 1, sistolica: 122, diastolica: 78 },
    { date: 2, sistolica: 134, diastolica: 86 },
    { date: 3, sistolica: 118, diastolica: 76 },
    { date: 4, sistolica: 126, diastolica: 80 },
    { date: 5, sistolica: 138, diastolica: 88 },
    { date: 6, sistolica: 120, diastolica: 79 },
  ];

  return reference.map(({ date, sistolica, diastolica }) => {
    const entryDate = new Date(today);
    entryDate.setDate(today.getDate() - (6 - date));
    entryDate.setHours(0, 0, 0, 0);

    return {
      id: date + 1,
      fecha: entryDate.toISOString().slice(0, 10),
      hora: "08:00",
      sistolica,
      diastolica,
      pulso: 72,
      brazo: "izquierdo",
      posicion: "sentado",
      reposo: 5,
      sintomas: "",
      observaciones: "",
    };
  });
}

function renderChart(records: BloodPressureRecord[]): void {
  const weekChart = document.getElementById("week-chart-bars");
  const monthChart = document.getElementById("month-chart-line");

  if (!weekChart || !monthChart) {
    return;
  }

  if (currentChartPeriod === "week") {
    weekChart.classList.remove("is-hidden");
    monthChart.classList.add("is-hidden");
    renderWeekChart(records);
    return;
  }

  weekChart.classList.add("is-hidden");
  monthChart.classList.remove("is-hidden");
  renderMonthChart(records);
}

function renderWeekChart(records: BloodPressureRecord[]): void {
  const chart = document.getElementById("week-chart-bars");

  if (!chart) {
    return;
  }

  const values = buildLastSevenDaysSeries(records);
  chart.innerHTML = buildStatisticsChartSVG(values, "week");
}

function renderMonthChart(records: BloodPressureRecord[]): void {
  const monthChart = document.getElementById("month-chart-line");

  if (!monthChart) {
    return;
  }

  const values = buildLastThirtyDaysSeries(records);
  monthChart.innerHTML = buildStatisticsChartSVG(values, "month");
}

function buildStatisticsChartSVG(
  points: Array<{ date: Date; sistolica: number; diastolica: number; pulso: number }>,
  period: "week" | "month",
): string {
  if (points.length === 0) {
    return '<div class="chart-empty-state">Sin mediciones</div>';
  }

  const width = 440;
  const height = 170;
  const paddingTop = 18;
  const paddingBottom = 26;
  const paddingLeft = 32;
  const paddingRight = 28;
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const lowerBound = 60;
  const upperBound = 160;
  const yTicks = [60, 80, 100, 120, 140, 160];

  const normalizeValue = (value: number | string | undefined): number => {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      return lowerBound;
    }
    return Math.min(Math.max(numericValue, lowerBound), upperBound);
  };

  const normalizedPoints = points.map((entry) => ({
    ...entry,
    sistolica: normalizeValue(entry.sistolica),
    diastolica: normalizeValue(entry.diastolica),
  }));

  const xToSvg = (index: number): number => {
    const ratio = normalizedPoints.length <= 1 ? 0.5 : index / (normalizedPoints.length - 1);
    return paddingLeft + ratio * chartWidth;
  };

  const yToSvg = (value: number): number => {
    const ratio = (value - lowerBound) / Math.max(upperBound - lowerBound, 1);
    return height - paddingBottom - ratio * chartHeight;
  };

  const buildSmoothPath = (values: number[]): string => {
    if (values.length === 0) {
      return "";
    }

    if (values.length === 1) {
      const x = xToSvg(0);
      const y = yToSvg(values[0]);
      return `M ${x} ${y}`;
    }

    let path = `M ${xToSvg(0)} ${yToSvg(values[0])}`;

    for (let index = 1; index < values.length; index += 1) {
      const previousX = xToSvg(index - 1);
      const previousY = yToSvg(values[index - 1]);
      const currentX = xToSvg(index);
      const currentY = yToSvg(values[index]);
      const controlX1 = previousX + (currentX - previousX) * 0.5;
      const controlY1 = previousY;
      const controlX2 = previousX + (currentX - previousX) * 0.5;
      const controlY2 = currentY;

      path += ` C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${currentX} ${currentY}`;
    }

    return path;
  };

  const sistolicaPath = buildSmoothPath(normalizedPoints.map((entry) => entry.sistolica));
  const diastolicaPath = buildSmoothPath(normalizedPoints.map((entry) => entry.diastolica));

  const yGridLines = yTicks
    .map((tick) => {
      const y = yToSvg(tick);
      return `
        <line x1="${paddingLeft}" x2="${width - paddingRight}" y1="${y}" y2="${y}" stroke="rgba(148,163,184,0.18)" stroke-width="1" />
        <text x="${paddingLeft - 8}" y="${y + 4}" text-anchor="end" fill="#8e8e93" font-size="10" font-weight="500" font-family="Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif">${tick}</text>
      `;
    })
    .join("");

  const xLabels = normalizedPoints
    .map((entry, index) => {
      const x = xToSvg(index);
      const label =
        period === "month"
          ? `Semana ${index + 1}`
          : new Intl.DateTimeFormat("es-ES", {
              day: "2-digit",
              month: "short",
            }).format(entry.date);

      return `<text x="${x}" y="${height - 8}" text-anchor="middle" fill="#8e8e93" font-size="10" font-weight="500" font-family="Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif">${label}</text>`;
    })
    .join("");

  const sistolicaDots = normalizedPoints
    .map((entry, index) => {
      const x = xToSvg(index);
      const y = yToSvg(entry.sistolica);
      return `<circle cx="${x}" cy="${y}" r="3.2" fill="#1d4ed8" stroke="#ffffff" stroke-width="1.5" />`;
    })
    .join("");

  const diastolicaDots = normalizedPoints
    .map((entry, index) => {
      const x = xToSvg(index);
      const y = yToSvg(entry.diastolica);
      return `<circle cx="${x}" cy="${y}" r="3.2" fill="#10b981" stroke="#ffffff" stroke-width="1.5" />`;
    })
    .join("");

  return `
    <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" aria-hidden="true" style="width: 100%; height: 100%; display: block;">
      <g>
        ${yGridLines}
      </g>
      <line x1="${paddingLeft}" x2="${width - paddingRight}" y1="${height - paddingBottom}" y2="${height - paddingBottom}" stroke="rgba(107,114,128,0.22)" stroke-width="1" />
      <path d="${sistolicaPath}" fill="none" stroke="#1d4ed8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
      <path d="${diastolicaPath}" fill="none" stroke="#10b981" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
      ${sistolicaDots}
      ${diastolicaDots}
      ${xLabels}
    </svg>
  `;
}

function buildLastSevenDaysSeries(records: BloodPressureRecord[]): Array<{ date: Date; sistolica: number; diastolica: number; pulso: number }> {
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);

  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - 6);
  startDate.setHours(0, 0, 0, 0);

  const days: Array<{ date: Date; sistolica: number; diastolica: number; pulso: number }> = [];

  for (let index = 0; index < 7; index += 1) {
    const currentDay = new Date(startDate);
    currentDay.setDate(startDate.getDate() + index);
    days.push({ date: currentDay, sistolica: 0, diastolica: 0, pulso: 0 });
  }

  const grouped = new Map<string, { sistolica: number[]; diastolica: number[]; pulso: number[] }>();

  records.forEach((record) => {
    const recordDate = getRecordDate(record);

    if (recordDate < startDate || recordDate > endDate) {
      return;
    }

    const key = toDateKey(recordDate);
    const bucket = grouped.get(key) ?? { sistolica: [], diastolica: [], pulso: [] };
    bucket.sistolica.push(Number(record.sistolica) || 0);
    bucket.diastolica.push(Number(record.diastolica) || 0);
    bucket.pulso.push(Number(record.pulso) || 0);
    grouped.set(key, bucket);
  });

  days.forEach((entry) => {
    const key = toDateKey(entry.date);
    const values = grouped.get(key);

    if (!values) {
      return;
    }

    entry.sistolica = Math.round(values.sistolica.reduce((sum, value) => sum + Number(value), 0) / values.sistolica.length);
    entry.diastolica = Math.round(values.diastolica.reduce((sum, value) => sum + Number(value), 0) / values.diastolica.length);
    entry.pulso = Math.round(values.pulso.reduce((sum, value) => sum + Number(value), 0) / values.pulso.length);
  });

  return days;
}

function buildLastThirtyDaysSeries(records: BloodPressureRecord[]): Array<{ date: Date; sistolica: number; diastolica: number; pulso: number }> {
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);

  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - 29);
  startDate.setHours(0, 0, 0, 0);

  const weeks: Array<{ date: Date; sistolica: number[]; diastolica: number[]; pulso: number[] }> = [];

  for (let index = 0; index < 4; index += 1) {
    const weekStart = new Date(startDate);
    weekStart.setDate(startDate.getDate() + index * 7);
    weeks.push({
      date: weekStart,
      sistolica: [],
      diastolica: [],
      pulso: [],
    });
  }

  records.forEach((record) => {
    const recordDate = getRecordDate(record);

    if (recordDate < startDate || recordDate > endDate) {
      return;
    }

    const diffDays = Math.floor((recordDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const weekIndex = Math.min(Math.max(Math.floor(diffDays / 7), 0), 3);
    const bucket = weeks[weekIndex];

    if (!bucket) {
      return;
    }

    bucket.sistolica.push(Number(record.sistolica) || 0);
    bucket.diastolica.push(Number(record.diastolica) || 0);
    bucket.pulso.push(Number(record.pulso) || 0);
  });

  return weeks.map((week) => ({
    date: week.date,
    sistolica: week.sistolica.length
      ? Math.round(week.sistolica.reduce((sum, value) => sum + Number(value), 0) / week.sistolica.length)
      : 0,
    diastolica: week.diastolica.length
      ? Math.round(week.diastolica.reduce((sum, value) => sum + Number(value), 0) / week.diastolica.length)
      : 0,
    pulso: week.pulso.length
      ? Math.round(week.pulso.reduce((sum, value) => sum + Number(value), 0) / week.pulso.length)
      : 0,
  }));
}

function sortRecords(records: BloodPressureRecord[]): BloodPressureRecord[] {
  return [...records].sort((a, b) => getRecordDate(b).getTime() - getRecordDate(a).getTime());
}

function getRecordDate(record: BloodPressureRecord): Date {
  const [hours = "0", minutes = "0"] = record.hora.split(":");
  const normalizedTime = [hours.padStart(2, "0"), minutes.padStart(2, "0")].join(":");
  const date = new Date(`${record.fecha}T${normalizedTime}:00`);

  if (Number.isNaN(date.getTime())) {
    return new Date(0);
  }

  return date;
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
