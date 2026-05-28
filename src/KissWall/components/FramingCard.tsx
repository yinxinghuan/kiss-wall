// Opening framing card. Tells the player what they're doing in two italic
// lines, dismisses on any tap → game starts.

import { useState } from 'react';
import { getLocale } from '../i18n';

interface FramingCardProps {
  onDismiss: () => void;
}

const LINES_EN = [
  'leave a kiss in the dark',
  'for someone you miss.',
];
const LINES_ZH = [
  '在黑暗里留下一个吻',
  '献给你想念的人。',
];

export function FramingCard({ onDismiss }: FramingCardProps) {
  const [closing, setClosing] = useState(false);
  const lines = getLocale() === 'zh' ? LINES_ZH : LINES_EN;

  const handleTap = () => {
    if (closing) return;
    setClosing(true);
    setTimeout(onDismiss, 320);
  };

  return (
    <div
      className={`kw-framing${closing ? ' is-closing' : ''}`}
      onPointerDown={handleTap}
      data-no-feedback="true"
      role="button"
      tabIndex={0}
    >
      <div className="kw-framing__inner">
        <div className="kw-framing__line">{lines[0]}</div>
        <div className="kw-framing__line">{lines[1]}</div>
        <div className="kw-framing__hint">tap to begin</div>
      </div>
    </div>
  );
}
