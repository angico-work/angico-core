import { useEffect, useState } from 'react';

export function SelectedMessageFile({ file, onRemove }: { file: File; onRemove: () => void }) {
  const [preview, setPreview] = useState<string>();
  useEffect(() => {
    if (!file.type.startsWith('image/') || typeof URL.createObjectURL !== 'function') return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return (
    <article className="selected-file">
      {preview && <img src={preview} alt="" />}
      <div><b>{file.name}</b><small>{Math.ceil(file.size / 1024)} KB · salvo localmente</small></div>
      <button type="button" aria-label={`Remover ${file.name}`} onClick={onRemove}>×</button>
    </article>
  );
}
