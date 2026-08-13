export type ToastItem = { id: number; text: string; type: "ok" | "err" | "info" };

export function ToastStack({ items, onDismiss }: { items: ToastItem[]; onDismiss: (id: number) => void }) {
  if (!items.length) return null;
  return (
    <div className="toast-stack" role="status">
      {items.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span>{t.text}</span>
          <button type="button" aria-label="Dismiss" onClick={() => onDismiss(t.id)}>
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
