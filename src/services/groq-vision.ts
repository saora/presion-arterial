import type { ParsedBloodPressure } from "../pages/scan/blood-pressure-parser";

const GROQ_OCR_URL = import.meta.env.VITE_GROQ_OCR_URL?.trim();

export const groqVisionService = {
  get isConfigured(): boolean {
    return Boolean(GROQ_OCR_URL);
  },

  async recognize(
    image: HTMLCanvasElement,
  ): Promise<ParsedBloodPressure> {
    if (!GROQ_OCR_URL) {
      throw new Error("El reconocimiento visual no está configurado.");
    }

    const imageDataUrl = image.toDataURL("image/jpeg", 0.88);
    const response = await fetch(GROQ_OCR_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ imageDataUrl }),
    });

    const result: unknown = await response.json();

    if (!response.ok) {
      const message = isErrorResponse(result)
        ? result.error
        : "No se pudo interpretar la imagen.";
      throw new Error(message);
    }

    if (!isReadingResponse(result)) {
      throw new Error("El servicio devolvió una lectura inválida.");
    }

    return result.reading;
  },
};

function isReadingResponse(
  value: unknown,
): value is { reading: ParsedBloodPressure } {
  if (typeof value !== "object" || value === null || !("reading" in value)) {
    return false;
  }

  const reading = value.reading;

  if (typeof reading !== "object" || reading === null) {
    return false;
  }

  const parsed = reading as Record<string, unknown>;

  return isValidValue(parsed.sistolica, 50, 250) &&
    isValidValue(parsed.diastolica, 30, 150) &&
    isValidValue(parsed.pulso, 30, 220) &&
    typeof parsed.sistolica === "number" &&
    typeof parsed.diastolica === "number" &&
    typeof parsed.pulso === "number" &&
    parsed.sistolica > parsed.diastolica;
}

function isValidValue(
  value: unknown,
  minimum: number,
  maximum: number,
): boolean {
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value >= minimum &&
    value <= maximum;
}

function isErrorResponse(value: unknown): value is { error: string } {
  return typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "string";
}
