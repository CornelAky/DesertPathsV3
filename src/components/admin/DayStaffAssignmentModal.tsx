import { useState, useEffect } from 'react';
import { X, UserPlus, Loader, Users, Truck, MapPin, FileText, Utensils, Activity, Shield, Backpack, UserCheck, Image as ImageIcon, Camera, BookOpen, DollarSign, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useStaffRoles, getRoleDisplay } from '../../hooks/useStaffRoles';

interface DayStaffAssignmentModalProps {
  journeyId: string;
  dayId: string;
  dayNumber: number;
  onClose: () => void;
  onUpdate: () => void;
}

interface JourneyStaff {
  id: string;
  name: string;
  role: string;
  role_custom: string | null;
  phone: string | null;
  email: string | null;
}

interface StaffAssignment {
  id: string;
  staff_id: string;
  payment_status: 'unpaid' | 'paid' | 'pending';
  payment_amount: number | null;
  payment_currency: string;
  payment_notes: string;
}

export function DayStaffAssignmentModal({ journeyId, dayId, dayNumber, onClose, onUpdate }: DayStaffAssignmentModalProps) {
  const [journeyStaff, setJourneyStaff] = useState<JourneyStaff[]>([]);
  const [assignments, setAssignments] = useState<Map<string, StaffAssignment>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [editingPayment, setEditingPayment] = useState<string | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    status: 'unpaid' as 'unpaid' | 'paid' | 'pending',
    notes: ''
  });

  const { roles: staffRoles, loading: rolesLoading } = useStaffRoles();

  useEffect(() => {
    loadJourneyStaff();
  }, [journeyId, dayId]);

  const loadJourneyStaff = async () => {
    try {
      setLoading(true);

      const { data: allStaff, error: staffError } = await supabase
        .from('journey_staff')
        .select('id, name, role, role_custom, phone, email')
        .eq('journey_id', journeyId);

      if (staffError) throw staffError;

      const { data: dayAssignments, error: assignError } = await supabase
        .from('journey_staff_day_assignments')
        .select('*')
        .eq('day_id', dayId)
        .is('activity_id', null);

      if (assignError) throw assignError;

      const assignmentMap = new Map<string, StaffAssignment>();
      (dayAssignments || []).forEach(assignment => {
        assignmentMap.set(assignment.staff_id, {
          id: assignment.id,
          staff_id: assignment.staff_id,
          payment_status: assignment.payment_status,
          payment_amount: assignment.payment_amount,
          payment_currency: assignment.payment_currency || 'USD',
          payment_notes: assignment.payment_notes || ''
        });
      });

      setJourneyStaff(allStaff || []);
      setAssignments(assignmentMap);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleStaffAssignment = async (staffId: string) => {
    setProcessing(true);
    setError(null);

    try {
      const currentAssignment = assignments.get(staffId);

      if (currentAssignment) {
        const { error: deleteError } = await supabase
          .from('journey_staff_day_assignments')
          .delete()
          .eq('id', currentAssignment.id);

        if (deleteError) throw deleteError;
      } else {
        const { error: insertError } = await supabase
          .from('journey_staff_day_assignments')
          .insert({
            staff_id: staffId,
            day_id: dayId,
            assignment_type: 'full_day',
            payment_status: 'unpaid',
            payment_currency: 'USD'
          });

        if (insertError) throw insertError;
      }

      await loadJourneyStaff();
      onUpdate();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const openPaymentEditor = (staffId: string) => {
    const assignment = assignments.get(staffId);
    if (assignment) {
      setPaymentForm({
        amount: assignment.payment_amount?.toString() || '',
        status: assignment.payment_status,
        notes: assignment.payment_notes
      });
      setEditingPayment(staffId);
    }
  };

  const savePaymentInfo = async (staffId: string) => {
    setProcessing(true);
    setError(null);

    try {
      const assignment = assignments.get(staffId);
      if (!assignment) {
        throw new Error('Staff must be assigned to the day before setting payment');
      }

      const { error: updateError } = await supabase
        .from('journey_staff_day_assignments')
        .update({
          payment_status: paymentForm.status,
          payment_amount: paymentForm.amount ? parseFloat(paymentForm.amount) : null,
          payment_notes: paymentForm.notes
        })
        .eq('id', assignment.id);

      if (updateError) throw updateError;

      await loadJourneyStaff();
      setEditingPayment(null);
      onUpdate();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const getRoleIcon = (role: string) => {
    const iconClass = "w-5 h-5";
    const display = getRoleDisplay(role);

    switch (display.icon) {
      case 'Users': return <Users className={iconClass} />;
      case 'Truck': return <Truck className={iconClass} />;
      case 'UserPlus': return <UserPlus className={iconClass} />;
      case 'Camera': return <Camera className={iconClass} />;
      case 'FileText': return <FileText className={iconClass} />;
      case 'MapPin': return <MapPin className={iconClass} />;
      case 'BookOpen': return <BookOpen className={iconClass} />;
      case 'Utensils': return <Utensils className={iconClass} />;
      case 'Activity': return <Activity className={iconClass} />;
      case 'Shield': return <Shield className={iconClass} />;
      case 'Backpack': return <Backpack className={iconClass} />;
      case 'UserCheck': return <UserCheck className={iconClass} />;
      default: return <Users className={iconClass} />;
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'unpaid':
      default:
        return 'bg-red-100 text-red-700 border-red-200';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Assign Staff to Day {dayNumber}</h2>
            <p className="text-sm text-gray-600 mt-1">Select staff members and set their payment details for this day</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : journeyStaff.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-2">No staff assigned to this journey yet</p>
              <p className="text-sm text-gray-400">Add staff to the journey first, then assign them to specific days</p>
            </div>
          ) : (
            <div className="space-y-3">
              {journeyStaff.map((staff) => {
                const roleDisplay = getRoleDisplay(staff.role, staff.role_custom);
                const assignment = assignments.get(staff.id);
                const isAssigned = !!assignment;
                const isEditingThis = editingPayment === staff.id;

                return (
                  <div
                    key={staff.id}
                    className={`rounded-lg border-2 transition-all ${
                      isAssigned
                        ? 'bg-green-50 border-green-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3 flex-1">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isAssigned ? roleDisplay.color.bg : 'bg-gray-200'
                        }`}>
                          <div className={isAssigned ? roleDisplay.color.text : 'text-gray-500'}>
                            {getRoleIcon(staff.role)}
                          </div>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{staff.name}</h3>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
                              isAssigned
                                ? `${roleDisplay.color.bg} ${roleDisplay.color.text} ${roleDisplay.color.border}`
                                : 'bg-gray-100 text-gray-600 border-gray-200'
                            }`}>
                              {roleDisplay.label}
                            </span>
                            {assignment && (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
                                getPaymentStatusColor(assignment.payment_status)
                              }`}>
                                {assignment.payment_status === 'paid' ? 'Paid' :
                                 assignment.payment_status === 'pending' ? 'Pending' : 'Unpaid'}
                                {assignment.payment_amount && ` - ${assignment.payment_currency} ${assignment.payment_amount}`}
                              </span>
                            )}
                          </div>
                          {staff.phone && (
                            <p className="text-xs text-gray-500 mt-0.5">{staff.phone}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isAssigned && (
                          <button
                            onClick={() => openPaymentEditor(staff.id)}
                            disabled={processing}
                            className="px-3 py-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-1 text-sm"
                          >
                            <DollarSign className="w-4 h-4" />
                            Payment
                          </button>
                        )}
                        <button
                          onClick={() => toggleStaffAssignment(staff.id)}
                          disabled={processing}
                          className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                            isAssigned
                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                        >
                          {isAssigned ? 'Remove' : 'Assign'}
                        </button>
                      </div>
                    </div>

                    {isEditingThis && assignment && (
                      <div className="border-t border-green-200 p-4 bg-white">
                        <h4 className="font-medium text-gray-900 mb-3">Payment Details</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Payment Status
                            </label>
                            <select
                              value={paymentForm.status}
                              onChange={(e) => setPaymentForm({ ...paymentForm, status: e.target.value as any })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="unpaid">Unpaid</option>
                              <option value="pending">Pending</option>
                              <option value="paid">Paid</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Amount ({assignment.payment_currency})
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={paymentForm.amount}
                              onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                              placeholder="0.00"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Payment Notes
                            </label>
                            <textarea
                              value={paymentForm.notes}
                              onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                              placeholder="Add any notes about this payment..."
                              rows={2}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <button
                            onClick={() => savePaymentInfo(staff.id)}
                            disabled={processing}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
                          >
                            Save Payment Info
                          </button>
                          <button
                            onClick={() => setEditingPayment(null)}
                            disabled={processing}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 font-medium"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors font-medium"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
