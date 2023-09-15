import { FFmpeg } from '@ffmpeg/ffmpeg'

import coreURL from '../ffmpeg/ffmpeg-core.js?url'  // ?url : só carregar o arquivo quando precisarmos
import wasmURL from '../ffmpeg/ffmpeg-core.wasm?url'
import workerURL from '../ffmpeg/ffmpeg-worker.js?url'

let ffmpeg: FFmpeg | null //nulo por que só vou usar a biblioteca caso eu realmente precise

export async function getFFmpeg() {
  if (ffmpeg) {
    return ffmpeg
  }

  ffmpeg = new FFmpeg()

  if (!ffmpeg.loaded) {
    await ffmpeg.load({
      coreURL,
      wasmURL,
      workerURL,
    })
  }

  return ffmpeg
}