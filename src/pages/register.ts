import type { BloodPressureRecord } from '../types/blood-pressure';
import { saveBloodPressureRecord } from '../services/api';

export function renderRegisterPage(): string {
  return `
    <section
      id="page-register"
      class="page active"
    >

      <div class="page-header">

        <h2>Registrar medición</h2>

        <p>
          Ingresa los datos de tu medición.
        </p>

      </div>

      <form
        id="bloodPressureForm"
        class="blood-pressure-form"
      >

        <div class="form-row">

          <div class="form-field">

            <label for="fecha">
              Fecha
            </label>

            <input
              type="date"
              id="fecha"
              name="fecha"
              required
            >

          </div>

          <div class="form-field">

            <label for="hora">
              Hora
            </label>

            <input
              type="time"
              id="hora"
              name="hora"
              required
            >

          </div>

        </div>

        <div class="measurement-card">

          <div class="form-field">

            <label for="sistolica">
              Sistólica
            </label>

            <div class="input-with-unit">

              <input
                type="number"
                id="sistolica"
                name="sistolica"
                inputmode="numeric"
                min="50"
                max="250"
                placeholder="120"
                required
              >

              <span>mmHg</span>

            </div>

          </div>

          <div class="form-field">

            <label for="diastolica">
              Diastólica
            </label>

            <div class="input-with-unit">

              <input
                type="number"
                id="diastolica"
                name="diastolica"
                inputmode="numeric"
                min="30"
                max="150"
                placeholder="80"
                required
              >

              <span>mmHg</span>

            </div>

          </div>

          <div class="form-field">

            <label for="pulso">
              Pulso
            </label>

            <div class="input-with-unit">

              <input
                type="number"
                id="pulso"
                name="pulso"
                inputmode="numeric"
                min="30"
                max="220"
                placeholder="70"
                required
              >

              <span>lpm</span>

            </div>

          </div>

        </div>

        <div class="form-field">

          <label for="brazo">
            Brazo
          </label>

          <select
            id="brazo"
            name="brazo"
          >

            <option value="Izquierdo">
              Izquierdo
            </option>

            <option value="Derecho">
              Derecho
            </option>

          </select>

        </div>

        <div class="form-field">

          <label for="posicion">
            Posición
          </label>

          <select
            id="posicion"
            name="posicion"
          >

            <option value="Sentado">
              Sentado
            </option>

            <option value="De pie">
              De pie
            </option>

            <option value="Acostado">
              Acostado
            </option>

          </select>

        </div>

        <div class="form-field">

          <label for="reposo">
            Reposo
          </label>

          <div class="input-with-unit">

            <input
              type="number"
              id="reposo"
              name="reposo"
              inputmode="numeric"
              min="0"
              max="60"
              value="5"
            >

            <span>min</span>

          </div>

        </div>

        <div class="form-field">

          <label for="medicacion">
            ¿Tomaste tu medicación?
          </label>

          <select
            id="medicacion"
            name="medicacion"
          >

            <option value="Sí">
              Sí
            </option>

            <option value="No">
              No
            </option>

            <option value="No aplica">
              No aplica
            </option>

          </select>

        </div>

        <div class="form-field">

          <label for="sintomas">
            Síntomas
          </label>

          <input
            type="text"
            id="sintomas"
            name="sintomas"
            placeholder="Ej. Dolor de cabeza"
          >

        </div>

        <div class="form-field">

          <label for="observaciones">
            Observaciones
          </label>

          <textarea
            id="observaciones"
            name="observaciones"
            rows="3"
            placeholder="Notas adicionales..."
          ></textarea>

        </div>

        <div
          id="formMessage"
          class="form-message"
          aria-live="polite"
        ></div>

        <button
          type="submit"
          id="saveButton"
          class="primary-button"
        >
          Guardar medición
        </button>

      </form>

    </section>
  `;
}

export function initializeRegisterPage(): void {
  const form =
    document.getElementById(
      'bloodPressureForm'
    ) as HTMLFormElement | null;

  if (!form) {
    console.error(
      'REGISTER: #bloodPressureForm not found'
    );

    return;
  }

  initializeDateTime();

  form.addEventListener(
    'submit',
    handleFormSubmit
  );

  console.log(
    'REGISTER: initialized'
  );
}

function initializeDateTime(): void {
  const fecha =
    document.getElementById(
      'fecha'
    ) as HTMLInputElement | null;

  const hora =
    document.getElementById(
      'hora'
    ) as HTMLInputElement | null;

  if (!fecha || !hora) {
    console.error(
      'REGISTER: date/time fields not found'
    );

    return;
  }

  const now =
    new Date();

  fecha.value =
    now
      .toISOString()
      .split('T')[0];

  hora.value =
    now
      .toTimeString()
      .substring(0, 5);
}

async function handleFormSubmit(
  event: SubmitEvent
): Promise<void> {

  event.preventDefault();

  const form =
    event.currentTarget as HTMLFormElement;

  const formData =
    new FormData(form);

  const record =
    buildRecord(formData);

  console.log(
    'REGISTER: record',
    record
  );

  try {

    showMessage(
      'Guardando medición...'
    );

    await saveBloodPressureRecord(
      record
    );

    showMessage(
      'Medición guardada correctamente.'
    );

    form.reset();

    initializeDateTime();

  } catch (error) {

    console.error(
      'REGISTER: save error',
      error
    );

    showMessage(
      'No se pudo guardar la medición.'
    );
  }
}

function buildRecord(
  formData: FormData
): BloodPressureRecord {

  return {

    fecha:
      getStringValue(
        formData,
        'fecha'
      ),

    hora:
      getStringValue(
        formData,
        'hora'
      ),

    sistolica:
      getNumberValue(
        formData,
        'sistolica'
      ),

    diastolica:
      getNumberValue(
        formData,
        'diastolica'
      ),

    pulso:
      getNumberValue(
        formData,
        'pulso'
      ),

    brazo:
      getStringValue(
        formData,
        'brazo'
      ),

    posicion:
      getStringValue(
        formData,
        'posicion'
      ),

    reposo:
      getNumberValue(
        formData,
        'reposo'
      ),

    medicacion:
      getStringValue(
        formData,
        'medicacion'
      ),

    sintomas:
      getStringValue(
        formData,
        'sintomas'
      ),

    observaciones:
      getStringValue(
        formData,
        'observaciones'
      )
  };
}

function getStringValue(
  formData: FormData,
  fieldName: string
): string {

  const value =
    formData.get(
      fieldName
    );

  return value
    ?.toString()
    .trim() ?? '';
}

function getNumberValue(
  formData: FormData,
  fieldName: string
): number {

  const value =
    formData.get(
      fieldName
    );

  const number =
    Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
}

function showMessage(
  message: string
): void {

  const element =
    document.getElementById(
      'formMessage'
    );

  if (!element) {
    return;
  }

  element.textContent =
    message;
}