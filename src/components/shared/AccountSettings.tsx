import { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, User, Phone, Mail, FileText, Calendar, Camera, Loader, Upload, Car, CreditCard } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface AccountSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MasterStaff {
  id: string;
  user_id: string;
  role_custom: string | null;
  staff_type: string;
  emergency_contact: string | null;
  availability: string;
  availability_notes: string;
  payment_method: string | null;
  id_verified: boolean;
  contract_signed: boolean;
  has_vehicle: boolean;
  vehicle_type: string | null;
  profile_photo_url: string | null;
  document_attachment_url: string | null;
}

export default function AccountSettings({ isOpen, onClose }: AccountSettingsProps) {
  const { userProfile, refreshUserProfile } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [tourLicenseUrl, setTourLicenseUrl] = useState('');
  const [tourLicenseExpiry, setTourLicenseExpiry] = useState('');
  const [profileImageUrl, setProfileImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const [masterStaff, setMasterStaff] = useState<MasterStaff | null>(null);
  const [roleCustom, setRoleCustom] = useState('');
  const [staffType, setStaffType] = useState('employee');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [availability, setAvailability] = useState('available');
  const [availabilityNotes, setAvailabilityNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [hasVehicle, setHasVehicle] = useState(false);
  const [vehicleType, setVehicleType] = useState('');
  const [documentAttachmentUrl, setDocumentAttachmentUrl] = useState('');

  useEffect(() => {
    if (userProfile) {
      setName(userProfile.name || '');
      setEmail(userProfile.email || '');
      setPhoneNumber(userProfile.phone_number || '');
      setTourLicenseUrl(userProfile.tour_license_url || '');
      setTourLicenseExpiry(userProfile.tour_license_expiry || '');
      setProfileImageUrl(userProfile.profile_image_url || '');

      if (userProfile.role === 'guide') {
        loadMasterStaffProfile();
      }
    }
  }, [userProfile]);

  const loadMasterStaffProfile = async () => {
    if (!userProfile) return;

    try {
      const { data, error } = await supabase
        .from('master_staff')
        .select('*')
        .eq('user_id', userProfile.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setMasterStaff(data);
        setRoleCustom(data.role_custom || '');
        setStaffType(data.staff_type || 'employee');
        setEmergencyContact(data.emergency_contact || '');
        setAvailability(data.availability || 'available');
        setAvailabilityNotes(data.availability_notes || '');
        setPaymentMethod(data.payment_method || '');
        setHasVehicle(data.has_vehicle || false);
        setVehicleType(data.vehicle_type || '');
        setDocumentAttachmentUrl(data.document_attachment_url || '');
      }
    } catch (err: any) {
      console.error('Failed to load master staff profile:', err);
    }
  };

  if (!isOpen) return null;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userProfile) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('File must be an image');
      return;
    }

    setUploadingImage(true);
    setError('');

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userProfile.id}/profile.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(fileName, file, {
          upsert: true,
          contentType: file.type
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile-images')
        .getPublicUrl(fileName);

      setProfileImageUrl(publicUrl);

      const { error: updateError } = await supabase
        .from('users')
        .update({ profile_image_url: publicUrl })
        .eq('id', userProfile.id);

      if (updateError) throw updateError;

      if (userProfile.role === 'guide' && masterStaff) {
        const { error: staffError } = await supabase
          .from('master_staff')
          .update({ profile_photo_url: publicUrl })
          .eq('user_id', userProfile.id);

        if (staffError) console.error('Failed to update master_staff profile photo:', staffError);
      }

      if (refreshUserProfile) {
        await refreshUserProfile();
      }

      setSuccess('Profile image updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userProfile) return;

    if (file.size > 10 * 1024 * 1024) {
      setError('Document must be less than 10MB');
      return;
    }

    setUploadingDocument(true);
    setError('');

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userProfile.id}/document_${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('staff-documents')
        .upload(fileName, file, {
          upsert: false,
          contentType: file.type
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('staff-documents')
        .getPublicUrl(fileName);

      setDocumentAttachmentUrl(publicUrl);

      if (masterStaff) {
        const { error: updateError } = await supabase
          .from('master_staff')
          .update({ document_attachment_url: publicUrl })
          .eq('user_id', userProfile.id);

        if (updateError) throw updateError;
      }

      setSuccess('Document uploaded successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to upload document');
    } finally {
      setUploadingDocument(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (!userProfile) throw new Error('User profile not found');

      const { error: updateError } = await supabase
        .from('users')
        .update({
          name,
          phone_number: phoneNumber || null,
          tour_license_url: tourLicenseUrl || null,
          tour_license_expiry: tourLicenseExpiry || null,
          profile_image_url: profileImageUrl || null
        })
        .eq('id', userProfile.id);

      if (updateError) throw updateError;

      if (userProfile.role === 'guide' && masterStaff) {
        const { error: staffError } = await supabase
          .from('master_staff')
          .update({
            role_custom: roleCustom || null,
            staff_type: staffType,
            emergency_contact: emergencyContact || null,
            availability,
            availability_notes: availabilityNotes || '',
            payment_method: paymentMethod || null,
            has_vehicle: hasVehicle,
            vehicle_type: hasVehicle ? vehicleType || null : null,
            profile_photo_url: profileImageUrl || null,
            document_attachment_url: documentAttachmentUrl || null
          })
          .eq('user_id', userProfile.id);

        if (staffError) throw staffError;
      }

      if (email !== userProfile.email) {
        const { error: emailError } = await supabase.auth.updateUser({ email });
        if (emailError) throw emailError;
        setSuccess('Profile updated! A confirmation email has been sent to your new email address.');
      } else {
        setSuccess('Profile updated successfully!');
      }

      if (refreshUserProfile) {
        await refreshUserProfile();
      }

      setTimeout(() => {
        setSuccess('');
        handleClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError('');
    setSuccess('');
    onClose();
  };

  const isLicenseExpiringSoon = () => {
    if (!tourLicenseExpiry) return false;
    const expiryDate = new Date(tourLicenseExpiry);
    const today = new Date();
    const daysUntilExpiry = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry >= 0;
  };

  const isLicenseExpired = () => {
    if (!tourLicenseExpiry) return false;
    const expiryDate = new Date(tourLicenseExpiry);
    const today = new Date();
    return expiryDate < today;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-brand-charcoal">Profile Settings</h2>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 flex items-start gap-2">
              <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span className="text-sm">{success}</span>
            </div>
          )}

          <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="bg-brand-beige-light p-4 rounded-lg mb-4">
                <p className="text-sm text-brand-chocolate font-medium">
                  Role: <span className="text-brand-charcoal capitalize">{userProfile?.role}</span>
                </p>
              </div>

              <div className="flex flex-col items-center mb-6">
                <div className="relative">
                  <div className="w-32 h-32 rounded-full bg-brand-tan flex items-center justify-center overflow-hidden border-4 border-brand-beige-light">
                    {profileImageUrl ? (
                      <img src={profileImageUrl} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-16 h-16 text-brand-brown-light" />
                    )}
                  </div>
                  <label
                    htmlFor="profile-image-upload"
                    className="absolute bottom-0 right-0 bg-brand-terracotta text-white p-2 rounded-full cursor-pointer hover:bg-brand-terracotta-light transition-colors shadow-lg"
                  >
                    {uploadingImage ? (
                      <Loader className="w-5 h-5 animate-spin" />
                    ) : (
                      <Camera className="w-5 h-5" />
                    )}
                  </label>
                  <input
                    id="profile-image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                    className="hidden"
                  />
                </div>
                <p className="text-xs text-brand-brown-light mt-2 text-center">
                  Click the camera icon to upload a profile picture (max 5MB)
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-brand-charcoal mb-1">
                  <User className="w-4 h-4 inline mr-1" />
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 border border-brand-tan rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-brand-charcoal mb-1">
                  <Mail className="w-4 h-4 inline mr-1" />
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-brand-tan rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent"
                  required
                  disabled={loading}
                />
                <p className="text-xs text-brand-brown-light mt-1">Changing your email will require verification</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-brand-charcoal mb-1">
                  <Phone className="w-4 h-4 inline mr-1" />
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  className="w-full px-4 py-2 border border-brand-tan rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent"
                  disabled={loading}
                />
              </div>

              {userProfile?.role === 'guide' && (
                <>
                  <div className="border-t border-brand-tan pt-4 mt-4">
                    <h3 className="text-lg font-semibold text-brand-charcoal mb-3">Guide Staff Profile</h3>

                    {masterStaff && (
                      <div className="bg-brand-beige-light p-3 rounded-lg mb-4 space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle className={`w-4 h-4 ${masterStaff.id_verified ? 'text-green-600' : 'text-gray-400'}`} />
                          <span className="text-brand-charcoal">ID Verified: {masterStaff.id_verified ? 'Yes' : 'No'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle className={`w-4 h-4 ${masterStaff.contract_signed ? 'text-green-600' : 'text-gray-400'}`} />
                          <span className="text-brand-charcoal">Contract Signed: {masterStaff.contract_signed ? 'Yes' : 'No'}</span>
                        </div>
                      </div>
                    )}

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-brand-charcoal mb-1">
                          <FileText className="w-4 h-4 inline mr-1" />
                          Custom Role Description
                        </label>
                        <input
                          type="text"
                          value={roleCustom}
                          onChange={(e) => setRoleCustom(e.target.value)}
                          placeholder="e.g., Heritage Specialist, Desert Explorer"
                          className="w-full px-4 py-2 border border-brand-tan rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent"
                          disabled={loading}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-brand-charcoal mb-1">
                          <User className="w-4 h-4 inline mr-1" />
                          Staff Type
                        </label>
                        <select
                          value={staffType}
                          onChange={(e) => setStaffType(e.target.value)}
                          className="w-full px-4 py-2 border border-brand-tan rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent"
                          disabled={loading}
                        >
                          <option value="employee">Employee</option>
                          <option value="contractor">Contractor</option>
                          <option value="freelancer">Freelancer</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-brand-charcoal mb-1">
                          <Phone className="w-4 h-4 inline mr-1" />
                          Emergency Contact
                        </label>
                        <input
                          type="text"
                          value={emergencyContact}
                          onChange={(e) => setEmergencyContact(e.target.value)}
                          placeholder="Emergency contact name and number"
                          className="w-full px-4 py-2 border border-brand-tan rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent"
                          disabled={loading}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-brand-charcoal mb-1">
                          <CheckCircle className="w-4 h-4 inline mr-1" />
                          Availability Status
                        </label>
                        <select
                          value={availability}
                          onChange={(e) => setAvailability(e.target.value)}
                          className="w-full px-4 py-2 border border-brand-tan rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent"
                          disabled={loading}
                        >
                          <option value="available">Available</option>
                          <option value="partially_available">Partially Available</option>
                          <option value="not_available">Not Available</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-brand-charcoal mb-1">
                          <FileText className="w-4 h-4 inline mr-1" />
                          Availability Notes
                        </label>
                        <textarea
                          value={availabilityNotes}
                          onChange={(e) => setAvailabilityNotes(e.target.value)}
                          placeholder="Any specific dates or constraints"
                          rows={2}
                          className="w-full px-4 py-2 border border-brand-tan rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent"
                          disabled={loading}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-brand-charcoal mb-1">
                          <CreditCard className="w-4 h-4 inline mr-1" />
                          Preferred Payment Method
                        </label>
                        <input
                          type="text"
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          placeholder="e.g., Bank Transfer, Cash, Check"
                          className="w-full px-4 py-2 border border-brand-tan rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent"
                          disabled={loading}
                        />
                      </div>

                      <div>
                        <label className="flex items-center gap-2 text-sm font-semibold text-brand-charcoal cursor-pointer">
                          <input
                            type="checkbox"
                            checked={hasVehicle}
                            onChange={(e) => setHasVehicle(e.target.checked)}
                            className="w-4 h-4 text-brand-terracotta focus:ring-brand-terracotta border-brand-tan rounded"
                            disabled={loading}
                          />
                          <Car className="w-4 h-4" />
                          I have my own vehicle
                        </label>
                      </div>

                      {hasVehicle && (
                        <div>
                          <label className="block text-sm font-semibold text-brand-charcoal mb-1">
                            <Car className="w-4 h-4 inline mr-1" />
                            Vehicle Type
                          </label>
                          <input
                            type="text"
                            value={vehicleType}
                            onChange={(e) => setVehicleType(e.target.value)}
                            placeholder="e.g., 4x4 SUV, Sedan"
                            className="w-full px-4 py-2 border border-brand-tan rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent"
                            disabled={loading}
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-semibold text-brand-charcoal mb-1">
                          <Upload className="w-4 h-4 inline mr-1" />
                          Documents (License, ID, Certificates)
                        </label>
                        <div className="flex gap-2">
                          <label
                            htmlFor="document-upload"
                            className="flex-1 px-4 py-2 border-2 border-dashed border-brand-tan rounded-lg hover:border-brand-terracotta transition-colors cursor-pointer text-center text-sm text-brand-brown-light"
                          >
                            {uploadingDocument ? (
                              <span className="flex items-center justify-center gap-2">
                                <Loader className="w-4 h-4 animate-spin" />
                                Uploading...
                              </span>
                            ) : documentAttachmentUrl ? (
                              'Click to replace document'
                            ) : (
                              'Click to upload document'
                            )}
                          </label>
                          <input
                            id="document-upload"
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={handleDocumentUpload}
                            disabled={uploadingDocument || loading}
                            className="hidden"
                          />
                        </div>
                        {documentAttachmentUrl && (
                          <a
                            href={documentAttachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-brand-terracotta hover:underline mt-1 inline-block"
                          >
                            View uploaded document
                          </a>
                        )}
                        <p className="text-xs text-brand-brown-light mt-1">Upload PDF, JPG, or PNG (max 10MB)</p>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-brand-charcoal mb-1">
                          <FileText className="w-4 h-4 inline mr-1" />
                          Tour License URL
                        </label>
                        <input
                          type="url"
                          value={tourLicenseUrl}
                          onChange={(e) => setTourLicenseUrl(e.target.value)}
                          placeholder="https://example.com/license.pdf"
                          className="w-full px-4 py-2 border border-brand-tan rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent"
                          disabled={loading}
                        />
                        <p className="text-xs text-brand-brown-light mt-1">URL to your tour license document</p>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-brand-charcoal mb-1">
                          <Calendar className="w-4 h-4 inline mr-1" />
                          License Expiry Date
                        </label>
                        <input
                          type="date"
                          value={tourLicenseExpiry}
                          onChange={(e) => setTourLicenseExpiry(e.target.value)}
                          className="w-full px-4 py-2 border border-brand-tan rounded-lg focus:ring-2 focus:ring-brand-terracotta focus:border-transparent"
                          disabled={loading}
                        />

                        {isLicenseExpired() && (
                          <div className="mt-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <span className="text-xs">Your license has expired! Please renew it.</span>
                          </div>
                        )}

                        {isLicenseExpiringSoon() && !isLicenseExpired() && (
                          <div className="mt-2 bg-amber-50 border border-amber-200 text-amber-700 px-3 py-2 rounded-lg flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <span className="text-xs">Your license expires in less than 30 days!</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 px-4 py-2 border border-brand-tan text-brand-charcoal hover:bg-brand-beige-light rounded-lg transition-colors font-medium"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-brand-terracotta hover:bg-brand-terracotta-light text-white font-semibold py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
        </div>
      </div>
    </div>
  );
}
