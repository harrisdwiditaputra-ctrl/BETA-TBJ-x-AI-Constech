import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// Simple Select implementation without @radix-ui
interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  children?: React.ReactNode;
}

interface SelectContextType {
  value?: string;
  onValueChange?: (value: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const SelectContext = React.createContext<SelectContextType>({
  isOpen: false,
  setIsOpen: () => {},
});

export function Select({ value, onValueChange, children }: SelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  return (
    <SelectContext.Provider value={{ value, onValueChange, isOpen, setIsOpen }}>
      <div className="relative" onClick={() => setIsOpen(!isOpen)}>
        {children}
      </div>
    </SelectContext.Provider>
  );
}

export function SelectTrigger({ className, children }: { className?: string; children?: React.ReactNode }) {
  const { isOpen } = React.useContext(SelectContext);
  return (
    <button
      type="button"
      className={cn(
        "flex h-9 w-full items-center justify-between rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
    >
      {children}
      <ChevronDown className={cn("w-4 h-4 opacity-50 transition-transform", isOpen && "rotate-180")} />
    </button>
  );
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  const { value } = React.useContext(SelectContext);
  return <span className={!value ? "text-muted-foreground" : ""}>{value || placeholder}</span>;
}

export function SelectContent({ className, children }: { className?: string; children?: React.ReactNode }) {
  const { isOpen, setIsOpen } = React.useContext(SelectContext);
  if (!isOpen) return null;
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
      <div className={cn(
        "absolute top-full left-0 z-50 w-full min-w-[8rem] mt-1 overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-md",
        className
      )}>
        <div className="py-1">{children}</div>
      </div>
    </>
  );
}

export function SelectItem({ value, children, className }: { value: string; children?: React.ReactNode; className?: string }) {
  const { onValueChange, setIsOpen, value: selectedValue } = React.useContext(SelectContext);
  return (
    <div
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center py-2 pl-8 pr-4 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
        selectedValue === value && "bg-accent/10 font-medium",
        className
      )}
      onClick={(e) => {
        e.stopPropagation();
        onValueChange?.(value);
        setIsOpen(false);
      }}
    >
      {children}
    </div>
  );
}

export function SelectSeparator({ className }: { className?: string }) {
  return <div className={cn("my-1 h-px bg-muted", className)} />;
}

export function SelectLabel({ className, children }: { className?: string; children?: React.ReactNode }) {
  return <div className={cn("py-1.5 pl-8 pr-4 text-xs font-semibold text-muted-foreground", className)}>{children}</div>;
}
