'use client';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils/constants';

const Modal = DialogPrimitive.Root;
const ModalTrigger = DialogPrimitive.Trigger;
const ModalClose = DialogPrimitive.Close;

function ModalPortal({ children }: { children: React.ReactNode }) {
  return <DialogPrimitive.Portal>{children}</DialogPrimitive.Portal>;
}

function ModalOverlay({ className, ...props }: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      className={cn(
        'fixed inset-0 z-50 bg-black/40 backdrop-blur-sm',
        'data-[state=open]:animate-scale-in data-[state=closed]:animate-scale-in',
        className
      )}
      {...props}
    />
  );
}

interface ModalContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
};

function ModalContent({ className, size = 'md', children, ...props }: ModalContentProps) {
  return (
    <ModalPortal>
      <ModalOverlay />
      <DialogPrimitive.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
          'w-full bg-white dark:bg-[#1e2130] rounded-2xl shadow-2xl p-6',
          'focus:outline-none',
          'data-[state=open]:animate-scale-in',
          sizeMap[size],
          className
        )}
        style={{ boxShadow: '0 20px 60px -12px rgb(0 0 0/0.15), 0 8px 24px -8px rgb(0 0 0/0.1)' }}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400">
          <X size={16} />
          <span className="sr-only">Bağla</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </ModalPortal>
  );
}

function ModalHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('mb-5', className)} {...props}>
      {children}
    </div>
  );
}

function ModalTitle({ className, ...props }: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn('text-lg font-semibold text-gray-900 dark:text-gray-50 font-display', className)}
      {...props}
    />
  );
}

function ModalDescription({ className, ...props }: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn('text-sm text-gray-500 dark:text-gray-400 mt-1', className)}
      {...props}
    />
  );
}

function ModalFooter({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex justify-end gap-3 mt-6 pt-5 border-t border-white-border dark:border-gray-700', className)} {...props}>
      {children}
    </div>
  );
}

export {
  Modal, ModalTrigger, ModalClose, ModalContent,
  ModalHeader, ModalTitle, ModalDescription, ModalFooter,
};
