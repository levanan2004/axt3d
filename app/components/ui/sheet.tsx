import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
export function Sheet({trigger,title,children}:{trigger:ReactNode;title:string;children:ReactNode}) {
 return <Dialog.Root><Dialog.Trigger asChild>{trigger}</Dialog.Trigger><Dialog.Portal><Dialog.Overlay className="sheet-overlay"/><Dialog.Content className="sheet-content"><div className="section-heading"><Dialog.Title>{title}</Dialog.Title><Dialog.Close className="icon-button" aria-label="Đóng bộ lọc"><X size={20}/></Dialog.Close></div><Dialog.Description className="sr-only">Chọn bộ lọc để tìm sản phẩm phù hợp.</Dialog.Description>{children}</Dialog.Content></Dialog.Portal></Dialog.Root>;
}
