import { useState, useEffect } from 'react';
import {
  Clock,
  MapPin,
  Edit,
  Trash2,
  GripVertical,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Ticket,
  Paperclip,
  Copy,
  Wallet,
  CreditCard,
  MinusCircle,
  Check,
} from 'lucide-react';
import type { Activity } from '../../lib/database.types';
import { BarcodeModal } from './BarcodeModal';
import { supabase } from '../../lib/supabase';

interface PremiumActivityCardProps {
  activity: Activity;
  isDraggable?: boolean;
  onDragStart?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onUpdate?: () => void;
  bookingFeeSummary?: {
    totalAmount: number;
    currency: string;
    hasUnpaidFees: boolean;
  } | null;
  isBeingDragged?: boolean;
}

export default function PremiumActivityCard({
  activity,
  isDraggable = false,
  onDragStart,
  onEdit,
  onDelete,
  onDuplicate,
  onUpdate,
  bookingFeeSummary,
  isBeingDragged = false,
}: PremiumActivityCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [barcodeModalOpen, setBarcodeModalOpen] = useState(false);
  const [selectedBarcode, setSelectedBarcode] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(activity.is_completed);

  useEffect(() => {
    setIsCompleted(activity.is_completed);
  }, [activity.is_completed]);

  const handleToggleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const newCompletedState = !isCompleted;
    setIsCompleted(newCompletedState);

    try {
      const { error } = await supabase
        .from('activities')
        .update({ is_completed: newCompletedState })
        .eq('id', activity.id);

      if (error) {
        setIsCompleted(!newCompletedState);
        throw error;
      }
    } catch (error) {
      console.error('Error toggling completion:', error);
    }
  };

  const getCompletionBorderColor = () => {
    if (isCompleted) return 'border-green-500';
    if (!activity.activity_name || !activity.location) return 'border-red-500';
    return 'border-orange-500';
  };

  const getPrimaryImage = () => {
    if (activity.images && Array.isArray(activity.images) && activity.images.length > 0) {
      const imageFiles = activity.images.filter((img: any) => {
        const ext = img.file_name?.toLowerCase().split('.').pop();
        return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '');
      });
      return imageFiles[0]?.file_url || null;
    }
    return null;
  };

  const primaryImage = getPrimaryImage();
  const hasImage = !!primaryImage;

  const getAttachments = () => {
    if (!activity.images || !Array.isArray(activity.images)) return { tickets: [], pdfs: [] };

    const tickets: Array<{ file_url: string; file_name?: string }> = [];
    const pdfs: Array<{ file_url: string; file_name?: string }> = [];

    activity.images.forEach((img: any) => {
      const ext = img.file_name?.toLowerCase().split('.').pop();
      if (ext === 'pdf') {
        pdfs.push(img);
      } else if (!['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
        tickets.push(img);
      }
    });

    return { tickets, pdfs };
  };

  const attachments = getAttachments();
  const hasTickets = attachments.tickets.length > 0;
  const hasPdfs = attachments.pdfs.length > 0;

  const handleTicketClick = (ticketUrl: string) => {
    setSelectedBarcode(ticketUrl);
    setBarcodeModalOpen(true);
  };

  const renderFloatingButtons = () => {
    if (!hasTickets && !hasPdfs) return null;

    return (
      <div className="absolute bottom-3 right-3 flex items-center gap-2 z-20">
        {hasTickets && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleTicketClick(attachments.tickets[0].file_url);
            }}
            className={`p-2 rounded-lg transition-all duration-200 ${
              hasImage
                ? 'bg-white/20 hover:bg-white/30 text-white backdrop-blur-md'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }`}
            title="View Ticket/Barcode"
          >
            <Ticket className="w-4 h-4" />
          </button>
        )}
        {hasPdfs && (
          <a
            href={attachments.pdfs[0].file_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className={`p-2 rounded-lg transition-all duration-200 ${
              hasImage
                ? 'bg-white/20 hover:bg-white/30 text-white backdrop-blur-md'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }`}
            title="View PDF"
          >
            <Paperclip className="w-4 h-4" />
          </a>
        )}
      </div>
    );
  };

  if (!hasImage) {
    return (
      <>
        <div
          draggable={isDraggable}
          onDragStart={onDragStart}
          onClick={onEdit ? () => onEdit() : undefined}
          className={`premium-activity-card group relative flex items-stretch bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border-l-4 ${getCompletionBorderColor()} ${
            isBeingDragged ? 'opacity-50' : 'opacity-100'
          } ${isDraggable ? 'cursor-move' : onEdit ? 'cursor-pointer' : ''}`}
        >
        {isDraggable && (
          <div className="flex items-center px-3 bg-gray-50/50 cursor-grab active:cursor-grabbing">
            <GripVertical className="w-5 h-5 text-gray-400" />
          </div>
        )}

        <div className="flex-1 p-4 flex flex-col justify-between min-w-0 min-h-[140px]">
          <div>
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 text-sm text-gray-600">
                  <Clock className="w-4 h-4 flex-shrink-0" />
                  <span className="font-medium">{activity.activity_time}</span>
                  {activity.duration_minutes && (
                    <span className="text-gray-500">({activity.duration_minutes} min)</span>
                  )}
                </div>
                <h3 className="text-xl font-bold text-gray-900 premium-card-title mb-1">
                  {activity.activity_name}
                </h3>
                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <p className="line-clamp-1">{activity.location}</p>
                </div>
              </div>

              {onEdit && onDelete && (
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={handleToggleComplete}
                    className={`p-2 rounded-lg transition-colors ${
                      isCompleted
                        ? 'text-green-600 bg-green-50 hover:bg-green-100'
                        : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                    }`}
                    title={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  {onDuplicate && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicate();
                      }}
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Duplicate activity"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit();
                    }}
                    className="p-2 text-gray-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete();
                    }}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <span
                className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                  activity.booking_status === 'confirmed'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                <div className="flex items-center gap-1">
                  {activity.booking_status === 'confirmed' ? (
                    <CheckCircle className="w-3 h-3" />
                  ) : (
                    <AlertCircle className="w-3 h-3" />
                  )}
                  <span className="capitalize">{activity.booking_status}</span>
                </div>
              </span>

              <span
                className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                  activity.payment_status === 'prepaid'
                    ? 'bg-green-100 text-green-700'
                    : activity.payment_status === 'n/a'
                    ? 'bg-gray-100 text-gray-700'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                <div className="flex items-center gap-1">
                  {activity.payment_status === 'prepaid' ? (
                    <Wallet className="w-3 h-3" />
                  ) : activity.payment_status === 'pay_onsite' ? (
                    <CreditCard className="w-3 h-3" />
                  ) : activity.payment_status === 'n/a' ? (
                    <MinusCircle className="w-3 h-3" />
                  ) : (
                    <Clock className="w-3 h-3" />
                  )}
                  <span className="capitalize">{activity.payment_status?.replace('_', ' ') ?? 'pending'}</span>
                </div>
              </span>

              {bookingFeeSummary && bookingFeeSummary.totalAmount > 0 && (
                <div
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                    bookingFeeSummary.hasUnpaidFees
                      ? 'bg-red-100 text-red-700'
                      : 'bg-green-100 text-green-700'
                  }`}
                >
                  <DollarSign className="w-3 h-3" />
                  <span>
                    {bookingFeeSummary.totalAmount.toFixed(2)} {bookingFeeSummary.currency}
                  </span>
                </div>
              )}
            </div>
          </div>

          {activity.guide_notes && (
            <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-900 leading-relaxed line-clamp-2">
                <span className="font-semibold">Guide Notes:</span> {activity.guide_notes}
              </p>
            </div>
          )}
        </div>

        {renderFloatingButtons()}
      </div>

      <BarcodeModal
        isOpen={barcodeModalOpen}
        onClose={() => setBarcodeModalOpen(false)}
        imageUrl={selectedBarcode || ''}
        title={activity.activity_name}
      />
    </>
    );
  }

  return (
    <>
      <BarcodeModal
        isOpen={barcodeModalOpen}
        onClose={() => setBarcodeModalOpen(false)}
        imageUrl={selectedBarcode || ''}
        title={activity.activity_name}
      />
    <div
      draggable={isDraggable}
      onDragStart={onDragStart}
      onClick={onEdit ? () => onEdit() : undefined}
      className={`premium-activity-card group relative flex items-stretch rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border-l-4 ${getCompletionBorderColor()} ${
        isBeingDragged ? 'opacity-50' : 'opacity-100'
      } ${isDraggable ? 'cursor-move' : onEdit ? 'cursor-pointer' : ''}`}
      style={{ minHeight: '140px' }}
    >
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
        style={{
          backgroundImage: `url(${primaryImage})`,
        }}
      >
        <img
          src={primaryImage}
          alt=""
          onLoad={() => setImageLoaded(true)}
          className="hidden"
        />
      </div>

      <div className="absolute inset-0 bg-gradient-to-r from-gray-900/85 via-gray-900/70 to-gray-900/60" />

      {isDraggable && (
        <div className="relative z-10 flex items-center px-3 bg-black/30 cursor-grab active:cursor-grabbing backdrop-blur-sm">
          <GripVertical className="w-5 h-5 text-white/70" />
        </div>
      )}

      <div className="relative z-10 flex-1 p-4 flex flex-col justify-between min-w-0">
        <div>
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 text-sm text-white/90">
                <Clock className="w-4 h-4 flex-shrink-0 drop-shadow-lg" />
                <span className="font-medium drop-shadow-lg">{activity.activity_time}</span>
                {activity.duration_minutes && (
                  <span className="text-white/70 drop-shadow-lg">({activity.duration_minutes} min)</span>
                )}
              </div>
              <h3 className="text-xl font-bold text-white premium-card-title mb-1 drop-shadow-lg" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
                {activity.activity_name}
              </h3>
              <div className="flex items-center gap-1.5 text-sm text-white/90">
                <MapPin className="w-4 h-4 flex-shrink-0 drop-shadow-lg" />
                <p className="line-clamp-1 drop-shadow-lg">{activity.location}</p>
              </div>
            </div>

            {onEdit && onDelete && (
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={handleToggleComplete}
                  className={`p-2 rounded-lg transition-colors backdrop-blur-sm ${
                    isCompleted
                      ? 'text-white bg-green-500/90 hover:bg-green-500'
                      : 'text-white/60 hover:text-white hover:bg-white/20'
                  }`}
                  title={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
                >
                  <Check className="w-4 h-4 drop-shadow-lg" />
                </button>
                {onDuplicate && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicate();
                    }}
                    className="p-2 text-white/80 hover:text-white hover:bg-blue-500/30 rounded-lg transition-colors backdrop-blur-sm"
                    title="Duplicate activity"
                  >
                    <Copy className="w-4 h-4 drop-shadow-lg" />
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors backdrop-blur-sm"
                >
                  <Edit className="w-4 h-4 drop-shadow-lg" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="p-2 text-white/80 hover:text-red-300 hover:bg-red-500/30 rounded-lg transition-colors backdrop-blur-sm"
                >
                  <Trash2 className="w-4 h-4 drop-shadow-lg" />
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <span
              className={`px-2.5 py-1 text-xs font-semibold rounded-full backdrop-blur-sm ${
                activity.booking_status === 'confirmed'
                  ? 'bg-green-500/90 text-white'
                  : 'bg-amber-500/90 text-white'
              }`}
            >
              <div className="flex items-center gap-1">
                {activity.booking_status === 'confirmed' ? (
                  <CheckCircle className="w-3 h-3" />
                ) : (
                  <AlertCircle className="w-3 h-3" />
                )}
                <span className="capitalize">{activity.booking_status}</span>
              </div>
            </span>

            <span
              className={`px-2.5 py-1 text-xs font-semibold rounded-full backdrop-blur-sm ${
                activity.payment_status === 'prepaid'
                  ? 'bg-green-500/90 text-white'
                  : activity.payment_status === 'n/a'
                  ? 'bg-gray-700/90 text-white'
                  : 'bg-amber-500/90 text-white'
              }`}
            >
              <div className="flex items-center gap-1">
                {activity.payment_status === 'prepaid' ? (
                  <Wallet className="w-3 h-3" />
                ) : activity.payment_status === 'pay_onsite' ? (
                  <CreditCard className="w-3 h-3" />
                ) : activity.payment_status === 'n/a' ? (
                  <MinusCircle className="w-3 h-3" />
                ) : (
                  <Clock className="w-3 h-3" />
                )}
                <span className="capitalize">{activity.payment_status?.replace('_', ' ') ?? 'pending'}</span>
              </div>
            </span>

            {bookingFeeSummary && bookingFeeSummary.totalAmount > 0 && (
              <div
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-sm ${
                  bookingFeeSummary.hasUnpaidFees
                    ? 'bg-red-500/90 text-white'
                    : 'bg-green-500/90 text-white'
                }`}
              >
                <DollarSign className="w-3 h-3" />
                <span>
                  {bookingFeeSummary.totalAmount.toFixed(2)} {bookingFeeSummary.currency}
                </span>
              </div>
            )}
          </div>
        </div>

        {activity.guide_notes && (
          <div className="mt-3 p-2.5 bg-amber-500/20 border border-amber-400/30 rounded-lg backdrop-blur-sm">
            <p className="text-xs text-white leading-relaxed line-clamp-2 drop-shadow-lg">
              <span className="font-semibold">Guide Notes:</span> {activity.guide_notes}
            </p>
          </div>
        )}

        {renderFloatingButtons()}
      </div>
    </div>
    </>
  );
}
