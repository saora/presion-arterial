import type { BloodPressureRecord } from "../../types/blood-pressure";
import { getBloodPressureRecords } from "../../services/api";
import homeTemplate from "./home.html?raw";

type ChartPeriod = "week" | "month";
type ChartPoint = {
  date: Date;
  sistolica: number | null;
  diastolica: number | null;
  pulso: number | null;
  label?: string;
};

let currentChartPeriod: ChartPeriod = "week";
let cachedRecords: BloodPressureRecord[] = [];
let dashboardLoadFailed = false;

export function renderHomePage(): string {
  return homeTemplate;
}

export function initializeHomePage(): void {
  initializeChartPeriodToggle();
  refreshHomeDashboard();
  console.log("HOME: initialized");
}

export function refreshHomeDashboard(): void {
  void loadHomeDashboard();
}

async function loadHomeDashboard(): Promise<void> {
  try {
    const records = await getBloodPressureRecords();
    dashboardLoadFailed = false;
    cachedRecords = sortRecords(records);
    updateLatestMeasurement(cachedRecords[0]);
    renderChart(cachedRecords);
  } catch (error) {
    console.error("HOME: error loading dashboard", error);
    dashboardLoadFailed = true;
    cachedRecords = [];
    updateLatestMeasurement();
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

function renderChart(records: BloodPressureRecord[]): void {
  const weekChart = document.getElementById("week-chart-bars");
  const monthChart = document.getElementById("month-chart-line");

  if (!weekChart || !monthChart) {
    return;
  }

  if (dashboardLoadFailed) {
    const errorState =
      '<div class="chart-empty-state">No se pudieron cargar las mediciones</div>';
    weekChart.innerHTML = errorState;
    monthChart.innerHTML = errorState;
  }

  if (currentChartPeriod === "week") {
    weekChart.classList.remove("is-hidden");
    monthChart.classList.add("is-hidden");
    if (!dashboardLoadFailed) {
      renderWeekChart(records);
    }
    return;
  }

  weekChart.classList.add("is-hidden");
  monthChart.classList.remove("is-hidden");
  if (!dashboardLoadFailed) {
    renderMonthChart(records);
  }
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

  const values = buildMonthlySeries(records);
  monthChart.innerHTML = buildStatisticsChartSVG(values, "month");
}

function buildStatisticsChartSVG(
  points: ChartPoint[],
  period: "week" | "month",
): string {
  if (points.length === 0) {
    return '<div class="chart-empty-state">Sin mediciones</div>';
  }

  const width = 440;
  const height = 220;
  const paddingTop = 18;
  const paddingBottom = 30;
  const paddingLeft = 48;
  const paddingRight = 28;
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const lowerBound = 50;
  const upperBound = 160;
  const yTicks = [50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150];

  const normalizeValue = (value: number | null): number | null => {
    if (value === null) {
      return null;
    }
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      return null;
    }
    return Math.min(Math.max(numericValue, lowerBound), upperBound);
  };

  const normalizedPoints = points.map((entry) => ({
    ...entry,
    sistolica: normalizeValue(entry.sistolica),
    diastolica: normalizeValue(entry.diastolica),
    pulso: normalizeValue(entry.pulso),
  }));

  const xToSvg = (index: number): number => {
    const ratio = normalizedPoints.length <= 1 ? 0 : index / (normalizedPoints.length - 1);
    return paddingLeft + ratio * chartWidth;
  };

  const yToSvg = (value: number): number => {
    const ratio = (value - lowerBound) / Math.max(upperBound - lowerBound, 1);
    return height - paddingBottom - ratio * chartHeight;
  };

  const buildSmoothPath = (values: Array<number | null>): string => {
    let path = "";

    for (let index = 0; index < values.length; index += 1) {
      const currentValue = values[index];

      if (currentValue === null) {
        continue;
      }

      const currentX = xToSvg(index);
      const currentY = yToSvg(currentValue);
      const previousValue = values[index - 1];

      if (index === 0 || previousValue === null || previousValue === undefined) {
        path += ` M ${currentX} ${currentY}`;
        continue;
      }

      const previousX = xToSvg(index - 1);
      const previousY = yToSvg(previousValue);
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
  const pulsoPath = buildSmoothPath(normalizedPoints.map((entry) => entry.pulso));

  const yGridLines = yTicks
    .map((tick) => {
      const y = yToSvg(tick);
      return `
        <line x1="${paddingLeft}" x2="${width - paddingRight}" y1="${y}" y2="${y}" stroke="rgba(148,163,184,0.18)" stroke-width="1" />
      `;
    })
    .join("");

  const xGridLines = normalizedPoints
    .map((_, index) => {
      const x = xToSvg(index);
      return `
        <line x1="${x}" x2="${x}" y1="${paddingTop}" y2="${height - paddingBottom}" stroke="rgba(148,163,184,0.18)" stroke-width="1" />
      `;
    })
    .join("");

  const yAxisLabels = yTicks
    .map((tick) => {
      const y = yToSvg(tick);
      return `<text x="${paddingLeft - 10}" y="${y + 3}" text-anchor="end" fill="#8e8e93" font-size="9" font-weight="500" font-family="Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif">${tick}</text>`;
    })
    .join("");

  const xLabels = normalizedPoints
    .map((entry, index) => {
      const x = xToSvg(index);
      const label =
        period === "month"
          ? entry.label ?? `Semana ${index + 1}`
          : new Intl.DateTimeFormat("es-ES", {
              day: "2-digit",
              month: "short",
            }).format(entry.date);

      return `<text x="${x}" y="${height - 8}" text-anchor="middle" fill="#8e8e93" font-size="10" font-weight="500" font-family="Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif">${label}</text>`;
    })
    .join("");

  const sistolicaDots = normalizedPoints
    .flatMap((entry, index) => {
      if (entry.sistolica === null) {
        return [];
      }
      const x = xToSvg(index);
      const y = yToSvg(entry.sistolica);
      return [`<circle cx="${x}" cy="${y}" r="3.2" fill="#1d4ed8" stroke="#ffffff" stroke-width="1.5" />`];
    })
    .join("");

  const diastolicaDots = normalizedPoints
    .flatMap((entry, index) => {
      if (entry.diastolica === null) {
        return [];
      }
      const x = xToSvg(index);
      const y = yToSvg(entry.diastolica);
      return [`<circle cx="${x}" cy="${y}" r="3.2" fill="#10b981" stroke="#ffffff" stroke-width="1.5" />`];
    })
    .join("");

  const pulsoDots = normalizedPoints
    .flatMap((entry, index) => {
      if (entry.pulso === null) {
        return [];
      }
      const x = xToSvg(index);
      const y = yToSvg(entry.pulso);
      return [`<circle cx="${x}" cy="${y}" r="3.2" fill="#e4a800" stroke="#ffffff" stroke-width="1.5" />`];
    })
    .join("");

  return `
    <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true" style="width: 100%; height: 100%; display: block;">
      <g>
        ${yAxisLabels}
      </g>
      <g>
        ${yGridLines}
        ${xGridLines}
      </g>
      <line x1="${paddingLeft}" x2="${width - paddingRight}" y1="${height - paddingBottom}" y2="${height - paddingBottom}" stroke="rgba(107,114,128,0.22)" stroke-width="1" />
      <path d="${sistolicaPath}" fill="none" stroke="#1d4ed8" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" />
      <path d="${diastolicaPath}" fill="none" stroke="#10b981" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" />
      <path d="${pulsoPath}" fill="none" stroke="#e4a800" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" />
      ${sistolicaDots}
      ${diastolicaDots}
      ${pulsoDots}
      ${xLabels}
    </svg>
  `;
}

function buildLastSevenDaysSeries(records: BloodPressureRecord[]): ChartPoint[] {
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

  return days.flatMap((entry) => {
    const key = toDateKey(entry.date);
    const values = grouped.get(key);

    if (!values) {
      return [];
    }

    entry.sistolica = Math.round(values.sistolica.reduce((sum, value) => sum + Number(value), 0) / values.sistolica.length);
    entry.diastolica = Math.round(values.diastolica.reduce((sum, value) => sum + Number(value), 0) / values.diastolica.length);
    entry.pulso = Math.round(values.pulso.reduce((sum, value) => sum + Number(value), 0) / values.pulso.length);
    return [entry];
  });
}

function buildMonthlySeries(records: BloodPressureRecord[]): ChartPoint[] {
  const currentYear = new Date().getFullYear();
  const months: Array<{
    date: Date;
    label: string;
    sistolica: number[];
    diastolica: number[];
    pulso: number[];
  }> = [];
  const monthNames = [
    "ene", "feb", "mar", "abr", "may", "jun",
    "jul", "ago", "sep", "oct", "nov", "dic",
  ];

  for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
    months.push({
      date: new Date(currentYear, monthIndex, 1),
      label: monthNames[monthIndex],
      sistolica: [],
      diastolica: [],
      pulso: [],
    });
  }

  records.forEach((record) => {
    const recordDate = getRecordDate(record);

    if (recordDate.getFullYear() !== currentYear) {
      return;
    }

    const month = months[recordDate.getMonth()];

    if (!month) {
      return;
    }
    month.sistolica.push(Number(record.sistolica) || 0);
    month.diastolica.push(Number(record.diastolica) || 0);
    month.pulso.push(Number(record.pulso) || 0);
  });

  return months.map((month) => ({
      date: month.date,
      label: month.label,
      sistolica: month.sistolica.length
        ? Math.round(month.sistolica.reduce((sum, value) => sum + value, 0) / month.sistolica.length)
        : null,
      diastolica: month.diastolica.length
        ? Math.round(month.diastolica.reduce((sum, value) => sum + value, 0) / month.diastolica.length)
        : null,
      pulso: month.pulso.length
        ? Math.round(month.pulso.reduce((sum, value) => sum + value, 0) / month.pulso.length)
        : null,
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
