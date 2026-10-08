export interface CameraService {
  start(): Promise<MediaStream>;
  stop(): void;
  capture(video: HTMLVideoElement): HTMLCanvasElement;
}

class CameraServiceImpl implements CameraService {

  private stream: MediaStream | null = null;

  async start(): Promise<MediaStream> {

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error(
        'La cámara no está disponible en este dispositivo.'
      );
    }

    this.stop();

    this.stream =  await navigator.mediaDevices.getUserMedia({
        video: {  facingMode: {
            ideal: 'environment'
          }
        },
        audio: false
      });

    return this.stream;
  }

  stop(): void {

    if (!this.stream) {
      return;
    }

    this.stream
      .getTracks()
      .forEach(
        (track) => track.stop()
      );

    this.stream = null;
  }

  capture( video: HTMLVideoElement): HTMLCanvasElement {

    if (
      video.videoWidth === 0 ||
      video.videoHeight === 0
    ) {
      throw new Error(
        'La cámara todavía no está lista.'
      );
    }

    const frame = document.querySelector<HTMLElement>(".camera-frame");
    const container = video.closest<HTMLElement>(".camera-container");

    if (!frame || !container) {
      throw new Error("No se encontró el recuadro de captura.");
    }

    if (!frame.classList.contains("focused")) {
      throw new Error("Espera a que el recuadro se ponga verde para capturar.");
    }

    const frameRect = frame.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const coverScale = Math.max(
      containerRect.width / video.videoWidth,
      containerRect.height / video.videoHeight,
    );
    const renderedWidth = video.videoWidth * coverScale;
    const renderedHeight = video.videoHeight * coverScale;
    const horizontalCrop = (renderedWidth - containerRect.width) / 2;
    const verticalCrop = (renderedHeight - containerRect.height) / 2;
    const cropX = Math.max(
      0,
      Math.round(
        (frameRect.left - containerRect.left + horizontalCrop) / coverScale,
      ),
    );
    const cropY = Math.max(
      0,
      Math.round(
        (frameRect.top - containerRect.top + verticalCrop) / coverScale,
      ),
    );
    const cropWidth = Math.min(
      video.videoWidth - cropX,
      Math.round(frameRect.width / coverScale),
    );
    const cropHeight = Math.min(
      video.videoHeight - cropY,
      Math.round(frameRect.height / coverScale),
    );

    if (cropWidth <= 0 || cropHeight <= 0) {
      throw new Error("El área del recuadro no es válida para capturar.");
    }

    const canvas =
      document.createElement(
        'canvas'
      );

    const scale = 3;

    canvas.width = cropWidth * scale;
    canvas.height = cropHeight * scale;

    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error( 'No se pudo crear el contexto de la cámara.' );
    }

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(
      video,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      canvas.width,
      canvas.height
    );

    return canvas;
  }
}

export const cameraService = new CameraServiceImpl();