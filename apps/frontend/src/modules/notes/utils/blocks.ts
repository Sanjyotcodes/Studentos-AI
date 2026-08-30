import type { NoteBlock } from '@studentos/shared';
import { NOTE_BLOCK_TYPES, type NoteBlockType } from '@studentos/shared';

export { NOTE_BLOCK_TYPES };
export type { NoteBlockType };

const BLOCK_TYPE_LABELS: Record<NoteBlockType, string> = {
  paragraph: 'Paragraph',
  heading: 'Heading',
  list: 'List',
  code: 'Code',
};

export function blockTypeLabel(type: NoteBlockType): string {
  return BLOCK_TYPE_LABELS[type];
}

// Client-generated id — exists for React keys and stable editing, not server
// identity (see noteBlockSchema in packages/shared).
function newBlockId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `block-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createEmptyBlock(type: NoteBlockType): NoteBlock {
  const id = newBlockId();
  switch (type) {
    case 'paragraph':
      return { id, type: 'paragraph', text: '' };
    case 'heading':
      return { id, type: 'heading', level: 2, text: '' };
    case 'list':
      return { id, type: 'list', items: [''] };
    case 'code':
      return { id, type: 'code', code: '' };
  }
}
