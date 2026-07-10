import { attachmentUrl } from '../../lib/api';
import type { MensagemAnexo } from '../../types';

export function RemoteMessageAttachments({ attachments }: { attachments: MensagemAnexo[] }) {
  return (
    <div className="attachment-list">
      {attachments.map((attachment) => (
        <a key={attachment.id} href={attachmentUrl(attachment.id)} target="_blank" rel="noreferrer">
          {attachment.originalFilename}<small>{Math.ceil(attachment.sizeBytes / 1024)} KB</small>
        </a>
      ))}
    </div>
  );
}
