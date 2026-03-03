import { Eye, EyeOff } from 'lucide-react';

interface SectionHeaderProps {
  icon: React.ReactNode;
  title: string;
  isVisible: boolean;
  onToggle: () => void;
  onAdd: () => void;
  addButtonText: string;
  addButtonIcon: React.ReactNode;
  showBulkAdd?: boolean;
  onBulkAdd?: () => void;
}

export function SectionHeader({
  icon,
  title,
  isVisible,
  onToggle,
  onAdd,
  addButtonText,
  addButtonIcon,
  showBulkAdd,
  onBulkAdd,
}: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center space-x-2">
        {icon}
        <h2 className="text-xl font-bold text-brand-navy">{title}</h2>
        <button
          onClick={onToggle}
          className="ml-2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          title={isVisible ? 'Hide section' : 'Show section'}
        >
          {isVisible ? (
            <Eye className="w-4 h-4 text-brand-brown-warm" />
          ) : (
            <EyeOff className="w-4 h-4 text-gray-400" />
          )}
        </button>
      </div>
      {isVisible && (
        <div className="flex gap-2">
          {showBulkAdd && onBulkAdd && (
            <button
              onClick={onBulkAdd}
              className="flex items-center space-x-2 px-4 py-2 bg-brand-cyan bg-opacity-40 hover:bg-opacity-50 text-brand-brown border border-brand-cyan rounded-lg transition-colors text-sm"
            >
              {addButtonIcon}
              <span>Bulk Add</span>
            </button>
          )}
          <button
            onClick={onAdd}
            className="flex items-center space-x-2 px-4 py-2 bg-brand-terracotta hover:bg-brand-terracotta-dark text-white rounded-lg transition-colors"
          >
            {addButtonIcon}
            <span>{addButtonText}</span>
          </button>
        </div>
      )}
    </div>
  );
}

interface DropZoneProps {
  isActive: boolean;
  onDrop: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  children?: React.ReactNode;
}

export function DropZone({ isActive, onDrop, onDragOver, onDragLeave, children }: DropZoneProps) {
  return (
    <div
      onDrop={(e) => {
        e.preventDefault();
        onDrop();
      }}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      className={`transition-all rounded-xl ${
        isActive
          ? 'bg-brand-terracotta bg-opacity-10 border-2 border-dashed border-brand-terracotta p-4'
          : 'border-2 border-transparent'
      }`}
    >
      {isActive && !children && (
        <div className="py-12 text-center">
          <p className="text-brand-terracotta font-medium">Drop here to move activity</p>
        </div>
      )}
      {children}
    </div>
  );
}
