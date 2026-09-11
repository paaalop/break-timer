'use client';

import React, { useState, useRef, useImperativeHandle, forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: 'underline' | 'borderless' | 'boxed';
  containerStyle?: React.CSSProperties;
  onClear?: () => void;
  showClearButton?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    variant = 'boxed',
    containerStyle,
    style,
    value,
    defaultValue,
    onChange,
    onFocus,
    onBlur,
    onClear,
    showClearButton = true,
    disabled,
    ...rest
  },
  ref
) {
  const [isFocused, setIsFocused] = useState(false);
  const innerRef = useRef<HTMLInputElement>(null);
  useImperativeHandle(ref, () => innerRef.current as HTMLInputElement);

  const hasValue = value !== undefined ? String(value).length > 0 : Boolean(innerRef.current?.value);
  const shouldShowClear = showClearButton && !disabled && isFocused && hasValue;

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onChange) {
      const syntheticEvent = {
        target: { value: '' },
        currentTarget: { value: '' },
      } as React.ChangeEvent<HTMLInputElement>;
      onChange(syntheticEvent);
    }
    onClear?.();
    if (innerRef.current) {
      innerRef.current.value = '';
    }
    innerRef.current?.focus();
  };

  const wrapperStyle: React.CSSProperties = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    boxSizing: 'border-box',
    ...containerStyle,
  };

  const getVariantStyle = (): React.CSSProperties => {
    switch (variant) {
      case 'underline':
        return {
          border: 'none',
          borderBottom: isFocused ? '2px solid var(--color-primary)' : '1.5px solid var(--color-border)',
          borderRadius: 0,
          background: 'transparent',
          outline: 'none',
          transition: 'border-color 0.15s ease',
        };
      case 'borderless':
        return {
          border: 'none',
          borderRadius: 8,
          background: 'var(--color-surface)',
          outline: 'none',
        };
      case 'boxed':
      default:
        return {
          border: isFocused ? '1.5px solid var(--color-primary)' : '1px solid var(--color-border)',
          borderRadius: 8,
          background: 'var(--color-bg)',
          outline: 'none',
          transition: 'border-color 0.15s ease',
        };
    }
  };

function decomposePadding(padding?: React.CSSProperties['padding']) {
  if (padding === undefined || padding === null) return {};
  if (typeof padding === 'number') {
    return {
      paddingTop: padding,
      paddingRight: padding,
      paddingBottom: padding,
      paddingLeft: padding,
    };
  }
  const parts = String(padding).trim().split(/\s+/);
  if (parts.length === 1) {
    return { paddingTop: parts[0], paddingRight: parts[0], paddingBottom: parts[0], paddingLeft: parts[0] };
  }
  if (parts.length === 2) {
    return { paddingTop: parts[0], paddingRight: parts[1], paddingBottom: parts[0], paddingLeft: parts[1] };
  }
  if (parts.length === 3) {
    return { paddingTop: parts[0], paddingRight: parts[1], paddingBottom: parts[2], paddingLeft: parts[1] };
  }
  if (parts.length >= 4) {
    return { paddingTop: parts[0], paddingRight: parts[1], paddingBottom: parts[2], paddingLeft: parts[3] };
  }
  return {};
}

  const { padding: customPadding, ...otherCustomStyles } = style || {};
  const decomposedCustom = decomposePadding(customPadding);
  const variantStyle = getVariantStyle();
  const { padding: variantPadding, ...otherVariantStyles } = variantStyle;
  const decomposedVariant = decomposePadding(variantPadding);

  const basePaddingRight =
    otherCustomStyles.paddingRight ??
    decomposedCustom.paddingRight ??
    otherVariantStyles.paddingRight ??
    decomposedVariant.paddingRight ??
    (variant === 'underline' ? 0 : 12);

  const resolvedPaddingRight = shouldShowClear
    ? (typeof basePaddingRight === 'number' ? Math.max(30, basePaddingRight + 16) : 30)
    : basePaddingRight;

  return (
    <div style={wrapperStyle}>
      <input
        ref={innerRef}
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        disabled={disabled}
        onFocus={(e) => {
          setIsFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          onBlur?.(e);
        }}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          color: 'var(--color-neutral-dark)',
          letterSpacing: '-0.02em',
          ...decomposedVariant,
          ...otherVariantStyles,
          ...decomposedCustom,
          ...otherCustomStyles,
          paddingRight: resolvedPaddingRight,
        }}
        {...rest}
      />
      {shouldShowClear && (
        <button
          type="button"
          tabIndex={-1}
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleClear}
          aria-label="입력 내용 지우기"
          style={{
            position: 'absolute',
            right: variant === 'underline' ? 4 : 10,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: '#C4BFB8',
            color: '#FFFFFF',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            padding: 0,
            transition: 'background-color 0.15s ease',
            flexShrink: 0,
            zIndex: 3,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#9C958D')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#C4BFB8')}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  );
});

export default Input;
