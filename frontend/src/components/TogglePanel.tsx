import { useState } from 'react';
import ClosedOrdersPanel from './CloseOrderPanel';
import OpenPositionsPanel from './OrderPanel';

export default function OrdersSection() {
  const [activePanel, setActivePanel] = useState<'open' | 'closed'>('open');

  return (
    <div className="px-2  pb-2     bg-background rounded-xl border border-gray-700 shadow-md mt-6">
      <div className="flex border-b border-gray-700 mb-4">
        <button
          onClick={() => setActivePanel('open')}
          className={`px-4 py-2 text-sm font-medium transition relative ${
            activePanel === 'open'
              ? 'text-blue-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Open
          {activePanel === 'open' && (
            <span className="absolute bottom-0 left-0 w-full h-[2px] bg-blue-400 rounded-full"></span>
          )}
        </button>
        <button
          onClick={() => setActivePanel('closed')}
          className={`px-4 py-2 text-sm font-medium transition relative ${
            activePanel === 'closed'
              ? 'text-blue-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Closed
          {activePanel === 'closed' && (
            <span className="absolute bottom-0 left-0 w-full h-[2px] bg-blue-400 rounded-full"></span>
          )}
        </button>
      </div>

      <div className="transition-opacity duration-300">
        {activePanel === 'open' ? (
          <OpenPositionsPanel />
        ) : (
          <ClosedOrdersPanel />
        )}
      </div>
    </div>
  );
}
