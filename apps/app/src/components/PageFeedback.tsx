interface ErrorProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function LoadingState({ label = 'Carregando registros…' }: { label?: string }) {
  return <div className="loading-state" role="status"><span aria-hidden="true" />{label}</div>;
}

export function ErrorState({ title = 'Não foi possível carregar', message, onRetry }: ErrorProps) {
  return (
    <div className="error-state" role="alert">
      <div><b>{title}</b><p>{message}</p></div>
      {onRetry && <button type="button" className="ghost-button" onClick={onRetry}>Tentar novamente</button>}
    </div>
  );
}

export function EmptyState({ title, message, action }: {
  title: string;
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <b>{title}</b>
      <p>{message}</p>
      {action}
    </div>
  );
}
