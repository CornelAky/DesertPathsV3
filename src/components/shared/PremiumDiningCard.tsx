import { useState, useEffect } from 'react';
import {
  Clock,
  MapPin,
  Edit,
  Trash2,
  GripVertical,
  CheckCircle,
  AlertCircle,
  XCircle,
  Ticket,
  Paperclip,
  Wallet,
  CreditCard,
  MinusCircle,
  User,
  Check,
} from 'lucide-react';
import type { Dining } from '../../lib/database.types';
import { BarcodeModal } from './BarcodeModal';
import { supabase } from '../../lib/supabase';

interface PremiumDiningCardProps {
  dining: Dining;
  isDraggable?: boolean;
  onDragStart?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onUpdate?: () => void;
  isBeingDragged?: boolean;
}

export default function PremiumDiningCard({
  dining,
  isDraggable = false,
  onDragStart,
  onEdit,
  onDelete,
  onUpdate,
  isBeingDragged = false,
}: PremiumDiningCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [barcodeModalOpen, setBarcodeModalOpen] = useState(false);
  const [selectedBarcode, setSelectedBarcode] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(dining.is_completed);

  useEffect(() => {
    setIsCompleted(dining.is_completed);
  }, [dining.is_completed]);

  const handleToggleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const newCompletedState = !isCompleted;
    setIsCompleted(newCompletedState);

    try {
      const { error } = await supabase
        .from('dining')
        .update({ is_completed: newCompletedState })
        .eq('id', dining.id);

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
    if (!dining.restaurant_name || !dining.meal_type) return 'border-red-500';
    return 'border-orange-500';
  };

  const getPrimaryImage = () => {
    if (dining.images && Array.isArray(dining.images) && dining.images.length > 0) {
      const imageFiles = dining.images.filter((img: any) => {
        const ext = img.file_name?.toLowerCase().split('.').pop();
        return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '');
      });
      return imageFiles[0]?.file_url || null;
    }
    return null;
  };

  const primaryImage = getPrimaryImage();
  const hasImage = !!primaryImage;

  const getStatusColor = () => {
    switch (dining.confirmation_status) {
      case 'confirmed':
        return {
          bg: 'bg-green-100',
          text: 'text-green-700',
          bgImage: 'bg-green-500/90',
          textImage: 'text-white',
          icon: CheckCircle,
        };
      case 'pending':
        return {
          bg: 'bg-amber-100',
          text: 'text-amber-700',
          bgImage: 'bg-amber-500/90',
          textImage: 'text-white',
          icon: AlertCircle,
        };
      case 'n/a':
        return {
          bg: 'bg-blue-100',
          text: 'text-blue-700',
          bgImage: 'bg-blue-500/90',
          textImage: 'text-white',
          icon: XCircle,
        };
      default:
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-700',
          bgImage: 'bg-gray-700/90',
          textImage: 'text-white',
          icon: XCircle,
        };
    }
  };

  const statusStyle = getStatusColor();
  const StatusIcon = statusStyle.icon;

  const getPaidByBadge = () => {
    if (!dining.paid_by) return null;

    switch (dining.paid_by) {
      case 'client':
        return { text: 'Paid by Client', bg: 'bg-purple-100', textColor: 'text-purple-700', bgImage: 'bg-purple-500/90', icon: User };
      case 'desert_paths':
        return { text: 'Paid by Desert Paths', bg: 'bg-teal-100', textColor: 'text-teal-700', bgImage: 'bg-teal-500/90', icon: Wallet };
      default:
        return null;
    }
  };

  const getPaymentStatusBadge = () => {
    if (!dining.payment_status || dining.payment_status === 'n_a') return null;

    switch (dining.payment_status) {
      case 'pre_paid':
        return { text: 'Pre-Paid', bg: 'bg-green-100', textColor: 'text-green-700', bgImage: 'bg-green-500/90', icon: CheckCircle };
      case 'paid_on_site':
        return { text: 'Pay On-Site', bg: 'bg-blue-100', textColor: 'text-blue-700', bgImage: 'bg-blue-500/90', icon: CreditCard };
      case 'pending':
        return { text: 'Payment Pending', bg: 'bg-amber-100', textColor: 'text-amber-700', bgImage: 'bg-amber-500/90', icon: Clock };
      default:
        return null;
    }
  };

  const paidByBadge = getPaidByBadge();
  const paymentStatusBadge = getPaymentStatusBadge();
  const PaidByIcon = paidByBadge?.icon;
  const PaymentStatusIcon = paymentStatusBadge?.icon;

  const getAttachments = () => {
    if (!dining.images || !Array.isArray(dining.images)) return { tickets: [], pdfs: [] };

    const tickets: Array<{ file_url: string; file_name?: string }> = [];
    const pdfs: Array<{ file_url: string; file_name?: string }> = [];

    dining.images.forEach((img: any) => {
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
          className={`premium-dining-card group relative flex items-stretch bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border-l-4 ${getCompletionBorderColor()} ${
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
                  <span className="font-medium">{dining.reservation_time}</span>
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-full capitalize">
                    {dining.meal_type}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 premium-card-title mb-1">
                  {dining.restaurant_name}
                </h3>
                <div className="flex items-center gap-1.5 text-sm text-gray-600 mb-1">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <p className="line-clamp-1">
                    {dining.cuisine_type && `${dining.cuisine_type} • `}
                    {dining.location_address}
                  </p>
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
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit();
                    }}
                    className="p-2 text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
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
                className={`px-2.5 py-1 text-xs font-semibold rounded-full ${statusStyle.bg} ${statusStyle.text}`}
              >
                <div className="flex items-center gap-1">
                  <StatusIcon className="w-3 h-3" />
                  <span className="capitalize">{dining.confirmation_status}</span>
                </div>
              </span>

              {paidByBadge && PaidByIcon && (
                <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${paidByBadge.bg} ${paidByBadge.textColor}`}>
                  <div className="flex items-center gap-1">
                    <PaidByIcon className="w-3 h-3" />
                    <span>{paidByBadge.text}</span>
                  </div>
                </span>
              )}

              {paymentStatusBadge && PaymentStatusIcon && (
                <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${paymentStatusBadge.bg} ${paymentStatusBadge.textColor}`}>
                  <div className="flex items-center gap-1">
                    <PaymentStatusIcon className="w-3 h-3" />
                    <span>{paymentStatusBadge.text}</span>
                  </div>
                </span>
              )}

              <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700 capitalize">
                {dining.location_type}
              </span>
            </div>
          </div>

          {dining.dietary_restrictions && (
            <div className="mt-3 p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-900 leading-relaxed line-clamp-2">
                <span className="font-semibold">Dietary Restrictions:</span> {dining.dietary_restrictions}
              </p>
            </div>
          )}

          {dining.guide_notes && (
            <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-900 leading-relaxed line-clamp-2">
                <span className="font-semibold">Guide Notes:</span> {dining.guide_notes}
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
        title={dining.restaurant_name}
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
        title={dining.restaurant_name}
      />
    <div
      draggable={isDraggable}
      onDragStart={onDragStart}
      onClick={onEdit ? () => onEdit() : undefined}
      className={`premium-dining-card group relative flex items-stretch rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border-l-4 ${getCompletionBorderColor()} ${
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
                <span className="font-medium drop-shadow-lg">{dining.reservation_time}</span>
                <span className="px-2 py-0.5 bg-white/20 text-white text-xs font-medium rounded-full capitalize backdrop-blur-sm">
                  {dining.meal_type}
                </span>
              </div>
              <h3 className="text-xl font-bold text-white premium-card-title mb-1 drop-shadow-lg" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
                {dining.restaurant_name}
              </h3>
              <div className="flex items-center gap-1.5 text-sm text-white/90 mb-1">
                <MapPin className="w-4 h-4 flex-shrink-0 drop-shadow-lg" />
                <p className="line-clamp-1 drop-shadow-lg">
                  {dining.cuisine_type && `${dining.cuisine_type} • `}
                  {dining.location_address}
                </p>
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
              className={`px-2.5 py-1 text-xs font-semibold rounded-full backdrop-blur-sm ${statusStyle.bgImage} ${statusStyle.textImage}`}
            >
              <div className="flex items-center gap-1">
                <StatusIcon className="w-3 h-3" />
                <span className="capitalize">{dining.confirmation_status}</span>
              </div>
            </span>

            {paidByBadge && PaidByIcon && (
              <span className={`px-2.5 py-1 text-xs font-semibold rounded-full text-white backdrop-blur-sm ${paidByBadge.bgImage}`}>
                <div className="flex items-center gap-1">
                  <PaidByIcon className="w-3 h-3" />
                  <span>{paidByBadge.text}</span>
                </div>
              </span>
            )}

            {paymentStatusBadge && PaymentStatusIcon && (
              <span className={`px-2.5 py-1 text-xs font-semibold rounded-full text-white backdrop-blur-sm ${paymentStatusBadge.bgImage}`}>
                <div className="flex items-center gap-1">
                  <PaymentStatusIcon className="w-3 h-3" />
                  <span>{paymentStatusBadge.text}</span>
                </div>
              </span>
            )}

            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-700/90 text-white capitalize backdrop-blur-sm">
              {dining.location_type}
            </span>
          </div>
        </div>

        {dining.dietary_restrictions && (
          <div className="mt-3 p-2.5 bg-blue-500/20 border border-blue-400/30 rounded-lg backdrop-blur-sm">
            <p className="text-xs text-white leading-relaxed line-clamp-2 drop-shadow-lg">
              <span className="font-semibold">Dietary Restrictions:</span> {dining.dietary_restrictions}
            </p>
          </div>
        )}

        {dining.guide_notes && (
          <div className="mt-3 p-2.5 bg-amber-500/20 border border-amber-400/30 rounded-lg backdrop-blur-sm">
            <p className="text-xs text-white leading-relaxed line-clamp-2 drop-shadow-lg">
              <span className="font-semibold">Guide Notes:</span> {dining.guide_notes}
            </p>
          </div>
        )}

        {renderFloatingButtons()}
      </div>
    </div>
    </>
  );
}
