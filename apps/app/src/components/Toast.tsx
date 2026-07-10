export interface ToastContent {
  title: string;
  description: string;
  actionLabel?: string;
}

interface ToastProps {
  toast: ToastContent;
  onDismiss: () => void;
}

export default function Toast({ toast, onDismiss }: ToastProps) {
  return (
    <aside className="interaction-toast">
      <h3>{toast.title}</h3>
      <p>{toast.description}</p>
      <button type="button" onClick={onDismiss}>{toast.actionLabel ?? 'Entendi'}</button>
    </aside>
  );
}
