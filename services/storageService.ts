import { supabase } from './supabaseConfig';
import { getCurrentUserId } from './messagingService';

/**
 * Subir un archivo a Supabase Storage
 */
export const uploadFile = async (
  file: File,
  folder: string = 'files'
): Promise<{ url: string; fileName: string; fileSize: number; fileType: string }> => {
  try {
    const userId = getCurrentUserId();
    const timestamp = Date.now();
    const fileName = `${timestamp}_${file.name}`;
    const filePath = `${folder}/${userId}/${fileName}`;

    // Subir archivo
    const { error: uploadError } = await supabase.storage
      .from('files')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    // Obtener URL pública
    const { data } = supabase.storage.from('files').getPublicUrl(filePath);

    return {
      url: data.publicUrl,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    };
  } catch (error) {
    console.error('Error subiendo archivo:', error);
    throw new Error(
      `Error al subir archivo: ${error instanceof Error ? error.message : 'Error desconocido'}`
    );
  }
};

/**
 * Subir archivo para un chat específico
 */
export const uploadFileForChat = async (
  file: File,
  contactId: string
): Promise<{ url: string; fileName: string; fileSize: number; fileType: string }> => {
  try {
    const userId = getCurrentUserId();
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${timestamp}_${sanitizedFileName}`;
    const filePath = `${userId}/${contactId}/${fileName}`;

    // Subir archivo al bucket 'chat_media'
    const { error: uploadError } = await supabase.storage
      .from('chat_media')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    // Obtener URL pública
    const { data } = supabase.storage.from('chat_media').getPublicUrl(filePath);

    return {
      url: data.publicUrl,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    };
  } catch (error) {
    console.error('Error subiendo archivo para chat:', error);
    throw error;
  }
};

/**
 * Sube una foto de producto y devuelve su URL pública.
 *
 * Las fotos se guardaban dentro de la fila del producto, en base64: seis
 * productos eran 7,5 MB que la app se bajaba enteros antes de pintar el
 * catálogo, y por eso las miniaturas tardaban en aparecer. Aquí la foto pasa a
 * ser un archivo y en la fila queda solo su dirección, unos cien bytes.
 *
 * Va al mismo bucket que las imágenes del chat, que ya tiene subida para
 * usuarios autenticados y lectura pública: no hace falta tocar la base.
 *
 * Recibe la foto como data URL —es lo que produce el formulario tras
 * reducirla— y la convierte en archivo para subirla.
 */
export const uploadProductPhoto = async (dataUrl: string): Promise<string> => {
  const userId = getCurrentUserId();
  const blob = await (await fetch(dataUrl)).blob();
  const extension = blob.type === 'image/png' ? 'png' : 'jpg';
  const filePath = `${userId}/productos/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${extension}`;

  const { error } = await supabase.storage
    .from('chat_media')
    .upload(filePath, blob, { contentType: blob.type || 'image/jpeg' });

  if (error) throw error;

  const { data } = supabase.storage.from('chat_media').getPublicUrl(filePath);
  return data.publicUrl;
};

/**
 * Eliminar un archivo de Supabase Storage
 */
export const deleteFile = async (fileUrl: string): Promise<void> => {
  try {
    // Extraer la ruta del archivo desde la URL
    const url = new URL(fileUrl);
    const pathArray = url.pathname.split('/');
    // La ruta está después de /storage/v1/object/public/
    const filePath = pathArray.slice(6).join('/');

    if (!filePath) {
      console.warn('No se pudo extraer la ruta del archivo');
      return;
    }

    // Determinar el bucket (files o chats)
    const bucket = pathArray[5] || 'files';

    const { error } = await supabase.storage.from(bucket).remove([filePath]);

    if (error && !error.message.includes('not found')) {
      throw error;
    }
  } catch (error) {
    console.error('Error eliminando archivo:', error);
  }
};

/**
 * Obtener URL de descarga de un archivo
 */
export const getFileDownloadURL = async (filePath: string): Promise<string> => {
  try {
    const { data } = supabase.storage.from('files').getPublicUrl(filePath);
    return data.publicUrl;
  } catch (error) {
    console.error('Error obteniendo URL de descarga:', error);
    throw error;
  }
};

/**
 * Validar tipo de archivo permitido
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
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'application/zip',
    'application/x-zip-compressed',
  ];

  return allowedTypes.includes(file.type);
};

/**
 * Obtener tamaño máximo de archivo permitido (10MB)
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Validar tamaño de archivo
 */
export const isFileSizeValid = (file: File): boolean => {
  return file.size <= MAX_FILE_SIZE;
};

/**
 * Formatear tamaño de archivo para mostrar
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Obtener icono según tipo de archivo
 */
export const getFileIcon = (fileType: string): string => {
  if (fileType.startsWith('image/')) return 'fa-image';
  if (fileType === 'application/pdf') return 'fa-file-pdf';
  if (fileType.includes('word') || fileType.includes('document'))
    return 'fa-file-word';
  if (fileType.includes('excel') || fileType.includes('spreadsheet'))
    return 'fa-file-excel';
  if (fileType.includes('zip') || fileType.includes('compressed'))
    return 'fa-file-zipper';
  if (fileType === 'text/plain') return 'fa-file-lines';
  return 'fa-file';
};
