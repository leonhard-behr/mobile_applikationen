export function EmptyState({ message }: { message: string }) {
  return (
    <div style={{
      padding: '40px 20px',
      textAlign: 'center',
      color: 'var(--color-text-muted)',
      fontSize: '13px',
      fontWeight: 600,
      background: 'var(--color-surface-light)',
      borderRadius: '16px',
      border: '2px dashed rgba(0,0,0,0.06)',
      lineHeight: 1.5,
    }}>
      {message}
    </div>
  );
}
