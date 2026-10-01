import type { CSSProperties, ReactNode } from 'react';

interface DateNavigatorProps {
  label: ReactNode;
  onPrevious: () => void;
  onNext: () => void;
  onLabelClick?: () => void;
  labelStyle?: CSSProperties;
  previousLabel?: string;
  nextLabel?: string;
}

export default function DateNavigator({
  label,
  onPrevious,
  onNext,
  onLabelClick,
  labelStyle,
  previousLabel = '이전',
  nextLabel = '다음',
}: DateNavigatorProps) {
  return (
    <div className="ui-date-navigator">
      <button type="button" className="ui-date-navigator__button" onClick={onPrevious} aria-label={previousLabel}>
        ‹
      </button>
      <button
        type="button"
        className="ui-date-navigator__label"
        style={{ background: 'transparent', border: 0, cursor: onLabelClick ? 'pointer' : 'default', ...labelStyle }}
        onClick={onLabelClick}
      >
        {label}
      </button>
      <button type="button" className="ui-date-navigator__button" onClick={onNext} aria-label={nextLabel}>
        ›
      </button>
    </div>
  );
}
