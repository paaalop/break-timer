interface AvatarProps {
  name: string;
  size?: number;
  className?: string;
  variant?: 'default' | 'danger' | 'muted';
  initialsLength?: 1 | 2;
}

export default function Avatar({
  name,
  size = 28,
  className,
  variant = 'default',
  initialsLength = 1,
}: AvatarProps) {
  const background = variant === 'danger'
    ? 'var(--color-danger-surface)'
    : variant === 'muted'
      ? 'var(--color-surface-subtle)'
      : 'var(--color-muted-bg)';
  const color = variant === 'danger'
    ? 'var(--color-danger)'
    : variant === 'muted'
      ? 'var(--color-text-muted)'
      : 'var(--color-primary)';

  return (
    <span
      className={['ui-avatar', className].filter(Boolean).join(' ')}
      style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.4)), background, color }}
      aria-hidden="true"
    >
      {name.trim().slice(-initialsLength)}
    </span>
  );
}
