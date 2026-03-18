"use client";

import { Trash2, Shield, UserCheck } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import type { ConfirmModalState } from "./types";

const VARIANT_STYLES = {
  danger: {
    icon: "text-accent-rose",
    iconBg: "bg-accent-rose/10 border-accent-rose/20",
    button: "bg-accent-rose/15 text-accent-rose border-accent-rose/25 hover:bg-accent-rose/25",
  },
  warning: {
    icon: "text-accent-amber",
    iconBg: "bg-accent-amber/10 border-accent-amber/20",
    button: "bg-accent-amber/15 text-accent-amber border-accent-amber/25 hover:bg-accent-amber/25",
  },
  info: {
    icon: "text-accent-cyan",
    iconBg: "bg-accent-cyan/10 border-accent-cyan/20",
    button: "bg-accent-cyan/15 text-accent-cyan border-accent-cyan/25 hover:bg-accent-cyan/25",
  },
};

export function ConfirmModal({
  state,
  onClose,
}: {
  state: ConfirmModalState;
  onClose: () => void;
}) {
  const v = VARIANT_STYLES[state.variant];
  const IconComponent =
    state.variant === "danger" ? Trash2 : state.variant === "warning" ? Shield : UserCheck;

  return (
    <Dialog.Root open={state.open} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[60] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-navy-700/60 bg-navy-900/95 backdrop-blur-md p-6 shadow-2xl">
          <div className="flex items-start gap-4">
            <div className={`flex-shrink-0 rounded-lg border p-2.5 ${v.iconBg}`}>
              <IconComponent className={`h-4 w-4 ${v.icon}`} />
            </div>
            <div className="flex-1 min-w-0">
              <Dialog.Title className="text-sm font-semibold text-navy-100 font-mono">
                {state.title}
              </Dialog.Title>
              <Dialog.Description className="text-xs text-navy-400 mt-1.5 leading-relaxed">
                {state.description}
              </Dialog.Description>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-navy-700/30">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-md text-[11px] font-mono uppercase tracking-wider text-navy-400 hover:text-navy-200 hover:bg-navy-800/50 border border-navy-700/30 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                state.onConfirm();
                onClose();
              }}
              className={`px-3 py-1.5 rounded-md text-[11px] font-mono uppercase tracking-wider border transition-colors ${v.button}`}
            >
              {state.confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
