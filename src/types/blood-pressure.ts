export interface BloodPressureRecord {
  fecha: string;
  hora: string;
  sistolica: number;
  diastolica: number;
  pulso: number;
  brazo: string;
  posicion: string;
  reposo: number;
  medicacion?: string;
  sintomas: string;
  observaciones: string;
}