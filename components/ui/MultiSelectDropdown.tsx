'use client';

import { useState, useRef, useEffect } from 'react';

export interface DropdownOption<T> {
  value: T;
  label: string;
}

interface MultiSelectDropdownProps<T extends string | number> {
  options: DropdownOption<T>[];
  selected: T[];
  onChange: (selected: T[]) => void;
  placeholder?: string;
  singleSelect?: boolean;
}

export default function MultiSelectDropdown<T extends string | number>({
  options,
  selected,
  onChange,
  placeholder = '선택',
  singleSelect = false,
}: MultiSelectDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPos({
        top: rect.bottom + 2,
        left: Math.max(70, Math.min(window.innerWidth - 70, rect.left + rect.width / 2)),
      });
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleScroll = () => {
      setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen]);

  const toggleOption = (val: T) => {
    if (singleSelect) {
      onChange([val]);
      setIsOpen(false);
      return;
    }
    if (selected.includes(val)) {
      onChange(selected.filter((v) => v !== val));
    } else {
      onChange([...selected, val]);
    }
  };

  const displayText =
    selected.length > 0
      ? [...selected]
          .sort((a, b) => {
            const idxA = options.findIndex((o) => o.value === a);
            const idxB = options.findIndex((o) => o.value === b);
            return idxA - idxB;
          })
          .map((v) => options.find((o) => o.value === v)?.label ?? String(v))
          .join(', ')
      : placeholder;

  return (
    <div
      style={{ position: 'relative', width: '100%', height: '100%' }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        style={{
          width: '100%',
          height: '100%',
          minHeight: 26,
          padding: '2px 4px',
          fontSize: 11,
          border: 'none',
          outline: 'none',
          background: 'transparent',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          boxSizing: 'border-box',
          position: 'relative',
        }}
      >
        <span
          style={{
            flex: 1,
            textAlign: 'center',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: selected.length ? 'var(--color-neutral-dark)' : '#999',
            fontSize: 11,
            paddingRight: 10,
          }}
        >
          {displayText}
        </span>
        <span style={{ position: 'absolute', right: 2, fontSize: 8, color: '#888', flexShrink: 0 }}>
          ▼
        </span>
      </button>

      {isOpen && pos && (
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            transform: 'translateX(-50%)',
            zIndex: 9999,
            background: '#ffffff',
            border: '1px solid var(--color-border)',
            borderTop: '2px solid var(--color-primary)',
            borderRadius: 4,
            padding: '6px 10px',
            minWidth: 110,
            maxHeight: 200,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            boxSizing: 'border-box',
            textAlign: 'left',
          }}
        >
          {options.map((opt) => {
            const isChecked = selected.includes(opt.value);
            return (
              <label
                key={String(opt.value)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  cursor: 'pointer',
                  padding: '2px 4px',
                  borderRadius: 3,
                  userSelect: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                <input
                  type={singleSelect ? 'radio' : 'checkbox'}
                  name={singleSelect ? 'single-select-group' : undefined}
                  checked={isChecked}
                  onChange={() => toggleOption(opt.value)}
                  style={{ cursor: 'pointer', margin: 0 }}
                />
                <span>{opt.label}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
