import { useState, useEffect } from 'react';
import {
  MapPin,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  Coffee,
  Utensils,
  Ticket,
  Paperclip,
  Wallet,
  AlertCircle,
  Check,
} from 'lucide-react';
import type { Accommodation } from '../../lib/database.types';
import { BarcodeModal } from './BarcodeModal';
import { supabase } from '../../lib/supabase';

interface PremiumAccommodationCardProps {
  accommodation: Accommodation;
  dayDate: string;
  onEdit?: () => void;
  onDelete?: () => void;
  onUpdate?: () => void;
}

export default function PremiumAccommodationCard({
  accommodation,
  dayDate,
  onEdit,
  onDelete,
  onUpdate,
}: PremiumAccommodationCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [barcodeModalOpen, setBarcodeModalOpen] = useState(false);
  const [selectedBarcode, setSelectedBarcode] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(accommodation.is_completed);

  useEffect(() => {
    setIsCompleted(accommodation.is_completed);
  }, [accommodation.is_completed]);

  const handleToggleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const newCompletedState = !isCompleted;
    setIsCompleted(newCompletedState);

    try {
      const { error } = await supabase
        .from('accommodations')
        .update({ is_completed: newCompletedState })
        .eq('id', accommodation.id);

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
    if (!accommodation.hotel_name || !accommodation.location_address) return 'border-red-500';
    return 'border-orange-500';
  };

  const getPrimaryImage = () => {
    if (accommodation.images && Array.isArray(accommodation.images) && accommodation.images.length > 0) {
      const imageFiles = accommodation.images.filter((img: any) => {
        const ext = img.file_name?.toLowerCase().split('.').pop();
        return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '');
      });
      return imageFiles[0]?.file_url || null;
    }
    return null;
  };

  const primaryImage = getPrimaryImage();
  const hasImage = !!primaryImage;

  const hasMeals =
    accommodation.breakfast_included || accommodation.lunch_included || accommodation.dinner_included;

  const getAttachments = () => {
    if (!accommodation.images || !Array.isArray(accommodation.images)) return { tickets: [], pdfs: [] };

    const tickets: Array<{ file_url: string; file_name?: string }> = [];
    const pdfs: Array<{ file_url: string; file_name?: string }> = [];

    accommodation.images.forEach((img: any) => {
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
          onClick={onEdit ? () => onEdit() : undefined}
          className={`premium-accommodation-card group relative flex items-stretch bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border-l-4 ${getCompletionBorderColor()} ${onEdit ? 'cursor-pointer' : ''}`}
        >
        <div className="flex-1 p-4 flex flex-col justify-between min-w-0 min-h-[140px]">
          <div>
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                    {new Date(dayDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 premium-card-title mb-1">
                  {accommodation.hotel_name}
                </h3>
                <div className="flex items-center gap-1.5 text-sm text-gray-600 mb-2">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <p className="line-clamp-1">{accommodation.location_address}</p>
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
                    className="p-2 text-gray-600 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
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

            <div className="flex flex-wrap gap-2 items-center mb-2">
              <span
                className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                  accommodation.booking_status === 'confirmed'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  <span className="capitalize">{accommodation.booking_status}</span>
                </div>
              </span>

              <span
                className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                  accommodation.payment_status === 'paid'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                <div className="flex items-center gap-1">
                  {accommodation.payment_status === 'paid' ? (
                    <Wallet className="w-3 h-3" />
                  ) : (
                    <AlertCircle className="w-3 h-3" />
                  )}
                  <span className="capitalize">{accommodation.payment_status}</span>
                </div>
              </span>

              <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700 capitalize">
                {accommodation.access_method?.replace('_', ' ') ?? 'n/a'}
              </span>

              {accommodation.accommodation_type && (
                <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-700">
                  {Array.isArray(accommodation.accommodation_type)
                    ? accommodation.accommodation_type.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(' & ')
                    : accommodation.accommodation_type.charAt(0).toUpperCase() + accommodation.accommodation_type.slice(1)}
                </span>
              )}

              {accommodation.check_in_time && (
                <div className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
                  <Clock className="w-3 h-3" />
                  <span>Check-in: {accommodation.check_in_time}</span>
                </div>
              )}

              {accommodation.check_out_time && (
                <div className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
                  <Clock className="w-3 h-3" />
                  <span>Check-out: {accommodation.check_out_time}</span>
                </div>
              )}
            </div>

            {hasMeals && (
              <div className="flex flex-wrap gap-1.5 items-center">
                {accommodation.breakfast_included && (
                  <span className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full flex items-center gap-1">
                    <Coffee className="w-3 h-3" />
                    Breakfast
                    {accommodation.breakfast_location &&
                      ` (${accommodation.breakfast_location === 'in_hotel' ? 'In Hotel' : 'External'})`}
                  </span>
                )}
                {accommodation.lunch_included && (
                  <span className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full flex items-center gap-1">
                    <Utensils className="w-3 h-3" />
                    Lunch
                    {accommodation.lunch_location &&
                      ` (${accommodation.lunch_location === 'in_hotel' ? 'In Hotel' : 'External'})`}
                  </span>
                )}
                {accommodation.dinner_included && (
                  <span className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full flex items-center gap-1">
                    <Utensils className="w-3 h-3" />
                    Dinner
                    {accommodation.dinner_location &&
                      ` (${accommodation.dinner_location === 'in_hotel' ? 'In Hotel' : 'External'})`}
                  </span>
                )}
              </div>
            )}
          </div>

          {accommodation.confirmation_number && (
            <div className="mt-3 p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-900 line-clamp-1">
                <span className="font-semibold">Confirmation:</span> {accommodation.confirmation_number}
              </p>
            </div>
          )}

          {accommodation.guide_notes && (
            <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-900 leading-relaxed line-clamp-2">
                <span className="font-semibold">Guide Notes:</span> {accommodation.guide_notes}
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
        title={accommodation.hotel_name}
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
        title={accommodation.hotel_name}
      />
    <div
      onClick={onEdit ? () => onEdit() : undefined}
      className={`premium-accommodation-card group relative flex items-stretch rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border-l-4 ${getCompletionBorderColor()} ${onEdit ? 'cursor-pointer' : ''}`}
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

      <div className="relative z-10 flex-1 p-4 flex flex-col justify-between min-w-0">
        <div>
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <div className="px-2.5 py-1 bg-white/20 text-white text-xs font-medium rounded-full backdrop-blur-sm">
                  {new Date(dayDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </div>
              </div>
              <h3 className="text-xl font-bold text-white premium-card-title mb-1 drop-shadow-lg" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
                {accommodation.hotel_name}
              </h3>
              <div className="flex items-center gap-1.5 text-sm text-white/90 mb-2">
                <MapPin className="w-4 h-4 flex-shrink-0 drop-shadow-lg" />
                <p className="line-clamp-1 drop-shadow-lg">{accommodation.location_address}</p>
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

          <div className="flex flex-wrap gap-2 items-center mb-2">
            <span
              className={`px-2.5 py-1 text-xs font-semibold rounded-full backdrop-blur-sm ${
                accommodation.booking_status === 'confirmed'
                  ? 'bg-green-500/90 text-white'
                  : 'bg-amber-500/90 text-white'
              }`}
            >
              <div className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                <span className="capitalize">{accommodation.booking_status}</span>
              </div>
            </span>

            <span
              className={`px-2.5 py-1 text-xs font-semibold rounded-full backdrop-blur-sm ${
                accommodation.payment_status === 'paid'
                  ? 'bg-green-500/90 text-white'
                  : 'bg-amber-500/90 text-white'
              }`}
            >
              <div className="flex items-center gap-1">
                {accommodation.payment_status === 'paid' ? (
                  <Wallet className="w-3 h-3" />
                ) : (
                  <AlertCircle className="w-3 h-3" />
                )}
                <span className="capitalize">{accommodation.payment_status}</span>
              </div>
            </span>

            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-700/90 text-white capitalize backdrop-blur-sm">
              {accommodation.access_method?.replace('_', ' ') ?? 'n/a'}
            </span>

            {accommodation.accommodation_type && (
              <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-purple-500/90 text-white backdrop-blur-sm">
                {Array.isArray(accommodation.accommodation_type)
                  ? accommodation.accommodation_type.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(' & ')
                  : accommodation.accommodation_type.charAt(0).toUpperCase() + accommodation.accommodation_type.slice(1)}
              </span>
            )}

            {accommodation.check_in_time && (
              <div className="flex items-center gap-1 px-2.5 py-1 bg-blue-500/70 text-white text-xs rounded-full backdrop-blur-sm">
                <Clock className="w-3 h-3" />
                <span>Check-in: {accommodation.check_in_time}</span>
              </div>
            )}

            {accommodation.check_out_time && (
              <div className="flex items-center gap-1 px-2.5 py-1 bg-blue-500/70 text-white text-xs rounded-full backdrop-blur-sm">
                <Clock className="w-3 h-3" />
                <span>Check-out: {accommodation.check_out_time}</span>
              </div>
            )}
          </div>

          {hasMeals && (
            <div className="flex flex-wrap gap-1.5 items-center">
              {accommodation.breakfast_included && (
                <span className="px-2 py-1 bg-green-500/80 text-white text-xs rounded-full flex items-center gap-1 backdrop-blur-sm">
                  <Coffee className="w-3 h-3" />
                  Breakfast
                  {accommodation.breakfast_location &&
                    ` (${accommodation.breakfast_location === 'in_hotel' ? 'In Hotel' : 'External'})`}
                </span>
              )}
              {accommodation.lunch_included && (
                <span className="px-2 py-1 bg-green-500/80 text-white text-xs rounded-full flex items-center gap-1 backdrop-blur-sm">
                  <Utensils className="w-3 h-3" />
                  Lunch
                  {accommodation.lunch_location &&
                    ` (${accommodation.lunch_location === 'in_hotel' ? 'In Hotel' : 'External'})`}
                </span>
              )}
              {accommodation.dinner_included && (
                <span className="px-2 py-1 bg-green-500/80 text-white text-xs rounded-full flex items-center gap-1 backdrop-blur-sm">
                  <Utensils className="w-3 h-3" />
                  Dinner
                  {accommodation.dinner_location &&
                    ` (${accommodation.dinner_location === 'in_hotel' ? 'In Hotel' : 'External'})`}
                </span>
              )}
            </div>
          )}
        </div>

        {accommodation.confirmation_number && (
          <div className="mt-3 p-2.5 bg-blue-500/20 border border-blue-400/30 rounded-lg backdrop-blur-sm">
            <p className="text-xs text-white line-clamp-1 drop-shadow-lg">
              <span className="font-semibold">Confirmation:</span> {accommodation.confirmation_number}
            </p>
          </div>
        )}

        {accommodation.guide_notes && (
          <div className="mt-3 p-2.5 bg-amber-500/20 border border-amber-400/30 rounded-lg backdrop-blur-sm">
            <p className="text-xs text-white leading-relaxed line-clamp-2 drop-shadow-lg">
              <span className="font-semibold">Guide Notes:</span> {accommodation.guide_notes}
            </p>
          </div>
        )}

        {renderFloatingButtons()}
      </div>
    </div>
    </>
  );
}
