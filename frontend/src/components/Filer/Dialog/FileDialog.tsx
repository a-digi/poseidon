import React from 'react';
import { useTranslation } from 'react-i18next';
import { DialogProps } from '@/components/Filer/Dialog/types.ts';
import { validateFileType } from '@/components/Filer/Dialog/validateFileType';

const FileDialog: React.FC<DialogProps> = ({ accept, fileType, onSelect, label, onError }) => {
  const { t } = useTranslation();

  // accept-Attribut als Komma-separierte Liste
  let acceptValue = '';
  if (accept) {
    acceptValue = Array.isArray(accept) ? accept.join(',') : accept;
  } else if (fileType) {
    acceptValue = Array.isArray(fileType) ? fileType.join(',') : fileType;
  }

  return (
    <label className="flex items-center gap-2 cursor-pointer">
      {label && <span>{label}</span>}
      <input
        type="file"
        accept={acceptValue}
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files && e.target.files[0];
          if (file && validateFileType(file, fileType)) {
            onSelect(file);
          } else {
            if (file && onError) {
              onError(`${t('fileDialog.invalidType')} (${file.name})`);
            }
          }
        }}
      />
      <span className="bg-blue-600 text-white px-3 py-1 rounded">
        {t('fileDialog.selectFile', 'Datei auswählen')}
      </span>
    </label>
  );
};

export default FileDialog;
