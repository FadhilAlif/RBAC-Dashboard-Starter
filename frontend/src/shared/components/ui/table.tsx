import * as React from "react";
import { cn } from "@/shared/lib/utils";
import { Spinner } from "./Spinner";

const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-auto">
    <table
      ref={ref}
      className={cn("w-full caption-bottom text-sm", className)}
      {...props}
    />
  </div>
));
Table.displayName = "Table";

const Thead = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
));
Thead.displayName = "Thead";

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
));
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
      className
    )}
    {...props}
  />
));
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b border-border transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
      className
    )}
    {...props}
  />
));
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-10 px-4 py-2.5 text-left align-middle text-[11px] font-medium uppercase tracking-[0.02em] text-muted-foreground border-b border-border whitespace-nowrap [&:has([role=checkbox])]:pr-0",
      className
    )}
    {...props}
  />
));
TableHead.displayName = "TableHead";

// TableHeader alias to TableHead for 100% backward compatibility
const TableHeader = TableHead;

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn("px-4 py-3 align-middle [&:has([role=checkbox])]:pr-0", className)}
    {...props}
  />
));
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-sm text-muted-foreground", className)}
    {...props}
  />
));
TableCaption.displayName = "TableCaption";

// Shell and helper rows
interface TableShellProps {
  children: React.ReactNode;
  className?: string;
}

function TableShell({ children, className }: TableShellProps) {
  return (
    <div className={cn("rounded-xl border border-border bg-card shadow-xs", className)}>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

interface TableLoadingRowProps {
  isLoading: boolean;
  colSpan: number;
}

function TableLoadingRow({ isLoading, colSpan }: TableLoadingRowProps) {
  if (!isLoading) return null;
  return (
    <TableRow>
      <TableCell colSpan={colSpan}>
        <div className="flex justify-center items-center gap-2.5 text-[13px] text-muted-foreground py-4">
          <Spinner size="sm" />
          <span>Fetching latest data…</span>
        </div>
      </TableCell>
    </TableRow>
  );
}

interface TableEmptyRowProps {
  isEmpty: boolean;
  colSpan: number;
  icon?: React.ReactNode;
  title?: string;
  description?: string;
}

function TableEmptyRow({
  isEmpty,
  colSpan,
  icon,
  title = "No results found",
  description = "Try adjusting your filters.",
}: TableEmptyRowProps) {
  if (!isEmpty) return null;
  return (
    <tr>
      <td colSpan={colSpan}>
        <div className="flex flex-col items-center gap-3 py-16 px-4 text-center">
          {icon && (
            <div className="w-14 h-14 flex items-center justify-center rounded-2xl bg-muted border border-border text-muted-foreground">
              {icon}
            </div>
          )}
          <div className="text-[15px] font-semibold text-foreground">{title}</div>
          <div className="text-[13.5px] text-muted-foreground max-w-sm">{description}</div>
        </div>
      </td>
    </tr>
  );
}

export {
  Table,
  Thead,
  TableHeader,
  TableHead,
  TableBody,
  TableFooter,
  TableRow,
  TableCell,
  TableCaption,
  TableShell,
  TableLoadingRow,
  TableEmptyRow,
};
