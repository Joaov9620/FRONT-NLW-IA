import { FileVideo, Upload } from "lucide-react";
import { Separator } from "./ui/separator";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { ChangeEvent, useState, useMemo, FormEvent, useRef } from "react";
import { getFFmpeg } from "@/lib/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import { api } from "@/lib/axios";

type Status = 'waiting' | 'converting' | 'uploading' | 'generating' | 'success'

const statusMessages = {
  converting: 'convertendo...',
  generating: 'Transcrevendo...',
  uploading: 'Carregando...',
  success: 'Sucesso!'
}

interface VideoInputFromProps {
  onVideoUploaded: (id: string) => void
}

export function VIdeoInputForm(props: VideoInputFromProps) {
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [status, setStatus] = useState<Status>('waiting')
  const promptInputRef = useRef<HTMLTextAreaElement>(null)

  function handleFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const { files } = event.currentTarget

    if (!files) {
      return
    }

    const selectedFile = files[0]

    setVideoFile(selectedFile)
  }

  async function convertVideoToAudio(video: File) {
    console.log("Converting video to audio...")

    const ffmpeg = await getFFmpeg()

    //criar um espaço no ffmep para salvar o vídeo
    await ffmpeg.writeFile('input.mp4', await fetchFile(video))

    // ffmpeg?.on('log', log => {
    //   console.log(log)
    // }) Caso tiver dando algum erro descomente que ele aponta o error

    ffmpeg.on('progress', progress => {
      console.log('Convert progress: ' + Math.round(progress.progress * 100))
    })

    await ffmpeg.exec([
      '-i',
      'input.mp4',
      '-map',
      '0:a',
      '-b:a',
      '20k',
      '-acodec',
      'libmp3lame',
      'output.mp3'
    ])

    const data = await ffmpeg.readFile('output.mp3')

    const audioFileBlob = new Blob([data], { type: 'audio/mpeg' })
    const audioFile = new File([audioFileBlob], 'audio.mp3', {
      type: 'audio/mpeg'
    })

    return audioFile
  }

  async function handleUploadVideo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const prompt = promptInputRef.current?.value

    if (!videoFile) {
      return
    }

    setStatus('converting')

    const audioFile = await convertVideoToAudio(videoFile)

    const data = new FormData()
    data.append('file', audioFile)

    setStatus('uploading')

    const response = await api.post('/videos', data)

    const videoId = response.data.video.id

    setStatus('generating')

    await api.post(`/videos/${videoId}/transcription`, {
      prompt
    })

    setStatus('success')

    props.onVideoUploaded(videoId)
  }

  const previewURL = useMemo(() => {
    if (!videoFile) {
      return null
    }

    return URL.createObjectURL(videoFile) //criar uma url de pré visualização de um arquivo
  }, [videoFile])

  return (
    <form onSubmit={handleUploadVideo} className='space-y-6'>
      <label
        htmlFor="video"
        className='border overflow-hidden relative flex rounded-md aspect-video cursor-pointer border-dashed text-sm flex-col gap-2 items-center justify-center text-muted-foreground hover:bg-primary/30'
      >
        {previewURL ? (
          <video src={previewURL} controls={false} className="pointer-events-none absolute inset-0" />
        ) : (
          <>
            <FileVideo className='w-4 h-4' />
            Selecione um vídeo
          </>
        )}
      </label>

      <input type="file" id='video' accept='video/mp4' className='sr-only' onChange={handleFileSelected} />

      <Separator />

      <div className='space-y-2'>
        <Label htmlFor="transcription_prompt">Prompt de transcrição</Label>
        <Textarea
          ref={promptInputRef}
          disabled={status != 'waiting'}
          id='transcription_prompt'
          className='h-20 leading-relaxed resize-none'
          placeholder='Inclua palavras-chave mencionadas no vídeo separadas por vírgula'
        />
      </div>

      <Button
        data-success={status == 'success'}
        disabled={status != 'waiting'}
        type='submit'
        className='w-full data-[success=true]:bg-lime-200 hover:bg-primary/75'
      >
        {status == 'waiting' ? (
          <>
            Carregar vídeo
            <Upload className='w-4 h-4 ml-2' />
          </>
        ) : statusMessages[status]}
      </Button>
    </form>
  )
}