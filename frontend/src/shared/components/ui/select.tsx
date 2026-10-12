"use client";

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp, Search } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useSelect } from "./Select/useSelect";

export interface SelectOption {
  value: string;
  label: string;
}

const SelectGroup = SelectPrimitive.Group;

const SelectValue = SelectPrimitive.Value;

const SelectTrigger = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex h-9 w-full items-center justify-between rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-xs ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1 cursor-pointer",
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectScrollUpButton = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-1",
      className
    )}
    {...props}
  >
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
));
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;

const SelectScrollDownButton = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-1",
      className
    )}
    {...props}
  >
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
));
SelectScrollDownButton.displayName =
  SelectPrimitive.ScrollDownButton.displayName;

const SelectContent = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        "relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        position === "popper" &&
          "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
        className
      )}
      position={position}
      {...props}
    >
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={cn(
          "p-1",
          position === "popper" &&
            "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectLabel = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("py-1.5 pl-8 pr-2 text-xs font-semibold text-muted-foreground", className)}
    {...props}
  />
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;

const SelectItem = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

const SelectSeparator = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-border", className)}
    {...props}
  />
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

// High-level polymorphic Select supporting options array for toolbars or Radix primitives
interface ConvenientSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  className?: string;
}

type SelectProps =
  | (ConvenientSelectProps & { children?: never })
  | (React.ComponentPropsWithoutRef<typeof SelectPrimitive.Root> & {
      options?: never;
      onChange?: never;
    });

function SelectWithOptions({
  value,
  onChange,
  options,
  placeholder,
  searchable = false,
  searchPlaceholder = "Search…",
  className,
}: ConvenientSelectProps) {
  const {
    open,
    query,
    setQuery,
    inputRef,
    filtered,
    selectedLabel,
    handleOpen,
    select,
    close,
  } = useSelect({
    value,
    onChange,
    options,
    placeholder,
    searchable,
  });

  return (
    <div className={cn("relative w-full", className)}>
      <button
        type="button"
        onClick={handleOpen}
        className={cn(
          "w-full h-9 pl-3 pr-8 relative flex items-center text-left rounded-lg border border-input bg-background text-sm transition-colors cursor-pointer hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          value ? "text-foreground" : "text-muted-foreground"
        )}
      >
        <span className="flex-1 truncate">{selectedLabel}</span>
        <ChevronDown
          size={13}
          className={cn(
            "absolute right-2.5 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={close}
            onKeyDown={(e) => e.key === "Escape" && close()}
            aria-hidden="true"
          />
          <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden min-w-[160px] animate-in fade-in-0 zoom-in-95">
            {searchable && (
              <div className="p-2 border-b border-border">
                <div className="flex items-center gap-1.5 h-7 px-2 bg-muted rounded-md">
                  <Search size={12} className="text-muted-foreground shrink-0" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={searchPlaceholder}
                    className="flex-1 text-[12.5px] bg-transparent outline-none placeholder:text-muted-foreground"
                  />
                </div>
              </div>
            )}

            <div className="max-h-44 overflow-y-auto py-1">
              {placeholder !== undefined && (
                <button
                  type="button"
                  onClick={() => select("")}
                  className={cn(
                    "w-full text-left px-3 py-1.5 text-[13px] hover:bg-muted transition-colors flex items-center gap-2",
                    !value ? "text-primary font-medium" : "text-muted-foreground"
                  )}
                >
                  {!value ? <Check size={12} className="shrink-0" /> : <span className="w-3 shrink-0" />}
                  <span>{placeholder}</span>
                </button>
              )}

              {filtered.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => select(o.value)}
                  className={cn(
                    "w-full text-left px-3 py-1.5 text-[13px] hover:bg-muted transition-colors flex items-center gap-2",
                    value === o.value ? "text-primary font-medium" : "text-foreground"
                  )}
                >
                  {value === o.value ? <Check size={12} className="shrink-0" /> : <span className="w-3 shrink-0" />}
                  <span>{o.label}</span>
                </button>
              ))}

              {searchable && filtered.length === 0 && (
                <p className="px-3 py-2 text-[12.5px] text-muted-foreground text-center">No results found</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Select(props: SelectProps) {
  if ("options" in props && props.options !== undefined) {
    return <SelectWithOptions {...(props as ConvenientSelectProps)} />;
  }

  return <SelectPrimitive.Root {...(props as React.ComponentPropsWithoutRef<typeof SelectPrimitive.Root>)} />;
}

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
};
