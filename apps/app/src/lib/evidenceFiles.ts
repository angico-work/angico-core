const EVIDENCE_FILE_LIMIT = 2 * 1024 * 1024;

const EVIDENCE_FILE_TYPES = new Map<string, string>([
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.webp', 'image/webp'],
  ['.pdf', 'application/pdf'],
  ['.txt', 'text/plain']
]);

export function validateEvidenceFile(file: File): void {
  if (file.size <= 0) {
    throw new Error('O arquivo da evidência não pode estar vazio.');
  }
  if (file.size > EVIDENCE_FILE_LIMIT) {
    throw new Error('O arquivo da evidência deve ter no máximo 2 MB.');
  }
  const dot = file.name.lastIndexOf('.');
  const extension = dot >= 0 ? file.name.slice(dot).toLowerCase() : '';
  if (EVIDENCE_FILE_TYPES.get(extension) !== file.type.toLowerCase()) {
    throw new Error('Use um arquivo JPG, PNG, WebP, PDF ou TXT compatível com sua extensão.');
  }
}
