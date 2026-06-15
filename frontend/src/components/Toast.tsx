import { useEffect, useState } from "react";

export type ToastKind = "info" | "success" | "error" | "warning";

export type ToastState = {
  message: string;
  kind: ToastKind;
} | null;

const KIND_STYLES: Record<ToastKind, { bg: string; border: string; icon: string }> = {
  info:    { bg: "var(--surface-2)", border: "var(--border)", icon: "ℹ️" },
  success: { bg: "var(--success-sub)", border: "var(--success-border)", icon: "✅" },
  error:   { bg: "var(--danger-sub)", border: "var(--danger-border)", icon: "❌" },
  warning: { bg: "var(--warning-sub)", border: "var(--warning-border)", icon: "⚠️" },
};

export function Toast({ toast }: { toast: ToastState }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (toast) {
      setVisible(true);
      const id = setTimeout(() => setVisible(false), 4000);
      return () => clearTimeout(id);
    }
  }, [toast]);

  if (!toast || !visible) return null;

  const style = KIND_STYLES[toast.kind];

  return (
    <div
      style={{
        position: "fixed",
        bottom: "var(--sp-4)",
        right: "var(--sp-4)",
        zIndex: 9999,
        padding: "var(--sp-3) var(--sp-4)",
        background: style.bg,
        border: `1px solid ${style.border}`,
        borderRadius: "var(--r-lg)",
        boxShadow: "var(--shadow-lg)",
        display: "flex",
        alignItems: "center",
        gap: "var(--sp-2)",
        fontSize: "var(--text-sm)",
        color: "var(--text)",
        maxWidth: 420,
        animation: "fadeSlideUp 0.2s ease-out",
      }}
      role="alert"
    >
      <span>{style.icon}</span>
      <span>{toast.message}</span>
    </div>
  );
}
