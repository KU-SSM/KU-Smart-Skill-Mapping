import React, { useEffect, useState } from 'react';
import './InstructionHelpBubble.css';

type HelpAnchor = {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
};

export interface InstructionHelpBubbleProps {
  content: React.ReactNode;
  ariaLabel: string;
  /** Optional class on the ? trigger (e.g. align with section titles) */
  triggerClassName?: string;
}

const InstructionHelpBubble: React.FC<InstructionHelpBubbleProps> = ({
  content,
  ariaLabel,
  triggerClassName = '',
}) => {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<HelpAnchor | null>(null);

  const close = () => {
    setOpen(false);
    setAnchor(null);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('resize', close);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('resize', close);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const onTriggerClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();
    const r = e.currentTarget.getBoundingClientRect();
    setAnchor({
      top: r.top,
      left: r.left,
      width: r.width,
      height: r.height,
      bottom: r.bottom,
    });
    setOpen(true);
  };

  return (
    <>
      <button
        type="button"
        className={`ihb-trigger ${triggerClassName}`.trim()}
        aria-label={ariaLabel}
        title="Help"
        onClick={onTriggerClick}
      >
        ?
      </button>
      {open && anchor && (
        <>
          <div className="ihb-dismiss" role="presentation" aria-hidden onClick={close} />
          <div
            className="ihb-cloud"
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
            style={{
              top: anchor.bottom + 10,
              left: Math.max(16, Math.min(anchor.left + anchor.width / 2, window.innerWidth - 16)),
              transform: 'translateX(-50%)',
            }}
            onClick={close}
          >
            <div className="ihb-cloud-inner" onClick={close}>
              {content}
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default InstructionHelpBubble;
