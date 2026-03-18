'use client';
import React, { useState, useMemo } from 'react';
import { format, addMonths, subMonths, isSameDay, isToday, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, getYear, getMonth, setMonth, setYear, isSameMonth } from 'date-fns';
import { az } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';
import { cn } from '@/lib/utils/constants';

interface DatePickerProps {
  date: Date;
  onDateChange: (date: Date) => void;
  className?: string;
  children?: React.ReactNode;
}

export function DatePicker({ date, onDateChange, className, children }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(date);
  const [viewMode, setViewMode] = useState<'days' | 'months' | 'years'>('days');

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setViewDate(date);
      setViewMode('days');
    }
    setOpen(newOpen);
  };

  const days = useMemo(() => {
    const startM = startOfMonth(viewDate);
    const endM = endOfMonth(viewDate);
    const startGrid = startOfWeek(startM, { weekStartsOn: 1 });
    const endGrid = endOfWeek(endM, { weekStartsOn: 1 });

    const grid = [];
    let curr = startGrid;
    while (curr <= endGrid) {
      grid.push(curr);
      curr = addDays(curr, 1);
    }
    return grid;
  }, [viewDate]);

  const months = useMemo(() => {
    return Array.from({ length: 12 }).map((_, i) => {
      const d = new Date();
      d.setMonth(i);
      return format(d, 'MMM', { locale: az });
    });
  }, []);

  const years = useMemo(() => {
    const currentYear = getYear(viewDate);
    const startY = currentYear - 10;
    return Array.from({ length: 20 }).map((_, i) => startY + i);
  }, [viewDate]);

  const toggleViewMode = () => {
    if (viewMode === 'days') setViewMode('years');
    else if (viewMode === 'years') setViewMode('months');
    else setViewMode('days');
  };

  const handlePrev = () => {
    if (viewMode === 'days') setViewDate(subMonths(viewDate, 1));
    else if (viewMode === 'years') setViewDate(setYear(viewDate, getYear(viewDate) - 20));
  };

  const handleNext = () => {
    if (viewMode === 'days') setViewDate(addMonths(viewDate, 1));
    else if (viewMode === 'years') setViewDate(setYear(viewDate, getYear(viewDate) + 20));
  };

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>
        {children || (
          <button className={cn("flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-gray-800 dark:text-gray-100 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-all shadow-sm", className)}>
            <CalendarDays size={16} className="text-green-500 hidden sm:block" />
            <span>{format(date, 'd MMMM yyyy', { locale: az })}</span>
          </button>
        )}
      </Popover.Trigger>
      
      <Popover.Portal>
        <Popover.Content
          align="center"
          sideOffset={8}
          className="z-50 w-72 p-3 bg-white dark:bg-[#1e2130] rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700/60 animate-in fade-in zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:zoom-out-95"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handlePrev}
              type="button"
              className={cn(
                "p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-500 transition-colors",
                viewMode === 'months' && "invisible"
              )}
            >
              <ChevronLeft size={16} />
            </button>
            
            <button
              onClick={toggleViewMode}
              type="button"
              className="text-sm font-bold text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700/50 px-3 py-1 rounded-lg transition-colors capitalize"
            >
              {viewMode === 'days' && format(viewDate, 'MMMM yyyy', { locale: az })}
              {viewMode === 'months' && format(viewDate, 'yyyy')}
              {viewMode === 'years' && `${years[0]} - ${years[years.length - 1]}`}
            </button>

            <button
              onClick={handleNext}
              type="button"
              className={cn(
                "p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-500 transition-colors",
                viewMode === 'months' && "invisible"
              )}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Days View */}
          {viewMode === 'days' && (
            <>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['B.e', 'Ç.A', 'Ç', 'C.A', 'C', 'Ş', 'B'].map((d) => (
                  <div key={d} className="text-[10px] font-bold text-gray-400 text-center py-1">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {days.map((d, i) => {
                  const isCurMonth = isSameMonth(d, viewDate);
                  const isSel = isSameDay(d, date);
                  const isTod = isToday(d);
                  
                  return (
                    <button
                      key={i}
                      onClick={() => {
                        onDateChange(d);
                        setOpen(false);
                      }}
                      className={cn(
                        "h-8 w-full rounded-lg text-xs font-semibold flex items-center justify-center transition-all",
                        !isCurMonth && "text-gray-300 dark:text-gray-600 opacity-50",
                        isCurMonth && !isSel && "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/50",
                        isSel && "bg-green-500 text-white shadow-md hover:bg-green-600",
                        isTod && !isSel && "text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400"
                      )}
                    >
                      {format(d, 'd')}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Months View */}
          {viewMode === 'months' && (
            <div className="grid grid-cols-3 gap-2">
              {months.map((m, i) => {
                const isSel = getMonth(date) === i && getYear(date) === getYear(viewDate);
                return (
                  <button
                    key={m}
                    onClick={() => {
                      setViewDate(setMonth(viewDate, i));
                      setViewMode('days');
                    }}
                    className={cn(
                      "py-3 rounded-xl text-xs font-bold capitalize transition-all",
                      isSel 
                        ? "bg-green-500 text-white shadow-md"
                        : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/50"
                    )}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          )}

          {/* Years View */}
          {viewMode === 'years' && (
            <div className="grid grid-cols-4 gap-2">
              {years.map((y) => {
                const isSel = getYear(date) === y;
                return (
                  <button
                    key={y}
                    onClick={() => {
                      setViewDate(setYear(viewDate, y));
                      setViewMode('months');
                    }}
                    className={cn(
                      "py-2 rounded-xl text-xs font-bold transition-all",
                      isSel 
                        ? "bg-green-500 text-white shadow-md"
                        : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/50"
                    )}
                  >
                    {y}
                  </button>
                );
              })}
            </div>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
