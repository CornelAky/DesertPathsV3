import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  ArrowLeft,
  Save,
  Download,
  Edit,
  Trash2,
  CheckCircle,
  FileText,
  Eye,
  Import,
  Plus,
  Upload,
} from 'lucide-react';
import OcrDocumentUpload from './OcrDocumentUpload';
import { safeParseInt } from '../../lib/numberValidation';

interface OcrItem {
  id: string;
  extraction_id: string;
  trip_id: string;
  day_number: number | null;
  date: string | null;
  time: string;
  activity: string;
  location: string;
  accommodation: string;
  meals: string;
  transportation: string;
  notes: string;
  is_reviewed: boolean;
  is_imported: boolean;
}

interface OcrDataReviewProps {
  journeyId: string;
  onBack: () => void;
}

export default function OcrDataReview({ journeyId, onBack }: OcrDataReviewProps) {
  const [items, setItems] = useState<OcrItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<OcrItem>>({});
  const [loading, setLoading] = useState(true);
  const [showRawText, setShowRawText] = useState(false);
  const [rawText, setRawText] = useState('');
  const [importing, setImporting] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  useEffect(() => {
    fetchOcrData();
  }, [journeyId]);

  const fetchOcrData = async () => {
    try {
      const { data, error } = await supabase
        .from('ocr_itinerary_items')
        .select('*')
        .eq('journey_id', journeyId)
        .order('day_number', { ascending: true })
        .order('time', { ascending: true });

      if (error) throw error;
      setItems(data || []);

      if (data && data.length > 0) {
        const { data: extractionData } = await supabase
          .from('ocr_extractions')
          .select('raw_text')
          .eq('id', data[0].extraction_id)
          .single();

        if (extractionData) {
          setRawText(extractionData.raw_text || '');
        }
      }
    } catch (error) {
      console.error('Error fetching OCR data:', error);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (item: OcrItem) => {
    setEditingId(item.id);
    setEditForm(item);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async () => {
    if (!editingId) return;

    try {
      const { error } = await supabase
        .from('ocr_itinerary_items')
        .update({
          ...editForm,
          is_reviewed: true,
        })
        .eq('id', editingId);

      if (error) throw error;

      await fetchOcrData();
      cancelEdit();
    } catch (error) {
      console.error('Error saving item:', error);
      alert('Failed to save changes');
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm('Delete this item?')) return;

    try {
      const { error } = await supabase.from('ocr_itinerary_items').delete().eq('id', id);

      if (error) throw error;
      await fetchOcrData();
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item');
    }
  };

  const addNewRow = () => {
    const newItem: Partial<OcrItem> = {
      journey_id: journeyId,
      day_number: items.length > 0 ? (items[items.length - 1].day_number || 0) + 1 : 1,
      date: null,
      time: '',
      activity: '',
      location: '',
      accommodation: '',
      meals: '',
      transportation: '',
      notes: '',
      is_reviewed: true,
      is_imported: false,
    };
    setEditForm(newItem);
    setEditingId('new');
  };

  const saveNewRow = async () => {
    try {
      const { error } = await supabase.from('ocr_itinerary_items').insert({
        ...editForm,
        extraction_id: items[0]?.extraction_id || null,
      });

      if (error) throw error;

      await fetchOcrData();
      cancelEdit();
    } catch (error) {
      console.error('Error adding item:', error);
      alert('Failed to add item');
    }
  };

  const importToItinerary = async () => {
    if (!confirm('Import all reviewed items to the itinerary? This will create new days and entries.')) {
      return;
    }

    setImporting(true);

    try {
      const reviewedItems = items.filter((item) => item.is_reviewed && !item.is_imported);

      for (const item of reviewedItems) {
        let dayId: string | null = null;

        if (item.day_number) {
          const { data: existingDay } = await supabase
            .from('itinerary_days')
            .select('id')
            .eq('journey_id', journeyId)
            .eq('day_number', item.day_number)
            .maybeSingle();

          if (existingDay) {
            dayId = existingDay.id;
          } else {
            const { data: tripData } = await supabase
              .from('journeys')
              .select('start_date')
              .eq('id', journeyId)
              .single();

            const startDate = new Date(tripData?.start_date || Date.now());
            const dayDate = new Date(startDate);
            dayDate.setDate(dayDate.getDate() + (item.day_number - 1));

            const { data: newDay, error: dayError } = await supabase
              .from('itinerary_days')
              .insert({
                journey_id: journeyId,
                day_number: item.day_number,
                date: dayDate.toISOString().split('T')[0],
                city_destination: item.location || 'TBD',
              })
              .select()
              .single();

            if (dayError) throw dayError;
            dayId = newDay.id;
          }
        }

        if (dayId) {
          if (item.accommodation) {
            await supabase.from('accommodations').insert({
              day_id: dayId,
              hotel_name: item.accommodation.split(',')[0].trim(),
              location_address: item.location || '',
              guide_notes: item.notes || '',
              booking_status: 'pending',
              payment_status: 'pending',
            });
          }

          if (item.activity) {
            await supabase.from('activities').insert({
              day_id: dayId,
              activity_name: item.activity,
              location: item.location || '',
              activity_time: item.time || '09:00',
              guide_notes: item.notes || '',
              booking_status: 'pending',
              payment_status: 'pending',
            });
          }

          if (item.meals) {
            const mealType = item.time
              ? item.time < '12:00'
                ? 'breakfast'
                : item.time < '16:00'
                ? 'lunch'
                : 'dinner'
              : 'dinner';

            await supabase.from('dining').insert({
              day_id: dayId,
              restaurant_name: item.meals.split('-')[0].trim(),
              location_address: item.location || '',
              reservation_time: item.time || '19:00',
              meal_type: mealType,
              guide_notes: item.notes || '',
            });
          }

          await supabase
            .from('ocr_itinerary_items')
            .update({ is_imported: true })
            .eq('id', item.id);
        }
      }

      await fetchOcrData();
      alert('Successfully imported itinerary data!');
    } catch (error) {
      console.error('Error importing data:', error);
      alert('Failed to import some items. Please check the data and try again.');
    } finally {
      setImporting(false);
    }
  };

  const exportToCsv = () => {
    const headers = [
      'Day',
      'Date',
      'Time',
      'Activity',
      'Location',
      'Accommodation',
      'Meals',
      'Transportation',
      'Notes',
    ];

    const rows = items.map((item) => [
      item.day_number || '',
      item.date || '',
      item.time || '',
      item.activity || '',
      item.location || '',
      item.accommodation || '',
      item.meals || '',
      item.transportation || '',
      item.notes || '',
    ]);

    const csvContent =
      headers.join(',') +
      '\n' +
      rows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `itinerary-data-${Date.now()}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-600">Loading OCR data...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-slate-200 p-4">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-700"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Dashboard</span>
          </button>
        </header>
        <div className="max-w-3xl mx-auto px-4 py-12">
          <div className="text-center mb-8">
            <FileText className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">No OCR Data Available</h2>
            <p className="text-slate-600 mb-2">Upload and process documents to extract itinerary data.</p>
          </div>

          <div className="bg-white border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors">
            <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Insert Files or Images</h3>
            <p className="text-sm text-slate-600 mb-4">
              Supported formats: PDF, Excel (.xls, .xlsx), Word (.doc, .docx), Images (.jpg, .png, .gif)
            </p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
            >
              Upload Documents
            </button>
            <p className="text-xs text-slate-500 mt-4">
              Drag & drop files or click to browse • Max 50MB per file
            </p>
          </div>

          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h4 className="font-semibold text-blue-900 mb-3 flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              How OCR Processing Works
            </h4>
            <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
              <li>Upload your itinerary documents in any supported format</li>
              <li>AI automatically extracts structured data from your files</li>
              <li>Review and edit the extracted information in an organized table</li>
              <li>Import approved data directly into your trip itinerary</li>
            </ol>
          </div>
        </div>

        {showUploadModal && (
          <OcrDocumentUpload
            journeyId={journeyId}
            onUploadComplete={() => {
              setShowUploadModal(false);
              fetchOcrData();
            }}
            onClose={() => setShowUploadModal(false)}
          />
        )}
      </div>
    );
  }

  const handleUploadComplete = () => {
    setShowUploadModal(false);
    fetchOcrData();
  };

  const reviewedCount = items.filter((i) => i.is_reviewed).length;
  const importedCount = items.filter((i) => i.is_imported).length;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={onBack}
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-700"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Dashboard</span>
            </button>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center space-x-2 px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg transition-colors text-sm"
              >
                <Upload className="w-4 h-4" />
                <span>Upload More</span>
              </button>
              <button
                onClick={() => setShowRawText(!showRawText)}
                className="flex items-center space-x-2 px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg transition-colors text-sm"
              >
                <Eye className="w-4 h-4" />
                <span>{showRawText ? 'Hide' : 'View'} Raw Text</span>
              </button>
              <button
                onClick={exportToCsv}
                className="flex items-center space-x-2 px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg transition-colors text-sm"
              >
                <Download className="w-4 h-4" />
                <span>Export CSV</span>
              </button>
              <button
                onClick={addNewRow}
                disabled={editingId !== null}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                <span>Add Row</span>
              </button>
              <button
                onClick={importToItinerary}
                disabled={importing || reviewedCount === 0 || reviewedCount === importedCount}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm disabled:opacity-50"
              >
                <Import className="w-4 h-4" />
                <span>
                  {importing ? 'Importing...' : 'Import to Itinerary'}
                </span>
              </button>
            </div>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-1">Review Extracted Data</h1>
            <p className="text-sm text-slate-600">
              {reviewedCount} of {items.length} items reviewed • {importedCount} imported
            </p>
          </div>
        </div>
      </header>

      {showRawText && rawText && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-3">Raw Extracted Text</h3>
            <pre className="text-sm text-slate-700 whitespace-pre-wrap font-mono bg-slate-50 p-4 rounded-lg max-h-96 overflow-y-auto">
              {rawText}
            </pre>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                    Day
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                    Activity
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                    Accommodation
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                    Meals
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                    Transportation
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                    Notes
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {editingId === 'new' && (
                  <tr className="bg-blue-50">
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={editForm.day_number || ''}
                        onChange={(e) =>
                          setEditForm({ ...editForm, day_number: safeParseInt(e.target.value, null) })
                        }
                        className="w-20 px-2 py-1 border border-slate-300 rounded text-sm"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="date"
                        value={editForm.date || ''}
                        onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                        className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="time"
                        value={editForm.time || ''}
                        onChange={(e) => setEditForm({ ...editForm, time: e.target.value })}
                        className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <textarea
                        value={editForm.activity || ''}
                        onChange={(e) => setEditForm({ ...editForm, activity: e.target.value })}
                        className="w-full px-2 py-1 border border-slate-300 rounded text-sm resize-none"
                        rows={2}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <textarea
                        value={editForm.location || ''}
                        onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                        className="w-full px-2 py-1 border border-slate-300 rounded text-sm resize-none"
                        rows={2}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={editForm.accommodation || ''}
                        onChange={(e) => setEditForm({ ...editForm, accommodation: e.target.value })}
                        className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={editForm.meals || ''}
                        onChange={(e) => setEditForm({ ...editForm, meals: e.target.value })}
                        className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={editForm.transportation || ''}
                        onChange={(e) => setEditForm({ ...editForm, transportation: e.target.value })}
                        className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <textarea
                        value={editForm.notes || ''}
                        onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                        className="w-full px-2 py-1 border border-slate-300 rounded text-sm resize-none"
                        rows={2}
                      />
                    </td>
                    <td className="px-4 py-3"></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={saveNewRow}
                          className="p-1 text-green-600 hover:bg-green-50 rounded"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="p-1 text-slate-600 hover:bg-slate-100 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )}

                {items.map((item) => (
                  <tr
                    key={item.id}
                    className={`${
                      item.is_imported
                        ? 'bg-green-50'
                        : item.is_reviewed
                        ? 'bg-blue-50'
                        : 'hover:bg-slate-50'
                    } ${editingId === item.id ? 'bg-amber-50' : ''}`}
                  >
                    {editingId === item.id ? (
                      <>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={editForm.day_number || ''}
                            onChange={(e) =>
                              setEditForm({ ...editForm, day_number: safeParseInt(e.target.value, null) })
                            }
                            className="w-20 px-2 py-1 border border-slate-300 rounded text-sm"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="date"
                            value={editForm.date || ''}
                            onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                            className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="time"
                            value={editForm.time || ''}
                            onChange={(e) => setEditForm({ ...editForm, time: e.target.value })}
                            className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <textarea
                            value={editForm.activity || ''}
                            onChange={(e) => setEditForm({ ...editForm, activity: e.target.value })}
                            className="w-full px-2 py-1 border border-slate-300 rounded text-sm resize-none"
                            rows={2}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <textarea
                            value={editForm.location || ''}
                            onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                            className="w-full px-2 py-1 border border-slate-300 rounded text-sm resize-none"
                            rows={2}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={editForm.accommodation || ''}
                            onChange={(e) => setEditForm({ ...editForm, accommodation: e.target.value })}
                            className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={editForm.meals || ''}
                            onChange={(e) => setEditForm({ ...editForm, meals: e.target.value })}
                            className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={editForm.transportation || ''}
                            onChange={(e) => setEditForm({ ...editForm, transportation: e.target.value })}
                            className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <textarea
                            value={editForm.notes || ''}
                            onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                            className="w-full px-2 py-1 border border-slate-300 rounded text-sm resize-none"
                            rows={2}
                          />
                        </td>
                        <td className="px-4 py-3"></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={saveEdit}
                              className="p-1 text-green-600 hover:bg-green-50 rounded"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="p-1 text-slate-600 hover:bg-slate-100 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 text-sm text-slate-900">{item.day_number || '-'}</td>
                        <td className="px-4 py-3 text-sm text-slate-900">{item.date || '-'}</td>
                        <td className="px-4 py-3 text-sm text-slate-900">{item.time || '-'}</td>
                        <td className="px-4 py-3 text-sm text-slate-900 max-w-xs">
                          {item.activity || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-900 max-w-xs">
                          {item.location || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-900">{item.accommodation || '-'}</td>
                        <td className="px-4 py-3 text-sm text-slate-900">{item.meals || '-'}</td>
                        <td className="px-4 py-3 text-sm text-slate-900">{item.transportation || '-'}</td>
                        <td className="px-4 py-3 text-sm text-slate-900 max-w-xs">{item.notes || '-'}</td>
                        <td className="px-4 py-3">
                          {item.is_imported ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Imported
                            </span>
                          ) : item.is_reviewed ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Reviewed
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => startEdit(item)}
                              disabled={editingId !== null || item.is_imported}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteItem(item.id)}
                              disabled={editingId !== null || item.is_imported}
                              className="p-1 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {showUploadModal && (
        <OcrDocumentUpload
          journeyId={journeyId}
          onUploadComplete={handleUploadComplete}
          onClose={() => setShowUploadModal(false)}
        />
      )}
    </div>
  );
}
