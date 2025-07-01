'use client';
import { useLifiWidget } from '../../app/lifiProvider';

const LifiWidgetButton = () => {
  const { openWidget } = useLifiWidget();

  return (
    <button
      className="w-14 h-14 bg-pink-500 text-white rounded-full shadow-lg border-b-4 border-pink-700 active:translate-y-1 transition-all flex items-center justify-center"
      onClick={openWidget}
      style={{
        boxShadow: '0 4px #c026d3, 0 2px 8px rgba(0,0,0,0.15)',
      }}
    >
      🔻
    </button>
  );
};

export default LifiWidgetButton;