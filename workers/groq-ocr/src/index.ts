interface Env {
  GROQ_API_KEY: string;
  GROQ_MODEL?: string;
  ALLOWED_ORIGINS: string;
  OCR_RATE_LIMITER: {
    limit(options: { key: string }): Promise<{ success: boolean }>;
  };
}

interface Reading {
  sistolica: number;
  diastolica: number;
  pulso: number;
}

const MAX_REQUEST_BYTES = 5_500_000;
const MAX_IMAGE_BYTES = 4_000_000;
const DEFAULT_MODEL = "qwen/qwen3.8-27b";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin");
    const allowedOrigins = env.ALLOWED_ORIGINS
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    if (!origin || !allowedOrigins.includes(origin)) {
      return jsonResponse({ error: "Origen no autorizado." }, 403);
    }

    const corsHeaders = {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
      "Vary": "Origin",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);

    if (url.pathname !== "/api/scan") {
      return jsonResponse({ error: "Ruta no encontrada." }, 404, corsHeaders);
    }

    if (request.method !== "POST") {
      return jsonResponse({ error: "Método no permitido." }, 405, corsHeaders);
    }

    if (!env.GROQ_API_KEY) {
      console.error("GROQ OCR: GROQ_API_KEY is not configured");
      return jsonResponse(
        { error: "El reconocimiento visual no está configurado en el servidor." },
        503,
        corsHeaders,
      );
    }

    try {
      const clientIp = request.headers.get("CF-Connecting-IP") ?? "unknown";
      const rateLimit = await env.OCR_RATE_LIMITER.limit({ key: clientIp });

      if (!rateLimit.success) {
        return jsonResponse(
          { error: "Se alcanzó el límite de escaneos. Intenta de nuevo en un minuto." },
          429,
          corsHeaders,
        );
      }
    } catch (error) {
      console.error("GROQ OCR: rate limiter failed", error);
      return jsonResponse(
        { error: "El servicio de reconocimiento no está disponible." },
        503,
        corsHeaders,
      );
    }

    const contentLength = Number(request.headers.get("Content-Length") ?? 0);

    if (contentLength > MAX_REQUEST_BYTES) {
      return jsonResponse({ error: "La imagen es demasiado grande." }, 413, corsHeaders);
    }

    let body: unknown;

    try {
      const bodyText = await request.text();

      if (new TextEncoder().encode(bodyText).byteLength > MAX_REQUEST_BYTES) {
        return jsonResponse(
          { error: "La imagen es demasiado grande." },
          413,
          corsHeaders,
        );
      }
      body = JSON.parse(bodyText);
    } catch {
      return jsonResponse({ error: "La solicitud no es válida." }, 400, corsHeaders);
    }

    if (!isImageRequest(body)) {
      return jsonResponse(
        { error: "No se recibió una imagen válida." },
        400,
        corsHeaders,
      );
    }

    const image = parseImageDataUrl(body.imageDataUrl);

    if (!image) {
      return jsonResponse(
        { error: "La imagen debe ser JPEG, PNG o WebP." },
        400,
        corsHeaders,
      );
    }

    if (image.base64.length > Math.ceil(MAX_IMAGE_BYTES * 4 / 3)) {
      return jsonResponse(
        { error: "La imagen es demasiado grande." },
        413,
        corsHeaders,
      );
    }

    try {
      const groqResponse = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${env.GROQ_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: env.GROQ_MODEL || DEFAULT_MODEL,
            temperature: 0,
            max_completion_tokens: 128,
            response_format: { type: "json_object" },
            messages: [
              {
                role: "system",
                content:
                  "Eres un lector de pantallas de monitores de presión arterial Omron. " +
                  "Lee únicamente los dígitos que sean claramente visibles para SYS (sistólica), DIA (diastólica) y PULSE (pulso). " +
                  "No adivines ni completes dígitos. Si un valor no es claramente legible, devuelve null para ese campo. " +
                  "Responde solo con JSON: {\"sistolica\": número o null, \"diastolica\": número o null, \"pulso\": número o null}.",
              },
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: "Lee los tres valores de la pantalla del monitor de presión arterial en esta imagen.",
                  },
                  {
                    type: "image_url",
                    image_url: { url: body.imageDataUrl },
                  },
                ],
              },
            ],
          }),
        },
      );

      if (!groqResponse.ok) {
        console.error("GROQ OCR: upstream request failed", groqResponse.status);
        return jsonResponse(
          { error: "Groq no pudo interpretar la imagen. Intenta de nuevo." },
          502,
          corsHeaders,
        );
      }

      const completion: unknown = await groqResponse.json();
      const reading = parseGroqReading(completion);

      if (!reading) {
        return jsonResponse(
          { error: "No se pudieron leer claramente los tres valores. Ajusta la cámara e intenta de nuevo." },
          422,
          corsHeaders,
        );
      }

      return jsonResponse({ reading }, 200, corsHeaders);
    } catch (error) {
      console.error("GROQ OCR: request failed", error);
      return jsonResponse(
        { error: "No se pudo completar el reconocimiento. Intenta de nuevo." },
        502,
        corsHeaders,
      );
    }
  },
};

function isImageRequest(value: unknown): value is { imageDataUrl: string } {
  return typeof value === "object" &&
    value !== null &&
    "imageDataUrl" in value &&
    typeof value.imageDataUrl === "string";
}

function parseImageDataUrl(
  value: string,
): { mimeType: string; base64: string } | null {
  const match = value.match(
    /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/,
  );

  if (!match?.[1] || !match[2]) {
    return null;
  }

  return { mimeType: match[1], base64: match[2] };
}

function parseGroqReading(completion: unknown): Reading | null {
  if (
    typeof completion !== "object" ||
    completion === null ||
    !("choices" in completion) ||
    !Array.isArray(completion.choices)
  ) {
    return null;
  }

  const firstChoice = completion.choices[0];

  if (
    typeof firstChoice !== "object" ||
    firstChoice === null ||
    !("message" in firstChoice) ||
    typeof firstChoice.message !== "object" ||
    firstChoice.message === null ||
    !("content" in firstChoice.message) ||
    typeof firstChoice.message.content !== "string"
  ) {
    return null;
  }

  let reading: unknown;

  try {
    reading = JSON.parse(firstChoice.message.content);
  } catch {
    return null;
  }

  if (typeof reading !== "object" || reading === null) {
    return null;
  }

  const values = reading as Record<string, unknown>;
  const systolic = values.sistolica;
  const diastolic = values.diastolica;
  const pulse = values.pulso;

  if (
    !isIntegerInRange(systolic, 50, 250) ||
    !isIntegerInRange(diastolic, 30, 150) ||
    !isIntegerInRange(pulse, 30, 220) ||
    systolic <= diastolic
  ) {
    return null;
  }

  return {
    sistolica: systolic,
    diastolica: diastolic,
    pulso: pulse,
  };
}

function isIntegerInRange(
  value: unknown,
  minimum: number,
  maximum: number,
): value is number {
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value >= minimum &&
    value <= maximum;
}

function jsonResponse(
  body: unknown,
  status: number,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...headers,
    },
  });
}
