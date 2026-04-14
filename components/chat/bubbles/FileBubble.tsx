/**
 * File message bubble component.
 */
import React from 'react';
import { Message } from '../../../types';
import { formatFileSize, getFileIcon } from '../../../services/storageService';

interface FileBubbleProps {
  msg: Message;
}

export const FileBubble: React.FC<FileBubbleProps> = React.memo(({ msg }) => {
  const meta = msg.metadata;
  if (!meta) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 max-w-xs hover:shadow-md transition">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <i className={`fa-solid ${getFileIcon(meta.fileType)} text-indigo-600 text-xl`}></i>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-slate-800 text-sm truncate" title={meta.fileName}>
            {meta.fileName}
          </h4>
          <p className="text-xs text-slate-500 mt-1">
            {formatFileSize(meta.fileSize)}
          </p>
          <a
            href={meta.url || meta.downloadUrl}
            download={meta.fileName}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 mt-2 font-medium"
          >
            <i className="fa-solid fa-download"></i>
            Descargar
          </a>
        </div>
      </div>
    </div>
  );
});

FileBubble.displayName = 'FileBubble';
