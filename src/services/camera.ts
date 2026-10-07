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

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error( 'No se pudo crear el contexto de la cámara.' );
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas;
  }
}

export const cameraService = new CameraServiceImpl();