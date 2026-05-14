export enum FileType {
  MP3 = 'audio/mp3',
  MPEG = 'audio/mpeg',
  WAV = 'audio/wav',
  OGG = 'audio/ogg',
  FLAC = 'audio/flac',
  AAC = 'audio/aac',
  WEBM_AUDIO = 'audio/webm',
  WEBM_VIDEO = 'video/webm',
  MP4 = 'video/mp4',
}

export interface DialogProps<T = File | null> {
  accept?: FileType | FileType[];
  fileType?: FileType | FileType[];
  onSelect: (file: T) => void;
  label?: string;
  onError?: (error: string) => void;
}

export const audioFileTypes: FileType[] = [
  FileType.MP3,
  FileType.MPEG,
  FileType.WAV,
  FileType.OGG,
  FileType.FLAC,
  FileType.AAC,
  FileType.WEBM_AUDIO,
];
