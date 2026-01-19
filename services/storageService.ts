import { storage } from './firebaseConfig';
import { ref, uploadBytes, getDownloadURL, deleteObject, UploadResult } from 'firebase/storage';
import { getCurrentUserId } from './messagingService';

/**
 * Subir un archivo a Firebase Storage
 * @param file - Archivo a subir
 * @param folder - Carpeta donde guardar (opcional, por defecto 'files')
 * @returns URL de descarga del archivo
 */
export const uploadFile = async (
  file: File,
  folder: string = 'files'
): Promise<{ url: string; fileName: string; fileSize: number; fileType: string }> => {
  try {
    if (!storage) {
      throw new Error('Firebase Storage no está configurado');
    }

    const userId = getCurrentUserId();
    const timestamp = Date.now();
    const fileName = `${timestamp}_${file.name}`;
    
    // Crear referencia al archivo en Storage
    // Estructura: files/{userId}/{folder}/{timestamp}_{filename}
    const storageRef = ref(storage, `${folder}/${userId}/${fileName}`);
    
    // Subir el archivo
    const uploadResult: UploadResult = await uploadBytes(storageRef, file);
    
    // Obtener URL de descarga
    const downloadURL = await getDownloadURL(uploadResult.ref);
    
    return {
      url: downloadURL,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    };
  } catch (error) {
    console.error('Error subiendo archivo:', error);
    throw new Error(`Error al subir archivo: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
};

/**
 * Subir archivo para un chat específico
 * @param file - Archivo a subir
 * @param contactId - ID del contacto con quien se comparte
 * @returns URL de descarga y metadata del archivo
 */
export const uploadFileForChat = async (
  file: File,
  contactId: string
): Promise<{ url: string; fileName: string; fileSize: number; fileType: string }> => {
  try {
    if (!storage) {
      throw new Error('Firebase Storage no está configurado');
    }

    // Verificar autenticación
    const { auth } = await import('./firebaseConfig');
    if (!auth || !auth.currentUser) {
      throw new Error('Debes estar autenticado para subir archivos. Por favor inicia sesión.');
    }

    const userId = auth.currentUser.uid; // Usar UID de Firebase Auth
    const timestamp = Date.now();
    const fileName = `${timestamp}_${file.name}`;
    
    // Crear referencia al archivo en Storage
    // Estructura: chats/{userId}/{contactId}/{timestamp}_{filename}
    const storageRef = ref(storage, `chats/${userId}/${contactId}/${fileName}`);
    
    // Subir el archivo
    const uploadResult: UploadResult = await uploadBytes(storageRef, file);
    
    // Obtener URL de descarga
    const downloadURL = await getDownloadURL(uploadResult.ref);
    
    return {
      url: downloadURL,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    };
  } catch (error) {
    console.error('Error subiendo archivo para chat:', error);
    throw error;
  }
};

/**
 * Eliminar un archivo de Firebase Storage
 * @param fileUrl - URL del archivo a eliminar
 */
export const deleteFile = async (fileUrl: string): Promise<void> => {
  try {
    if (!storage) {
      throw new Error('Firebase Storage no está configurado');
    }

    // Crear referencia desde la URL
    const fileRef = ref(storage, fileUrl);
    
    // Eliminar el archivo
    await deleteObject(fileRef);
  } catch (error) {
    console.error('Error eliminando archivo:', error);
    // No lanzar error si el archivo no existe
    if (error instanceof Error && !error.message.includes('not found')) {
      throw error;
    }
  }
};

/**
 * Obtener URL de descarga de un archivo
 * @param filePath - Ruta del archivo en Storage
 * @returns URL de descarga
 */
export const getFileDownloadURL = async (filePath: string): Promise<string> => {
  try {
    if (!storage) {
      throw new Error('Firebase Storage no está configurado');
    }

    const fileRef = ref(storage, filePath);
    return await getDownloadURL(fileRef);
  } catch (error) {
    console.error('Error obteniendo URL de descarga:', error);
    throw error;
  }
};

/**
 * Validar tipo de archivo permitido
 * @param file - Archivo a validar
 * @returns true si el archivo es permitido
 */
export const isFileTypeAllowed = (file: File): boolean => {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'text/plain',
    'application/zip',
    'application/x-zip-compressed'
  ];
  
  return allowedTypes.includes(file.type);
};

/**
 * Obtener tamaño máximo de archivo permitido (10MB)
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Validar tamaño de archivo
 * @param file - Archivo a validar
 * @returns true si el tamaño es válido
 */
export const isFileSizeValid = (file: File): boolean => {
  return file.size <= MAX_FILE_SIZE;
};

/**
 * Formatear tamaño de archivo para mostrar
 * @param bytes - Tamaño en bytes
 * @returns Tamaño formateado (KB, MB, etc.)
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Obtener icono según tipo de archivo
 * @param fileType - Tipo MIME del archivo
 * @returns Nombre del icono de Font Awesome
 */
export const getFileIcon = (fileType: string): string => {
  if (fileType.startsWith('image/')) return 'fa-image';
  if (fileType === 'application/pdf') return 'fa-file-pdf';
  if (fileType.includes('word') || fileType.includes('document')) return 'fa-file-word';
  if (fileType.includes('excel') || fileType.includes('spreadsheet')) return 'fa-file-excel';
  if (fileType.includes('zip') || fileType.includes('compressed')) return 'fa-file-zipper';
  if (fileType === 'text/plain') return 'fa-file-lines';
  return 'fa-file';
};

