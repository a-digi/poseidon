import { FileType } from './types';

export function validateFileType(file: File, fileType?: FileType | FileType[]): boolean {
  if (!fileType) return true;
  const allowedTypes = Array.isArray(fileType) ? fileType : [fileType];
  return allowedTypes.includes(file.type as FileType);
}
