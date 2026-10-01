import { StrictMode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import BottomSheet from './BottomSheet';
import Dialog from './Dialog';
import ConfirmDialog from './ConfirmDialog';
import TimeWheelPickerModal from './TimeWheelPickerModal';

describe('shared overlays', () => {
  it('stays open without adding duplicate history when effects are replayed', async () => {
    const pushState = vi.spyOn(window.history, 'pushState');
    const onClose = vi.fn();
    const view = render(
      <StrictMode>
        <BottomSheet onClose={onClose}>
          <button type="button">시트</button>
        </BottomSheet>
      </StrictMode>,
    );

    expect(pushState).toHaveBeenCalledOnce();
    await new Promise((resolve) => window.setTimeout(resolve, 20));
    expect(onClose).not.toHaveBeenCalled();
    view.unmount();
    pushState.mockRestore();
  });

  it('locks body scroll and restores focus when the last overlay closes', async () => {
    const onClose = vi.fn();
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();

    const view = render(
      <BottomSheet onClose={onClose} titleId="sheet-title">
        <h2 id="sheet-title">시트</h2>
        <button type="button">작업</button>
      </BottomSheet>,
    );

    expect(document.body.style.overflow).toBe('hidden');
    view.unmount();
    await waitFor(() => expect(document.body.style.overflow).toBe(''));
    expect(trigger).toHaveFocus();
    trigger.remove();
  });

  it('only dismisses the top overlay with Escape and keeps nested scroll lock', async () => {
    const closeSheet = vi.fn();
    const closeDialog = vi.fn();
    const view = render(
      <>
        <BottomSheet onClose={closeSheet}><button type="button">시트</button></BottomSheet>
        <Dialog open onClose={closeDialog}><button type="button">대화상자</button></Dialog>
      </>,
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(closeDialog).toHaveBeenCalledOnce();
    expect(closeSheet).not.toHaveBeenCalled();
    expect(document.body.style.overflow).toBe('hidden');

    view.rerender(<BottomSheet onClose={closeSheet}><button type="button">시트</button></BottomSheet>);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(closeSheet).toHaveBeenCalledOnce();
  });

  it.each(['dialog', 'sheet'] as const)(
    'does not dismiss the %s with Escape while an input is composing',
    (variant) => {
      const onClose = vi.fn();
      const content = <input aria-label="이름" />;

      render(
        variant === 'dialog'
          ? <Dialog open onClose={onClose}>{content}</Dialog>
          : <BottomSheet onClose={onClose}>{content}</BottomSheet>,
      );

      const input = screen.getByRole('textbox', { name: '이름' });
      input.focus();
      fireEvent.keyDown(input, { key: 'Escape', isComposing: true });
      expect(onClose).not.toHaveBeenCalled();

      fireEvent.keyDown(input, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledOnce();
    },
  );

  it('dismisses from the backdrop but not from panel interaction', () => {
    const onClose = vi.fn();
    render(
      <Dialog open onClose={onClose}>
        <button type="button">내부</button>
      </Dialog>,
    );

    fireEvent.mouseDown(screen.getByRole('button', { name: '내부' }));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.mouseDown(screen.getByRole('dialog').parentElement!);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('uses the shared sheet without drag handlers for the time picker', () => {
    render(
      <TimeWheelPickerModal
        isOpen
        value="14:00"
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    const backdrop = screen.getByRole('dialog').parentElement!;
    expect(backdrop).toHaveAttribute('data-overlay-variant', 'sheet');
    expect(screen.getByRole('dialog').style.transform).toBe('');
  });

  it('runs confirmation through the shared dialog', () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        open
        title="삭제 확인"
        description="삭제됩니다."
        confirmLabel="삭제"
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '삭제' }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });
});
