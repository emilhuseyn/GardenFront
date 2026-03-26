'use client';
import { Trash2 } from 'lucide-react';
import {
  Modal, ModalContent, ModalHeader, ModalTitle,
  ModalDescription, ModalFooter, ModalClose,
} from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface ConfirmDeleteModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  childName: string;
  loading?: boolean;
}

export function ConfirmDeleteModal({
  open, onClose, onConfirm, childName, loading,
}: ConfirmDeleteModalProps) {
  return (
    <Modal open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <ModalContent size="sm">
        <ModalHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
              <Trash2 size={18} className="text-rose-500" />
            </div>
            <ModalTitle>Uşağı sil</ModalTitle>
          </div>
          <ModalDescription>
            <span className="font-semibold text-gray-800 dark:text-gray-200">"{childName}"</span> adlı uşaq sistemdən
            birdəfəlik silinəcək. Bu əməliyyat geri alına bilməz.
          </ModalDescription>
        </ModalHeader>
        <ModalFooter>
          <ModalClose asChild>
            <Button variant="secondary" size="sm" disabled={loading} onClick={onClose}>
              Ləğv et
            </Button>
          </ModalClose>
          <Button variant="danger" size="sm" loading={loading} onClick={onConfirm}>
            <Trash2 size={14} /> Sil
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
