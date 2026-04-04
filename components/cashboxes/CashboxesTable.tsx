'use client';
import { motion } from 'framer-motion';
import { Edit2, Wallet, Building2, Check, X } from 'lucide-react';
import type { Cashbox } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { Switch } from '@/components/ui/Switch';

interface CashboxesTableProps {
  data: Cashbox[];
  onEdit?: (cashbox: Cashbox) => void;
  onToggleStatus?: (id: number, isActive: boolean) => void;
  canEdit?: boolean;
}

export function CashboxesTable({ data, onEdit, onToggleStatus, canEdit }: CashboxesTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-gray-100 dark:border-gray-800 text-sm text-gray-400">
            <th className="py-3 px-4 font-medium w-16">ID</th>
            <th className="py-3 px-4 font-medium">Kassa Adı</th>
            <th className="py-3 px-4 font-medium">Növ</th>
            <th className="py-3 px-4 font-medium">Status</th>
            {(canEdit) && <th className="py-3 px-4 font-medium text-right">Əməliyyat</th>}
          </tr>
        </thead>
        <tbody>
          {data.map((box, index) => (
            <motion.tr
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              key={box.id}
              className="border-b border-gray-50 dark:border-gray-800/60 hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors group"
            >
              <td className="py-3 px-4 text-sm text-gray-500">#{box.id}</td>
              <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${box.type === 1 ? 'bg-green-100 text-green-600 dark:bg-green-900/30' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30'}`}>
                    {box.type === 1 ? <Wallet size={16} /> : <Building2 size={16} />}
                  </div>
                  {box.name}
                </div>
              </td>
              <td className="py-3 px-4">
                <Badge variant={box.type === 1 ? 'green' : 'blue'}>
                  {box.type === 1 ? 'Nağd' : 'Bank'}
                </Badge>
              </td>
              <td className="py-3 px-4">
                {canEdit && onToggleStatus ? (
                  <Switch
                    checked={box.isActive}
                    onCheckedChange={(checked) => onToggleStatus(box.id, checked)}
                  />
                ) : (
                  <Badge variant={box.isActive ? 'active' : 'inactive'}>
                    {box.isActive ? 'Açılıb' : 'Bağlıdır'}
                  </Badge>
                )}
              </td>
              {(canEdit) && (
                <td className="py-3 px-4 text-right">
                  {onEdit && (
                    <button
                      onClick={() => onEdit(box)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-500/10 transition-colors tooltip tooltip-left"
                      data-tip="Düzəliş et"
                    >
                      <Edit2 size={16} />
                    </button>
                  )}
                </td>
              )}
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}