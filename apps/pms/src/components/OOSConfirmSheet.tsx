interface Props {
  itemName: string;
  currentStock: number;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function OOSConfirmSheet({
  itemName,
  currentStock,
  onCancel,
  onConfirm,
}: Props) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center"
      onClick={onCancel}
    >
      <div
        className="bg-[var(--color-surface)] w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-6 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-5xl mb-3">{"⚠️"}</p>
        <p className="text-lg font-bold mb-1">Out of stock</p>
        <p className="text-white/70 mb-1">{itemName}</p>
        <p className="text-xs text-white/40 mb-6">
          Current stock: {currentStock}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onCancel}
            className="min-h-[52px] rounded-lg border border-white/20 text-white/70 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="min-h-[52px] rounded-lg bg-yellow-600 text-white font-bold active:scale-95 transition-transform"
          >
            Sell anyway
          </button>
        </div>
      </div>
    </div>
  );
}
