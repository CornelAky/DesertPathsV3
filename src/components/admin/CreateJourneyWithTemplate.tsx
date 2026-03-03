import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Check, Calendar } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  contact_number: string;
  email?: string;
}

interface TripTemplate {
  id: string;
  name: string;
  description: string;
  template_type: string;
  duration_days: number;
  is_default: boolean;
}

interface CreateJourneyWithTemplateProps {
  customers: Customer[];
  onClose: () => void;
}

export function CreateJourneyWithTemplate({ customers, onClose }: CreateJourneyWithTemplateProps) {
  const [step, setStep] = useState<'customer' | 'template' | 'trip'>('customer');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerEmail, setNewCustomerEmail] = useState('');
  const [templates, setTemplates] = useState<TripTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<TripTemplate | null>(null);
  const [tripName, setTripName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (selectedTemplate && startDate) {
      const start = new Date(startDate);
      const end = new Date(start);
      end.setDate(start.getDate() + selectedTemplate.duration_days - 1);
      setEndDate(end.toISOString().split('T')[0]);
    }
  }, [selectedTemplate, startDate]);

  async function fetchTemplates() {
    try {
      const { data, error } = await supabase
        .from('journey_templates')
        .select('*')
        .order('is_default', { ascending: false })
        .order('name');

      if (error) throw error;
      setTemplates(data || []);

      const defaultTemplate = data?.find((t) => t.is_default);
      if (defaultTemplate) {
        setSelectedTemplate(defaultTemplate);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  }

  async function createTripFromTemplate(tripId: string, templateId: string, startDate: string) {
    const { data: template, error: templateError } = await supabase
      .from('journey_templates')
      .select(`
        *,
        template_days(
          *,
          template_activities(*),
          template_dining(*),
          template_accommodations(*)
        )
      `)
      .eq('id', templateId)
      .single();

    if (templateError) throw templateError;

    const start = new Date(startDate);

    for (const templateDay of template.template_days) {
      const dayDate = new Date(start);
      dayDate.setDate(start.getDate() + templateDay.day_number - 1);

      const { data: newDay, error: dayError } = await supabase
        .from('itinerary_days')
        .insert({
          journey_id: tripId,
          day_number: templateDay.day_number,
          date: dayDate.toISOString().split('T')[0],
          city_destination: templateDay.title || 'To be determined',
          notes: templateDay.description || '',
        })
        .select()
        .single();

      if (dayError) throw dayError;

      if (templateDay.template_activities && templateDay.template_activities.length > 0) {
        await supabase.from('activities').insert(
          templateDay.template_activities.map((act: any) => ({
            day_id: newDay.id,
            activity_name: act.activity_name,
            location: act.location,
            activity_time: act.start_time,
            guide_notes: act.notes,
            booking_status: act.booking_status,
            booking_fee: act.booking_fee,
            display_order: act.order_index,
          }))
        );
      }

      if (templateDay.template_dining && templateDay.template_dining.length > 0) {
        await supabase.from('dining').insert(
          templateDay.template_dining.map((meal: any) => ({
            day_id: newDay.id,
            restaurant_name: meal.restaurant_name,
            meal_type: meal.meal_type,
            location_address: meal.location,
            reservation_time: meal.reservation_time,
            guide_notes: meal.notes,
          }))
        );
      }

      if (templateDay.template_accommodations && templateDay.template_accommodations.length > 0) {
        await supabase.from('accommodations').insert(
          templateDay.template_accommodations.map((acc: any) => ({
            day_id: newDay.id,
            hotel_name: acc.hotel_name,
            location_address: acc.location_address,
            check_in_time: acc.check_in_time,
            check_out_time: acc.check_out_time,
            access_method: acc.access_method,
            confirmation_number: acc.confirmation_number,
            guide_notes: acc.notes,
          }))
        );
      }
    }
  }

  async function handleCreateTrip() {
    setLoading(true);
    setSuccessMessage(null);

    try {
      let customerId = selectedCustomer?.id;

      if (!customerId && newCustomerName && newCustomerPhone) {
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({
            name: newCustomerName,
            contact_number: newCustomerPhone,
            email: newCustomerEmail || null,
          })
          .select()
          .single();

        if (customerError) {
          console.error('Error creating customer:', customerError);
          alert(`Failed to create customer: ${customerError.message}`);
          return;
        }
        customerId = newCustomer.id;
      }

      if (!customerId) {
        alert('Please select or create a customer');
        return;
      }

      const start = new Date(startDate);
      const end = new Date(endDate);
      const durationDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      const { data: newTrip, error: tripError } = await supabase
        .from('journeys')
        .insert({
          customer_id: customerId,
          journey_name: tripName,
          start_date: startDate,
          end_date: endDate,
          duration_days: durationDays,
          status: 'planning',
        })
        .select()
        .single();

      if (tripError) {
        console.error('Error creating journey:', tripError);
        alert(`Failed to create journey: ${tripError.message}`);
        return;
      }

      if (selectedTemplate) {
        try {
          await createTripFromTemplate(newTrip.id, selectedTemplate.id, startDate);
        } catch (templateError: any) {
          console.error('Error applying template:', templateError);
          alert(`Journey created, but failed to apply template: ${templateError.message}`);
          setSuccessMessage('Journey created successfully (without template)!');
          setTimeout(() => onClose(), 2000);
          return;
        }
      }

      setSuccessMessage('Journey created successfully!');
      setTimeout(() => onClose(), 1500);
    } catch (error: any) {
      console.error('Error creating journey:', error);
      alert(`Failed to create journey: ${error?.message || 'Please try again.'}`);
    } finally {
      setLoading(false);
    }
  }

  const getTemplateTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      '3_days': '3 Days',
      '5_days': '5 Days',
      family: 'Family Journey',
      vip: 'VIP Journey',
      custom: 'Custom',
    };
    return labels[type] || type;
  };

  const stepTitles = {
    customer: 'Select or create a customer',
    template: 'Choose a template (optional)',
    trip: 'Enter journey details',
  };

  return (
    <div className="fixed inset-0 bg-brand-brown bg-opacity-20 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900">Create New Journey</h2>
          <p className="text-slate-600 mt-1">{stepTitles[step]}</p>

          <div className="flex items-center gap-1 sm:gap-2 mt-4">
            <div className={`flex items-center ${step === 'customer' ? 'text-brand-orange' : 'text-green-600'}`}>
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0 ${step === 'customer' ? 'bg-brand-orange text-white' : 'bg-green-600 text-white'}`}>
                {step === 'customer' ? '1' : <Check className="w-4 h-4 sm:w-5 sm:h-5" />}
              </div>
              <span className="ml-1 sm:ml-2 text-xs sm:text-sm font-medium hidden xs:inline">Customer</span>
            </div>
            <div className="flex-1 h-px bg-slate-300" />
            <div className={`flex items-center ${step === 'template' ? 'text-brand-orange' : step === 'trip' ? 'text-green-600' : 'text-slate-400'}`}>
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0 ${step === 'template' ? 'bg-brand-orange text-white' : step === 'trip' ? 'bg-green-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                {step === 'trip' ? <Check className="w-4 h-4 sm:w-5 sm:h-5" /> : '2'}
              </div>
              <span className="ml-1 sm:ml-2 text-xs sm:text-sm font-medium hidden xs:inline">Template</span>
            </div>
            <div className="flex-1 h-px bg-slate-300" />
            <div className={`flex items-center ${step === 'trip' ? 'text-brand-orange' : 'text-slate-400'}`}>
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0 ${step === 'trip' ? 'bg-brand-orange text-white' : 'bg-slate-200 text-slate-600'}`}>
                3
              </div>
              <span className="ml-1 sm:ml-2 text-xs sm:text-sm font-medium hidden xs:inline">Details</span>
            </div>
          </div>
        </div>

        <div className="p-6">
          {step === 'customer' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Existing Customer
                </label>
                <select
                  value={selectedCustomer?.id || ''}
                  onChange={(e) => {
                    const customer = customers.find((c) => c.id === e.target.value);
                    setSelectedCustomer(customer || null);
                  }}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-transparent"
                >
                  <option value="">Select a customer...</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} - {customer.contact_number}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-slate-500">Or create new customer</span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={newCustomerEmail}
                    onChange={(e) => setNewCustomerEmail(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-transparent"
                  />
                </div>
              </div>

              <button
                onClick={() => setStep('template')}
                disabled={!selectedCustomer && (!newCustomerName || !newCustomerPhone)}
                className="w-full bg-brand-orange hover:bg-brand-orange-hover text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue to Template Selection
              </button>
            </div>
          )}

          {step === 'template' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800">
                  Templates pre-fill ~70% of your journey data. You can skip this step to start from scratch.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => {
                    setSelectedTemplate(null);
                    setStep('trip');
                  }}
                  className="p-6 border-2 border-slate-300 hover:border-brand-orange rounded-xl text-left transition-colors"
                >
                  <div className="font-semibold text-slate-900 mb-2">Start from Scratch</div>
                  <p className="text-sm text-slate-600">Build your itinerary manually</p>
                </button>

                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplate(template)}
                    className={`p-6 border-2 rounded-xl text-left transition-colors ${
                      selectedTemplate?.id === template.id
                        ? 'border-brand-orange bg-orange-50'
                        : 'border-slate-300 hover:border-brand-orange'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-semibold text-slate-900">{template.name}</div>
                      {selectedTemplate?.id === template.id && (
                        <div className="w-6 h-6 bg-brand-orange rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 mb-3">{template.description || 'No description'}</p>
                    <div className="flex gap-2">
                      <span className="px-2 py-1 bg-brand-cyan bg-opacity-20 text-brand-brown text-xs font-medium rounded-full">
                        {getTemplateTypeLabel(template.template_type)}
                      </span>
                      <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-full">
                        {template.duration_days} {template.duration_days === 1 ? 'day' : 'days'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('customer')}
                  className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep('trip')}
                  className="flex-1 bg-brand-orange hover:bg-brand-orange-hover text-white font-semibold py-3 rounded-lg transition-colors text-sm sm:text-base"
                >
                  <span className="hidden sm:inline">Continue to Journey Details</span>
                  <span className="sm:hidden">Continue</span>
                </button>
              </div>
            </div>
          )}

          {step === 'trip' && (
            <div className="space-y-4">
              {successMessage && (
                <div className="bg-green-600 text-white rounded-lg p-4 mb-4 animate-pulse">
                  <div className="flex items-center gap-2">
                    <Check className="w-5 h-5" />
                    <p className="font-semibold">{successMessage}</p>
                  </div>
                </div>
              )}

              {selectedTemplate && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-green-700" />
                    <p className="text-sm text-green-800 font-medium">
                      Using template: {selectedTemplate.name}
                    </p>
                  </div>
                  <p className="text-xs text-green-700 mt-1">
                    This will pre-fill your itinerary with {selectedTemplate.duration_days} days of activities, accommodations, and dining
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Journey Name</label>
                <input
                  type="text"
                  value={tripName}
                  onChange={(e) => setTripName(e.target.value)}
                  placeholder="e.g., European Adventure 2024"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setStep('template')}
                  className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleCreateTrip}
                  disabled={loading || !tripName || !startDate || !endDate || !!successMessage}
                  className="flex-1 bg-brand-orange hover:bg-brand-orange-hover text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating...' : successMessage ? 'Success!' : 'Create Journey'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
