/**
 * Custom hook for file and image upload logic.
 * Encapsulates upload state, validation, progress tracking, and error handling.
 */
import React, { useState, useRef, useCallback } from 'react';
import {
  uploadFileForChat,
  isFileTypeAllowed,
  isFileSizeValid,
  formatFileSize,
  MAX_FILE_SIZE,
} from '../services/storageService';
import { FileMetadata } from '../types';

interface UseFileUploadOptions {
  contactId: string;
  onSendMessage: (text: string, type?: any, metadata?: any, mediaUrl?: string, mediaType?: string) => void;
}

interface UseFileUploadReturn {
  isUploading: boolean;
  uploadProgress: number;
  fileInputRef: React.RefObject<HTMLInputElement>;
  cameraInputRef: React.RefObject<HTMLInputElement>;
  documentInputRef: React.RefObject<HTMLInputElement>;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDocumentUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleQuoteImageUpload: (e: React.ChangeEvent<HTMLInputElement>, idx: number, onImagesLoaded: (idx: number, images: string[]) => void) => void;
  triggerDocumentInput: () => void;
  triggerCameraCapture: () => void;
}

export const useFileUpload = ({
  contactId,
  onSendMessage,
}: UseFileUploadOptions): UseFileUploadReturn => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null!);
  const cameraInputRef = useRef<HTMLInputElement>(null!);
  const documentInputRef = useRef<HTMLInputElement>(null!);

  /**
   * Upload a file to Firebase Storage with validation and error handling.
   */
  const uploadFile = useCallback(async (file: Blob & { name: string; type: string; size: number }): Promise<void> => {
    if (!isFileTypeAllowed(file as File)) {
      alert('Tipo de archivo no permitido. Se permiten: imágenes, PDFs, documentos de Office, archivos de texto y ZIP.');
      return;
    }

    if (!isFileSizeValid(file as File)) {
      alert(`El archivo es demasiado grande. Tamaño máximo: ${formatFileSize(MAX_FILE_SIZE)}`);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const result = await uploadFileForChat(file as File, contactId);

      const fileMetadata: FileMetadata = {
        url: result.url,
        fileName: result.fileName,
        fileSize: result.fileSize,
        fileType: result.fileType,
        downloadUrl: result.url,
      };

      const isImage = file.type.startsWith('image/');
      const messageType = isImage ? 'image' : 'file';

      onSendMessage(file.name, messageType, fileMetadata, result.url, file.type);
      setUploadProgress(100);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      console.error('Error subiendo archivo:', error);
      alert(`Error al subir archivo: ${message}`);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (documentInputRef.current) documentInputRef.current.value = '';
    }
  }, [contactId, onSendMessage]);

  /**
   * Handle image file selection — small images go as base64, large ones to Storage.
   */
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Subir todas las imágenes a Supabase Storage
    uploadFile(file);

    if (e.target) e.target.value = '';
  }, [uploadFile]);

  /**
   * Handle document/general file selection.
   */
  const handleDocumentUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file);
    }
    if (e.target) e.target.value = '';
  }, [uploadFile]);

  /**
   * Handle multiple image upload for quote items.
   */
  const handleQuoteImageUpload = useCallback((
    e: React.ChangeEvent<HTMLInputElement>,
    idx: number,
    onImagesLoaded: (idx: number, images: string[]) => void
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newImages: string[] = [];
    let loadedCount = 0;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event: ProgressEvent<FileReader>) => {
        const imageUrl = event.target?.result as string;
        newImages.push(imageUrl);
        loadedCount++;

        if (loadedCount === files.length) {
          onImagesLoaded(idx, newImages);
        }
      };
      reader.onerror = () => {
        console.error('Error reading quote image:', file.name);
        loadedCount++;
        if (loadedCount === files.length && newImages.length > 0) {
          onImagesLoaded(idx, newImages);
        }
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const triggerDocumentInput = useCallback(() => {
    documentInputRef.current?.click();
  }, []);

  const triggerCameraCapture = useCallback(() => {
    cameraInputRef.current?.click();
  }, []);

  return {
    isUploading,
    uploadProgress,
    fileInputRef,
    cameraInputRef,
    documentInputRef,
    handleImageUpload,
    handleDocumentUpload,
    handleQuoteImageUpload,
    triggerDocumentInput,
    triggerCameraCapture,
  };
};
