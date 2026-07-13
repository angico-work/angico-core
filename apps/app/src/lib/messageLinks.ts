export const MESSAGE_LINK_TYPES = [
  'TERRITORIO',
  'OBSERVACAO',
  'PROBLEMA',
  'POTENCIALIDADE',
  'MISSAO',
  'ACAO',
  'RESULTADO',
  'INDICADOR'
] as const;

export type MessageLinkedEntityType = typeof MESSAGE_LINK_TYPES[number];

export interface MessageLinkFields {
  linkedEntityType?: string | null;
  linkedEntityId?: string | null;
}

const MESSAGE_LINK_TYPE_SET = new Set<string>(MESSAGE_LINK_TYPES);

function positiveReference(value: string): boolean {
  return /^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value));
}

export function isValidMessageLinkPair(type: unknown, id: unknown): boolean {
  if (type === null && id === null) return true;
  return typeof type === 'string'
    && MESSAGE_LINK_TYPE_SET.has(type)
    && typeof id === 'string'
    && positiveReference(id);
}

export function normalizeMessageLink(input: MessageLinkFields): {
  linkedEntityType: MessageLinkedEntityType;
  linkedEntityId: string;
} | undefined {
  const rawType = input.linkedEntityType?.trim() ?? '';
  const linkedEntityId = input.linkedEntityId?.trim() ?? '';
  if (!rawType && !linkedEntityId) return undefined;
  if (!rawType || !linkedEntityId) {
    throw new Error('Informe o tipo e referência da entidade vinculada.');
  }
  const linkedEntityType = rawType.toUpperCase() as MessageLinkedEntityType;
  if (!MESSAGE_LINK_TYPE_SET.has(linkedEntityType)) {
    throw new Error('Este tipo de entidade não pode ser vinculado à mensagem.');
  }
  if (!positiveReference(linkedEntityId)) {
    throw new Error('Informe uma referência válida para a entidade vinculada.');
  }
  return { linkedEntityType, linkedEntityId };
}

export function messageLinksMatch(left: MessageLinkFields, right: MessageLinkFields): boolean {
  return (left.linkedEntityType ?? null) === (right.linkedEntityType ?? null)
    && (left.linkedEntityId ?? null) === (right.linkedEntityId ?? null);
}
