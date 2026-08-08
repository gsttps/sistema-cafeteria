/**
 * Descarga de archivos generados por el backend (blobs).
 */

/** Extrae el filename de un header Content-Disposition, si viene. */
export const nombreDesdeCabecera = (contentDisposition?: string): string | null => {
  if (!contentDisposition) return null;
  const match = /filename="?([^";]+)"?/i.exec(contentDisposition);
  return match ? match[1] : null;
};

/** Dispara la descarga de un blob y libera la URL temporal. */
export const descargarBlob = (blob: Blob, nombreArchivo: string): void => {
  const url = URL.createObjectURL(blob);
  try {
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombreArchivo;
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
  } finally {
    URL.revokeObjectURL(url);
  }
};

/**
 * Lee el mensaje de error de una respuesta que esperaba un blob.
 * Cuando axios usa responseType 'blob', el cuerpo de error también llega como
 * blob, así que hay que convertirlo a texto para leer el `detail` del backend.
 */
export const leerErrorDeBlob = async (data: unknown): Promise<string | null> => {
  if (!(data instanceof Blob)) return null;
  try {
    const texto = await data.text();
    const json = JSON.parse(texto);
    return typeof json?.detail === 'string' ? json.detail : null;
  } catch {
    return null;
  }
};
