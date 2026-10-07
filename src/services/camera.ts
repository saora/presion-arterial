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

    const canvas =
      document.createElement(
        'canvas'
      );

    const cropX = Math.round(video.videoWidth * 0.08);
    const cropY = Math.round(video.videoHeight * 0.10);
    const cropWidth = Math.round(video.videoWidth * 0.84);
    const cropHeight = Math.round(video.videoHeight * 0.80);
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