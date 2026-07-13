import { useEffect, useState } from 'react';
import { getMessageAttachmentFile, type LocalMessageAttachment as Attachment } from '../../lib/offlineStore';

interface LocalMessageAttachmentProps {
  attachment: Attachment;
  ownerId: string;
  workspaceId: string;
}

export function LocalMessageAttachment({ attachment, ownerId, workspaceId }: LocalMessageAttachmentProps) {
  const [url, setUrl] = useState<string>();
  const [availability, setAvailability] = useState<'checking' | 'ready' | 'missing'>('checking');
  useEffect(() => {
    let active = true;
    let objectUrl: string | undefined;
    void getMessageAttachmentFile(attachment.blobKey, ownerId, workspaceId).then((file) => {
      if (!active) return;
      if (!file) {
        setAvailability('missing');
      } else if (typeof URL.createObjectURL === 'function') {
        objectUrl = URL.createObjectURL(file);
        setUrl(objectUrl);
        setAvailability('ready');
      } else {
        setAvailability('ready');
      }
    }).catch(() => {
      if (active) setAvailability('missing');
    });
    return () => {
      active = false;
      if (objectUrl && typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(objectUrl);
    };
  }, [attachment.blobKey, ownerId, workspaceId]);

  return url ? (
    <a href={url} download={attachment.name}>
      {attachment.name}<small>{Math.ceil(attachment.size / 1024)} KB · salvo localmente</small>
    </a>
  ) : (
    <span className={`local-attachment ${availability === 'missing' ? 'missing' : ''}`}>
      {attachment.name}
      <small>
        {Math.ceil(attachment.size / 1024)} KB · {availability === 'missing'
          ? 'arquivo indisponível'
          : availability === 'ready' ? 'salvo localmente' : 'verificando arquivo'}
      </small>
    </span>
  );
}
