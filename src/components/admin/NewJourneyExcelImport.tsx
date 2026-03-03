import React, { useState } from 'react';
import { Upload, X, Download, AlertCircle, CheckCircle, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../../lib/supabase';
import { safeParseInt } from '../../lib/numberValidation';

interface ExcelRow {
  day?: number;
  date?: string;
  time?: string;
  activity?: string;
  location?: string;
  hotel?: string;
  restaurant?: string;
  meal_type?: string;
  access_method?: string;
  transportation?: string;
  notes?: string;
  booking_status?: string;
  payment_status?: string;
  duration_minutes?: number;
  [key: string]: any;
}

interface ParsedData {
  journeyName: string;
  customerName: string;
  startDate: string;
  endDate: string;
  rows: ExcelRow[];
}

interface NewJourneyExcelImportProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function NewJourneyExcelImport({ onClose, onSuccess }: NewJourneyExcelImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [journeyName, setJourneyName] = useState('');
  const [customerName, setCustomerName] = useState('');

  const downloadTemplate = () => {
    const templateData = [
      {
        'Day': 1,
        'Date': '2024-03-01',
        'Time': '09:00',
        'Activity': 'Airport Pickup',
        'Location': 'Phoenix Sky Harbor Airport',
        'Hotel': 'Desert Oasis Resort',
        'Restaurant': '',
        'Meal Type': '',
        'Access Method': 'Meet at Terminal 4 Arrivals',
        'Transportation': 'Private Van',
        'Notes': 'Flight arrives at 8:30 AM',
        'Booking Status': 'confirmed',
        'Payment Status': 'paid',
        'Duration (minutes)': '60'
      },
      {
        'Day': 1,
        'Date': '2024-03-01',
        'Time': '12:30',
        'Activity': 'Lunch',
        'Location': 'Downtown Scottsdale',
        'Hotel': '',
        'Restaurant': 'The Mission',
        'Meal Type': 'lunch',
        'Access Method': '',
        'Transportation': '',
        'Notes': 'Modern Latin cuisine',
        'Booking Status': 'confirmed',
        'Payment Status': 'pending',
        'Duration (minutes)': '90'
      },
      {
        'Day': 1,
        'Date': '2024-03-01',
        'Time': '15:00',
        'Activity': 'Desert Botanical Garden',
        'Location': '1201 N Galvin Pkwy, Phoenix',
        'Hotel': '',
        'Restaurant': '',
        'Meal Type': '',
        'Access Method': 'Tickets pre-purchased',
        'Transportation': '',
        'Notes': 'Wear comfortable walking shoes',
        'Booking Status': 'confirmed',
        'Payment Status': 'paid',
        'Duration (minutes)': '120'
      },
      {
        'Day': 2,
        'Date': '2024-03-02',
        'Time': '08:00',
        'Activity': 'Breakfast',
        'Location': 'Desert Oasis Resort',
        'Hotel': '',
        'Restaurant': 'Resort Restaurant',
        'Meal Type': 'breakfast',
        'Access Method': '',
        'Transportation': '',
        'Notes': 'Included with accommodation',
        'Booking Status': 'confirmed',
        'Payment Status': 'paid',
        'Duration (minutes)': '60'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Itinerary');

    ws['!cols'] = [
      { wch: 6 },
      { wch: 12 },
      { wch: 8 },
      { wch: 25 },
      { wch: 30 },
      { wch: 25 },
      { wch: 25 },
      { wch: 12 },
      { wch: 30 },
      { wch: 20 },
      { wch: 40 },
      { wch: 15 },
      { wch: 15 },
      { wch: 18 }
    ];

    XLSX.writeFile(wb, 'trip_import_template.xlsx');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.match(/\.(xlsx|xls)$/i)) {
        setError('Please upload an Excel file (.xlsx or .xls)');
        return;
      }
      setFile(selectedFile);
      setError(null);
      parseExcelFile(selectedFile);
    }
  };

  const parseExcelFile = async (file: File) => {
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { defval: '' }) as any[];

      if (jsonData.length === 0) {
        setError('Excel file is empty');
        return;
      }

      const normalizedRows: ExcelRow[] = jsonData.map(row => {
        const normalized: ExcelRow = {};

        Object.keys(row).forEach(key => {
          const lowerKey = key.toLowerCase().trim();

          if (lowerKey.includes('day')) normalized.day = safeParseInt(row[key], null) || undefined;
          else if (lowerKey.includes('date')) normalized.date = row[key];
          else if (lowerKey.includes('time') && !lowerKey.includes('duration')) normalized.time = row[key];
          else if (lowerKey.includes('activity') || lowerKey.includes('event')) normalized.activity = row[key];
          else if (lowerKey.includes('location') || lowerKey.includes('place')) normalized.location = row[key];
          else if (lowerKey.includes('hotel') || lowerKey.includes('accommodation')) normalized.hotel = row[key];
          else if (lowerKey.includes('restaurant') || lowerKey.includes('dining')) normalized.restaurant = row[key];
          else if (lowerKey.includes('meal')) normalized.meal_type = row[key]?.toLowerCase();
          else if (lowerKey.includes('access')) normalized.access_method = row[key];
          else if (lowerKey.includes('transport')) normalized.transportation = row[key];
          else if (lowerKey.includes('note')) normalized.notes = row[key];
          else if (lowerKey.includes('booking') && lowerKey.includes('status')) normalized.booking_status = row[key];
          else if (lowerKey.includes('payment') && lowerKey.includes('status')) normalized.payment_status = row[key];
          else if (lowerKey.includes('duration')) normalized.duration_minutes = safeParseInt(row[key], null) || undefined;
        });

        return normalized;
      });

      const dates = normalizedRows
        .map(r => r.date)
        .filter(d => d)
        .map(d => {
          if (typeof d === 'number') {
            const excelDate = new Date((d - 25569) * 86400 * 1000);
            return excelDate.toISOString().split('T')[0];
          }
          return d;
        });

      const startDate = dates.length > 0 ? dates[0] : '';
      const endDate = dates.length > 0 ? dates[dates.length - 1] : '';

      setParsedData({
        journeyName: '',
        customerName: '',
        startDate,
        endDate,
        rows: normalizedRows
      });

      setError(null);
    } catch (err) {
      console.error('Parse error:', err);
      setError('Failed to parse Excel file. Please check the format.');
    }
  };

  const validateData = (): string | null => {
    if (!journeyName.trim()) return 'Please enter a journey name';
    if (!customerName.trim()) return 'Please enter a customer name';
    if (!parsedData) return 'No data parsed';
    if (parsedData.rows.length === 0) return 'Excel file contains no data';

    return null;
  };

  const handleImport = async () => {
    const validationError = validateData();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!parsedData) return;

    setIsProcessing(true);
    setError(null);

    try {
      let customer;
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .ilike('name', customerName.trim())
        .maybeSingle();

      if (existingCustomer) {
        customer = existingCustomer;
      } else {
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({ name: customerName.trim() })
          .select()
          .single();

        if (customerError) throw customerError;
        customer = newCustomer;
      }

      const dates = parsedData.rows
        .map(r => r.date)
        .filter(d => d)
        .map(d => {
          if (typeof d === 'number') {
            const excelDate = new Date((d - 25569) * 86400 * 1000);
            return excelDate.toISOString().split('T')[0];
          }
          return d;
        });

      const startDate = dates.length > 0 ? dates[0] : null;
      const endDate = dates.length > 0 ? dates[dates.length - 1] : null;

      let durationDays = 1;
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        durationDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      }

      const { data: newJourney, error: journeyError } = await supabase
        .from('journeys')
        .insert({
          customer_id: customer.id,
          journey_name: journeyName.trim(),
          start_date: startDate,
          end_date: endDate,
          duration_days: durationDays,
          status: 'planning'
        })
        .select()
        .single();

      if (journeyError) throw journeyError;

      const dayGroups = new Map<number, ExcelRow[]>();
      parsedData.rows.forEach(row => {
        const day = row.day || 1;
        if (!dayGroups.has(day)) {
          dayGroups.set(day, []);
        }
        dayGroups.get(day)!.push(row);
      });

      const dayIds = new Map<number, string>();

      for (const [dayNumber, rows] of Array.from(dayGroups.entries()).sort((a, b) => a[0] - b[0])) {
        const firstRow = rows[0];
        let dayDate = firstRow.date;

        if (typeof dayDate === 'number') {
          const excelDate = new Date((dayDate - 25569) * 86400 * 1000);
          dayDate = excelDate.toISOString().split('T')[0];
        } else if (!dayDate) {
          dayDate = null;
        }

        const cityDestination = rows
          .map(r => r.location)
          .filter(l => l)
          .join(', ')
          .substring(0, 100) || 'Not specified';

        const { data: newDay, error: dayError } = await supabase
          .from('itinerary_days')
          .insert({
            journey_id: newJourney.id,
            day_number: dayNumber,
            date: dayDate,
            city_destination: cityDestination
          })
          .select()
          .single();

        if (dayError) throw dayError;
        dayIds.set(dayNumber, newDay.id);
      }

      let sortOrder = 0;
      for (const [dayNumber, rows] of Array.from(dayGroups.entries()).sort((a, b) => a[0] - b[0])) {
        const dayId = dayIds.get(dayNumber)!;

        for (const row of rows) {
          let dayDate = row.date;
          if (typeof dayDate === 'number') {
            const excelDate = new Date((dayDate - 25569) * 86400 * 1000);
            dayDate = excelDate.toISOString().split('T')[0];
          } else if (!dayDate) {
            dayDate = null;
          }

          let timeValue = row.time;
          if (typeof timeValue === 'number') {
            const hours = Math.floor(timeValue * 24);
            const minutes = Math.floor((timeValue * 24 - hours) * 60);
            timeValue = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
          } else if (timeValue && !timeValue.match(/^\d{2}:\d{2}/)) {
            timeValue = null;
          }

          let accommodationId = null;
          let diningId = null;
          let activityId = null;

          if (row.hotel) {
            const { data: newAccommodation, error: accomError } = await supabase
              .from('accommodations')
              .insert({
                day_id: dayId,
                hotel_name: row.hotel,
                location_address: row.location || '',
                check_in_time: timeValue,
                guide_notes: row.notes || '',
                access_method: row.access_method || '',
                booking_status: row.booking_status || 'pending',
                payment_status: row.payment_status || 'pending',
                display_order: sortOrder
              })
              .select('id')
              .single();

            if (!accomError && newAccommodation) {
              accommodationId = newAccommodation.id;
            } else if (accomError) {
              console.error('Accommodation error:', accomError);
            }
          }

          if (row.restaurant) {
            const mealType = row.meal_type || 'lunch';
            const validMealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
            const finalMealType = validMealTypes.includes(mealType) ? mealType : 'lunch';

            const { data: newDining, error: diningError } = await supabase
              .from('dining')
              .insert({
                day_id: dayId,
                meal_type: finalMealType,
                restaurant_name: row.restaurant,
                location_address: row.location || '',
                reservation_time: timeValue,
                guide_notes: row.notes || '',
                confirmation_status: row.booking_status || 'pending',
                payment_arrangement: row.payment_status || 'pending',
                display_order: sortOrder
              })
              .select('id')
              .single();

            if (!diningError && newDining) {
              diningId = newDining.id;
            } else if (diningError) {
              console.error('Dining error:', diningError);
            }
          }

          if (row.activity) {
            const { data: newActivity, error: activityError } = await supabase
              .from('activities')
              .insert({
                day_id: dayId,
                activity_name: row.activity,
                location: row.location || '',
                activity_time: timeValue,
                guide_notes: row.notes || '',
                access_method: row.access_method || '',
                booking_status: row.booking_status || 'pending',
                payment_status: row.payment_status || 'pending',
                duration_minutes: row.duration_minutes || null,
                display_order: sortOrder
              })
              .select('id')
              .single();

            if (!activityError && newActivity) {
              activityId = newActivity.id;
            } else if (activityError) {
              console.error('Activity error:', activityError);
            }
          }

          const { error: entryError } = await supabase
            .from('itinerary_entries')
            .insert({
              journey_id: newJourney.id,
              day_number: dayNumber,
              date: dayDate,
              time: timeValue,
              activity: row.activity || '',
              location: row.location || '',
              accommodation_id: accommodationId,
              dining_id: diningId,
              activity_id: activityId,
              access_method: row.access_method || '',
              transportation: row.transportation || '',
              notes: row.notes || '',
              sort_order: sortOrder++
            });

          if (entryError) throw entryError;
        }
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Import error:', err);
      setError(err instanceof Error ? err.message : 'Failed to import journey');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-brand-brown bg-opacity-20 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-lg shadow-xl max-w-3xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-auto animate-slide-up sm:animate-none">
        <div className="p-4 sm:p-6">
          <div className="flex justify-between items-center mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Import New Journey from Excel</h2>
            <button
              onClick={onClose}
              className="p-2 touch-target text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>

          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2 text-sm sm:text-base">How to use:</h3>
            <ol className="list-decimal list-inside text-xs sm:text-sm text-blue-800 space-y-1">
              <li>Download the Excel template below</li>
              <li>Fill in your journey details (each row = one itinerary item)</li>
              <li>Upload the completed file</li>
              <li>Review and confirm the import</li>
            </ol>
            <button
              onClick={downloadTemplate}
              className="mt-3 w-full sm:w-auto inline-flex items-center justify-center px-4 py-3 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm touch-target"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Excel Template
            </button>
          </div>

          {!file ? (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 sm:p-12 text-center touch-target min-h-[200px] flex flex-col items-center justify-center">
              <FileSpreadsheet className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-3 sm:mb-4" />
              <p className="text-base sm:text-lg font-medium text-gray-700 mb-2">
                Upload your Excel file
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Supported formats: .xlsx, .xls
              </p>
              <label className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-3 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer touch-target">
                <Upload className="w-4 h-4 mr-2" />
                Choose File
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
                <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                <div className="flex-1">
                  <p className="font-medium text-green-900">{file.name}</p>
                  <p className="text-sm text-green-700">
                    {parsedData?.rows.length || 0} rows parsed
                  </p>
                </div>
                <button
                  onClick={() => {
                    setFile(null);
                    setParsedData(null);
                  }}
                  className="text-green-700 hover:text-green-900"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Journey Name *
                  </label>
                  <input
                    type="text"
                    value={journeyName}
                    onChange={(e) => setJourneyName(e.target.value)}
                    placeholder="e.g., Arizona Desert Adventure 2024"
                    className="w-full px-3 py-3 sm:py-2 text-base sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g., John Smith"
                    className="w-full px-3 py-3 sm:py-2 text-base sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {parsedData && (
                <>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-2">Preview</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-600">Rows:</span>{' '}
                        <span className="font-medium">{parsedData.rows.length}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Days:</span>{' '}
                        <span className="font-medium">
                          {new Set(parsedData.rows.map(r => r.day)).size}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Start Date:</span>{' '}
                        <span className="font-medium">{parsedData.startDate || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">End Date:</span>{' '}
                        <span className="font-medium">{parsedData.endDate || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                  {parsedData.rows.some(r => !r.date) && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start">
                      <AlertCircle className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-blue-700">
                        Some rows are missing dates. The trip will be created with placeholder dates that you can edit later.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="mt-6 flex flex-col sm:flex-row justify-end gap-3">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-3 sm:py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors touch-target"
              disabled={isProcessing}
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={!parsedData || isProcessing || !journeyName || !customerName}
              className="flex-1 sm:flex-initial px-6 py-3 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center touch-target"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Create Journey
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
