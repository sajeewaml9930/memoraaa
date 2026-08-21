"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

function Sheet({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="sheet" {...props} />
}

function SheetPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({ className, ...props }: DialogPrimitive.Backdrop.Props) {
  return <DialogPrimitive.Backdrop data-slot="sheet-overlay" className={cn("fixed inset-0 z-50 bg-black/25 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0", className)} {...props} />
}

function SheetContent({ className, children, side = "right", ...props }: DialogPrimitive.Popup.Props & { side?: "top" | "right" | "bottom" | "left" }) {
  const sideClasses = {
    top: "inset-x-0 top-0 border-b data-open:slide-in-from-top data-closed:slide-out-to-top",
    right: "inset-y-0 right-0 h-full w-full border-l sm:max-w-md data-open:slide-in-from-right data-closed:slide-out-to-right",
    bottom: "inset-x-0 bottom-0 border-t data-open:slide-in-from-bottom data-closed:slide-out-to-bottom",
    left: "inset-y-0 left-0 h-full w-full border-r sm:max-w-md data-open:slide-in-from-left data-closed:slide-out-to-left",
  };
  return <SheetPortal><SheetOverlay /><DialogPrimitive.Popup data-slot="sheet-content" className={cn("fixed z-50 flex flex-col gap-4 bg-background p-0 shadow-xl outline-none duration-300 data-open:animate-in data-closed:animate-out", sideClasses[side], className)} {...props}>{children}<DialogPrimitive.Close className="absolute right-4 top-4 rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Close"><X className="size-5" /></DialogPrimitive.Close></DialogPrimitive.Popup></SheetPortal>
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) { return <div className={cn("flex flex-col gap-1.5 px-6 pt-6", className)} {...props} /> }
function SheetTitle({ className, ...props }: DialogPrimitive.Title.Props) { return <DialogPrimitive.Title className={cn("text-base font-semibold", className)} {...props} /> }

export { Sheet, SheetContent, SheetHeader, SheetTitle }