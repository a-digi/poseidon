import React, { useRef, useEffect } from 'react';
import { DialogProps } from './types';
import { useTranslation } from 'react-i18next';

type FolderDialogProps = DialogProps<FileList | null>;

const FolderDialog: React.FC<FolderDialogProps> = ({ onSelect, label }) => {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.setAttribute('webkitdirectory', '');
    }
  }, []);

  return (
    <label className="flex items-center gap-2 cursor-pointer">
      {label && <span>{label}</span>}
      <input
        ref={inputRef}
        type="file"
        style={{ display: 'none' }}
        onChange={(e) => {
          const files = e.target.files;
          onSelect(files);
        }}
      />
      <span className="bg-blue-600 text-white px-3 py-1 rounded">{t('folderDialog.selectFolder', 'Ordner auswählen')}</span>
    </label>
  );
};

export default FolderDialog;
