'use client';

import type { NoteBlock } from '@studentos/shared';
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { NOTE_BLOCK_TYPES, blockTypeLabel, createEmptyBlock, type NoteBlockType } from '@/modules/notes/utils/blocks';

interface BlockEditorProps {
  blocks: NoteBlock[];
  onChange: (blocks: NoteBlock[]) => void;
}

// T12.6: supports create/edit/delete/reorder for paragraph, heading, list,
// and code blocks. Purely a controlled component — the caller (the note
// detail page) owns persistence via Save.
export function BlockEditor({ blocks, onChange }: BlockEditorProps) {
  const updateBlock = (index: number, next: NoteBlock) => {
    onChange(blocks.map((block, i) => (i === index ? next : block)));
  };

  const removeBlock = (index: number) => {
    onChange(blocks.filter((_, i) => i !== index));
  };

  const moveBlock = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved!);
    onChange(next);
  };

  const addBlock = (type: NoteBlockType) => {
    onChange([...blocks, createEmptyBlock(type)]);
  };

  return (
    <div className="space-y-3">
      {blocks.length === 0 && (
        <p className="rounded-md border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          No blocks yet — add one below.
        </p>
      )}

      {blocks.map((block, index) => (
        <div key={block.id} className="flex gap-2 rounded-md border border-border p-3">
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {blockTypeLabel(block.type)}
            </p>

            {block.type === 'paragraph' && (
              <Textarea
                aria-label={`Paragraph text, block ${index + 1}`}
                value={block.text}
                onChange={(e) => updateBlock(index, { ...block, text: e.target.value })}
                placeholder="Write a paragraph…"
              />
            )}

            {block.type === 'heading' && (
              <div className="flex gap-2">
                <select
                  aria-label={`Heading level, block ${index + 1}`}
                  className="rounded-md border border-input bg-background px-2 text-sm"
                  value={block.level}
                  onChange={(e) =>
                    updateBlock(index, { ...block, level: Number(e.target.value) as 1 | 2 | 3 })
                  }
                >
                  <option value={1}>H1</option>
                  <option value={2}>H2</option>
                  <option value={3}>H3</option>
                </select>
                <Input
                  aria-label={`Heading text, block ${index + 1}`}
                  value={block.text}
                  onChange={(e) => updateBlock(index, { ...block, text: e.target.value })}
                  placeholder="Heading text"
                  className="flex-1"
                />
              </div>
            )}

            {block.type === 'list' && (
              <div className="space-y-1.5">
                {block.items.map((item, itemIndex) => (
                  <div key={itemIndex} className="flex items-center gap-2">
                    <Input
                      aria-label={`List item ${itemIndex + 1}, block ${index + 1}`}
                      value={item}
                      onChange={(e) => {
                        const items = block.items.map((it, i) => (i === itemIndex ? e.target.value : it));
                        updateBlock(index, { ...block, items });
                      }}
                      placeholder="List item"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove list item ${itemIndex + 1}, block ${index + 1}`}
                      onClick={() => {
                        const items = block.items.filter((_, i) => i !== itemIndex);
                        updateBlock(index, { ...block, items: items.length ? items : [''] });
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => updateBlock(index, { ...block, items: [...block.items, ''] })}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add item
                </Button>
              </div>
            )}

            {block.type === 'code' && (
              <div className="space-y-1.5">
                <Input
                  aria-label={`Code language, block ${index + 1}`}
                  value={block.language ?? ''}
                  onChange={(e) => updateBlock(index, { ...block, language: e.target.value || undefined })}
                  placeholder="Language (optional)"
                />
                <Textarea
                  aria-label={`Code, block ${index + 1}`}
                  value={block.code}
                  onChange={(e) => updateBlock(index, { ...block, code: e.target.value })}
                  placeholder="Code…"
                  className="font-mono"
                />
              </div>
            )}
          </div>

          <div className="flex shrink-0 flex-col gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Move block ${index + 1} up`}
              disabled={index === 0}
              onClick={() => moveBlock(index, -1)}
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Move block ${index + 1} down`}
              disabled={index === blocks.length - 1}
              onClick={() => moveBlock(index, 1)}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Delete block ${index + 1}`}
              onClick={() => removeBlock(index)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        {NOTE_BLOCK_TYPES.map((type) => (
          <Button key={type} type="button" variant="outline" size="sm" onClick={() => addBlock(type)}>
            <Plus className="h-3.5 w-3.5" />
            {blockTypeLabel(type)}
          </Button>
        ))}
      </div>
    </div>
  );
}
