import { useEffect, useId, useRef } from 'react';

interface Props {
  /** The body style being switched to, e.g. "Van". */
  targetLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Native modal dialog (FR-018, research R7): focus is trapped by the browser, Escape cancels,
 * and the caller returns focus to the button that opened it. Rendered only while open.
 */
export function ConfirmSwitchDialog({ targetLabel, onConfirm, onCancel }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const bodyId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    // jsdom and very old browsers lack showModal(); the open attribute still shows it.
    if (typeof d.showModal === 'function' && !d.open) d.showModal();
    else d.setAttribute('open', '');
    cancelRef.current?.focus();
    return () => {
      if (typeof d.close === 'function' && d.open) d.close();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      onCancel={(e) => {
        // Escape: let React unmount us instead of the browser closing the element.
        e.preventDefault();
        onCancel();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onCancel();
        }
      }}
    >
      <h2 id={titleId}>Start a new inspection?</h2>
      <p id={bodyId}>Switching to {targetLabel} clears the conditions and notes recorded so far.</p>
      <div className="dialog-actions">
        <button ref={cancelRef} type="button" className="btn caps" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="btn btn-primary caps" onClick={onConfirm}>
          Switch and clear
        </button>
      </div>
    </dialog>
  );
}
