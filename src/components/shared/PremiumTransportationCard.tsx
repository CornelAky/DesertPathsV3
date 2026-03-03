import { useState, useEffect } from 'react';
import {
  Clock,
  MapPin,
  Edit,
  Trash2,
  GripVertical,
  ExternalLink,
  FileText,
  Check,
} from 'lucide-react';
import type { Transportation } from '../../lib/database.types';
import { supabase } from '../../lib/supabase';

interface PremiumTransportationCardProps {
  transportation: Transportation;
  isDraggable?: boolean;
  onDragStart?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onUpdate?: () => void;
  isBeingDragged?: boolean;
}

export default function PremiumTransportationCard({
  transportation,
  isDraggable = false,
  onDragStart,
  onEdit,
  onDelete,
  onUpdate,
  isBeingDragged = false,
}: PremiumTransportationCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isCompleted, setIsCompleted] = useState(transportation.is_completed);

  useEffect(() => {
    setIsCompleted(transportation.is_completed);
  }, [transportation.is_completed]);

  const handleToggleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const newCompletedState = !isCompleted;
    setIsCompleted(newCompletedState);

    try {
      const { error } = await supabase
        .from('transportation')
        .update({ is_completed: newCompletedState })
        .eq('id', transportation.id);

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
    if (!transportation.car_type || !transportation.pickup_location) return 'border-red-500';
    return 'border-orange-500';
  };

  const getPrimaryImage = () => {
    if (transportation.images && Array.isArray(transportation.images) && transportation.images.length > 0) {
      const imageFiles = transportation.images.filter((img: any) => {
        const ext = img.file_name?.toLowerCase().split('.').pop();
        return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '');
      });
      return imageFiles[0]?.file_url || null;
    }
    return null;
  };

  const primaryImage = getPrimaryImage();
  const hasImage = !!primaryImage;

  if (!hasImage) {
    return (
      <div
        draggable={isDraggable}
        onDragStart={onDragStart}
        onClick={onEdit ? () => onEdit() : undefined}
        className={`group relative flex items-stretch bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border-l-4 ${getCompletionBorderColor()} ${
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
                <h3 className="text-xl font-bold text-gray-900 mb-1">
                  {transportation.car_type || 'Vehicle Not Specified'}
                </h3>

                {transportation.contact_details && (
                  <div className="mb-2">
                    <p className="text-xs text-gray-600 mb-1">Contact Details</p>
                    <p className="text-sm text-gray-900 whitespace-pre-wrap line-clamp-2">
                      {transportation.contact_details}
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap gap-3 text-sm">
                  {transportation.pickup_time && (
                    <div className="flex items-center gap-1 text-gray-600">
                      <Clock className="w-4 h-4 flex-shrink-0" />
                      <span>{transportation.pickup_time}</span>
                    </div>
                  )}
                  {transportation.pickup_location && (
                    <div className="flex items-center gap-1 text-gray-600">
                      <MapPin className="w-4 h-4 flex-shrink-0" />
                      <span className="line-clamp-1">{transportation.pickup_location}</span>
                    </div>
                  )}
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
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      draggable={isDraggable}
      onDragStart={onDragStart}
      onClick={onEdit ? () => onEdit() : undefined}
      className={`group relative flex items-stretch rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border-l-4 ${getCompletionBorderColor()} ${
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
              <h3 className="text-xl font-bold text-white mb-1 drop-shadow-lg" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
                {transportation.car_type || 'Vehicle Not Specified'}
              </h3>

              {transportation.contact_details && (
                <div className="mb-2">
                  <p className="text-xs text-white/80 mb-1 drop-shadow-lg">Contact Details</p>
                  <p className="text-sm text-white/95 whitespace-pre-wrap line-clamp-2 drop-shadow-lg">
                    {transportation.contact_details}
                  </p>
                </div>
              )}

              <div className="flex flex-wrap gap-3 text-sm text-white/90">
                {transportation.pickup_time && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4 flex-shrink-0 drop-shadow-lg" />
                    <span className="drop-shadow-lg">{transportation.pickup_time}</span>
                  </div>
                )}
                {transportation.pickup_location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4 flex-shrink-0 drop-shadow-lg" />
                    <span className="line-clamp-1 drop-shadow-lg">{transportation.pickup_location}</span>
                  </div>
                )}
              </div>
            </div>

            {onEdit && onDelete && (
              <div className="flex gap-1 flex-shrink-0">
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
        </div>
      </div>
    </div>
  );
}
