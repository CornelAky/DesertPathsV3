import { Search, X } from 'lucide-react';

interface FilterBarProps {
  customerNameFilter: string;
  statusFilter: string;
  monthFilter: number;
  yearFilter: number;
  guideFilter: string;
  availableYears: number[];
  availableGuides: Array<{ id: string; name: string }>;
  onCustomerNameChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onMonthChange: (value: number) => void;
  onYearChange: (value: number) => void;
  onGuideChange: (value: string) => void;
  onClearFilters: () => void;
  activeFilterCount: number;
  resultCount: number;
  totalCount: number;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function FilterBar({
  customerNameFilter,
  statusFilter,
  monthFilter,
  yearFilter,
  guideFilter,
  availableYears,
  availableGuides,
  onCustomerNameChange,
  onStatusChange,
  onMonthChange,
  onYearChange,
  onGuideChange,
  onClearFilters,
  activeFilterCount,
  resultCount,
  totalCount,
}: FilterBarProps) {
  return (
    <div className="bg-white rounded-lg border border-brand-gray-3 shadow-sm p-4 mb-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-3">
        <div className="relative">
          <label className="block text-xs font-medium text-brand-brown mb-1">
            Customer Name
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-brand-gray-2" />
            <input
              type="text"
              value={customerNameFilter}
              onChange={(e) => onCustomerNameChange(e.target.value)}
              placeholder="Search customer..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-brand-gray-3 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-brand-brown mb-1">
            Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-brand-gray-3 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent"
          >
            <option value="all">All Statuses</option>
            <option value="booked">Booked</option>
            <option value="pending">Pending</option>
            <option value="not_required">Not Required</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-brand-brown mb-1">
            Month
          </label>
          <select
            value={monthFilter}
            onChange={(e) => onMonthChange(Number(e.target.value))}
            className="w-full px-3 py-2 text-sm border border-brand-gray-3 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent"
          >
            <option value="0">All Months</option>
            {MONTHS.map((month, index) => (
              <option key={month} value={index + 1}>
                {month}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-brand-brown mb-1">
            Year
          </label>
          <select
            value={yearFilter}
            onChange={(e) => onYearChange(Number(e.target.value))}
            className="w-full px-3 py-2 text-sm border border-brand-gray-3 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent"
          >
            <option value="0">All Years</option>
            {availableYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-brand-brown mb-1">
            Guide Name
          </label>
          <select
            value={guideFilter}
            onChange={(e) => onGuideChange(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-brand-gray-3 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent"
          >
            <option value="all">All Guides</option>
            {availableGuides.map((guide) => (
              <option key={guide.id} value={guide.id}>
                {guide.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          {activeFilterCount > 0 && (
            <button
              onClick={onClearFilters}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-brand-brown bg-brand-gray-4 hover:bg-brand-gray-3 rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
              Clear ({activeFilterCount})
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-brand-gray-1 pt-3 border-t border-brand-gray-3">
        <span>
          Showing <span className="font-semibold text-brand-orange">{resultCount}</span> of{' '}
          <span className="font-semibold">{totalCount}</span> activities
        </span>
        {activeFilterCount > 0 && (
          <span className="text-brand-orange font-medium">
            {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active
          </span>
        )}
      </div>
    </div>
  );
}
