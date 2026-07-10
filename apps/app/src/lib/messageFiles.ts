export const MESSAGE_FILE_LIMIT = 2 * 1024 * 1024;
export const MESSAGE_TOTAL_FILE_LIMIT = 3.75 * 1024 * 1024;

const ALLOWED_MESSAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'text/plain'
]);

export function validateMessageFiles(files: File[]): void {
  if (files.some((file) => file.size <= 0)) {
    throw new Error('Anexos vazios não podem ser enviados.');
  }
  if (files.some((file) => file.size > MESSAGE_FILE_LIMIT)) {
    throw new Error('Cada anexo deve ter no máximo 2 MB.');
  }
  if (files.reduce((total, file) => total + file.size, 0) > MESSAGE_TOTAL_FILE_LIMIT) {
    throw new Error('O total dos anexos deve ter no máximo 3,75 MB.');
  }
  const invalid = files.find((file) => !ALLOWED_MESSAGE_TYPES.has(file.type));
  if (invalid) {
    throw new Error(`O tipo do anexo “${invalid.name}” não é permitido.`);
  }
}
