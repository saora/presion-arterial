import type { BloodPressureRecord } from '../types/blood-pressure';

const API_URL =
  'https://script.google.com/macros/s/AKfycbw8Bu-luEVTRc1yQlXSOj2YlgNh1QIEzhQ8dT1jrVCLjuATyeq2-zmeHFIAI9eh_3QNQg/exec';

export async function saveBloodPressureRecord(record: BloodPressureRecord): Promise<void> {

  const response =
    await fetch(
      API_URL,
      {
        method: 'POST',

        headers: {
          'Content-Type':
            'text/plain;charset=utf-8'
        },

        body: JSON.stringify({
          action: 'saveRecord',
          record
        })
      }
    );

  if (!response.ok) {
    throw new Error(
      `API error: ${response.status}`
    );
  }

  const result =
    await response.json();

  if (!result.success) {
    throw new Error(
      result.message ||
      'No se pudo guardar la medición.'
    );
  }
}

export async function getBloodPressureRecords(): Promise<BloodPressureRecord[]> {

  const url =
    `${API_URL}?action=getRecords`;

  const response =
    await fetch(url);

  if (!response.ok) {
    throw new Error(
      `API error: ${response.status}`
    );
  }

  const result =
    await response.json();

  if (!result.success) {
    throw new Error(
      result.message ||
      'No se pudo obtener el historial.'
    );
  }

  return result.records;
}