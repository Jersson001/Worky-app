/**
 * Se importa PRIMERO en index.tsx, antes que la app.
 *
 * El orden importa: la librería de sesión de Supabase lee la dirección al crearse
 * y descarta los parámetros de error. Para leerlos hay que llegar antes, y los
 * módulos se ejecutan en el orden en que se importan. Ver utils/retornoDeGoogle.ts.
 */
import { capturarErrorDeRetorno } from './retornoDeGoogle';

capturarErrorDeRetorno();
