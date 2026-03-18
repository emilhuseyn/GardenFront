'use client';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils/constants';

const Drawer = DialogPrimitive.Root;
const DrawerTrigger = DialogPrimitive.Trigger;
const DrawerClose = DialogPrimitive.Close;

function DrawerOverlay({ className, ...props }: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      className={cn('fixed inset-0 z-50 bg-black/30 backdrop-blur-sm', className)}
      {...props}
    />
  );
}

interface DrawerContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  side?: 'left' | 'right' | 'bottom';
}

function DrawerContent({ className, side = 'right', children, ...props }: DrawerContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DrawerOverlay />
      <DialogPrimitive.Content
        className={cn(
          'fixed z-50 bg-white dark:bg-[#1e2130] focus:outline-none shadow-2xl',
          side === 'right' && 'right-0 top-0 h-full w-full max-w-md animate-slide-in-right',
          side === 'left'  && 'left-0 top-0 h-full w-full max-w-xs',
          side === 'bottom'&& 'bottom-0 left-0 right-0 rounded-t-2xl max-h-[90vh] overflow-y-auto',
          className
        )}
        {...props}
      >
        <div className={cn(side === 'bottom' ? 'p-6' : 'h-full flex flex-col')}>
          {children}
        </div>
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
          <X size={18} />
          <span className="sr-only">Bağla</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

function DrawerHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('px-6 pt-6 pb-4 border-b border-white-border dark:border-gray-700/60', className)} {...props}>
      {children}
    </div>
  );
}

function DrawerTitle({ className, ...props }: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn('text-lg font-semibold text-gray-900 dark:text-gray-50 font-display', className)}
      {...props}
    />
  );
}

function DrawerBody({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex-1 overflow-y-auto px-6 py-5', className)} {...props}>
      {children}
    </div>
  );
}

function DrawerFooter({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('px-6 py-4 border-t border-white-border dark:border-gray-700/60 flex gap-3 justify-end', className)} {...props}>
      {children}
    </div>
  );
}

export { Drawer, DrawerTrigger, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle, DrawerBody, DrawerFooter };
