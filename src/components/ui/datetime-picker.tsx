"use client";

import * as React from "react";
import { format, isValid } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

interface DateTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function DateTimePicker({ value, onChange, className }: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);

  const selectedDate = React.useMemo(() => {
    if (!value) return undefined;
    const d = new Date(value);
    return isValid(d) ? d : undefined;
  }, [value]);

  const currentTime = React.useMemo(() => {
    if (!value) return { hours: 0, minutes: 0 };
    const d = new Date(value);
    if (!isValid(d)) return { hours: 0, minutes: 0 };
    return { hours: d.getHours(), minutes: d.getMinutes() };
  }, [value]);

  function handleSelect(date: Date | undefined) {
    if (!date) return;
    const next = new Date(date);
    next.setHours(currentTime.hours);
    next.setMinutes(currentTime.minutes);
    onChange(format(next, "yyyy-MM-dd'T'HH:mm"));
    setOpen(false);
  }

  return (
    <div className={cn("relative", className)}>
      <Input
        type="datetime-local"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pr-9 datetime-picker-input"
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-9 w-9 rounded-l-none text-muted-foreground"
            aria-label="Open calendar"
          >
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleSelect}
            initialFocus
            className="pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
