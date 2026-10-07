export interface ParsedBloodPressure {
  sistolica: number | null;
  diastolica: number | null;
  pulso: number | null;
}

export function parseBloodPressureText(
  text: string,
): ParsedBloodPressure {
  const normalizedText = text
    .replace(/\s+/g, " ")
    .trim();

  const pressureMatch = normalizedText.match(
    /(\d{2,3})\s*[\/:|]\s*(\d{2,3})/,
  );

  const numbers = normalizedText.match(/\d{2,3}/g) ?? [];
  const pressureSystolic = pressureMatch?.[1] ?? numbers[0];
  const pressureDiastolic = pressureMatch?.[2] ?? numbers[1];

  const pulseMatch = normalizedText.match(
    /(?:pulso|pulse|bpm|heart\s*rate|hr)\D{0,12}(\d{2,3})/i,
  );

  const pulse = pulseMatch?.[1] ?? numbers[2];

  return {
    sistolica: toNumber(pressureSystolic),
    diastolica: toNumber(pressureDiastolic),
    pulso: toNumber(pulse),
  };
}

function toNumber(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}
