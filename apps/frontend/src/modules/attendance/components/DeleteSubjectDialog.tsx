'use client';

import type { Subject } from '@studentos/shared';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useDeleteSubject } from '@/modules/attendance/hooks/useDeleteSubject';

interface DeleteSubjectDialogProps {
  subject: Subject | null;
  onOpenChange: (open: boolean) => void;
}

// T9.9: deleting a subject asks for confirmation and removes its history —
// history removal is a straightforward consequence of the backend cascading
// the delete; this dialog is the confirmation gate in front of it.
export function DeleteSubjectDialog({ subject, onOpenChange }: DeleteSubjectDialogProps) {
  const deleteSubject = useDeleteSubject();

  return (
    <Dialog open={subject !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {subject?.name}?</DialogTitle>
          <DialogDescription>
            This permanently removes the subject and its entire attendance history. This can&apos;t
            be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={deleteSubject.isPending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={deleteSubject.isPending}
            onClick={() => {
              if (!subject) return;
              deleteSubject.mutate(subject.id, { onSuccess: () => onOpenChange(false) });
            }}
          >
            {deleteSubject.isPending ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
