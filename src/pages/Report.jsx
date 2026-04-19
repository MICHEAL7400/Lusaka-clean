import React, { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const Report = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [locationAccuracy, setLocationAccuracy] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const watchIdRef = useRef(null);

  const isEmergencyParam = new URLSearchParams(location.search).get('emergency') === 'true';

  const [formData, setFormData] = useState({
    address: '',
    waste_type: 'household',
    description: '',
    latitude: null,
    longitude: null,
    is_emergency: isEmergencyParam
  });

  const wasteTypes = [
    { value: 'household',    label: 'Household Waste' },
    { value: 'construction', label: 'Construction Debris' },
    { value: 'overflowing',  label: 'Overflowing Bin' },
    { value: 'illegal',      label: 'Illegal Dumping' },
    { value: 'hazardous',    label: 'Hazardous Waste' },
    { value: 'recycling',    label: 'Recycling' },
    { value: 'other',        label: 'Other' }
  ];

  const zones = ['Matero', 'Chilene', 'Kabwata', 'CBD', 'Kanyama', 'Chawama', 'Mandevu'];

  const getAddressFromCoords = async (latitude, longitude) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        { headers: { 'User-Agent': 'LusakaClean/1.0' }, signal: AbortSignal.timeout(6000) }
      );
      const data = await res.json();
      if (data?.address) {
        const a = data.address;
        const parts = [a.road, a.suburb, a.city || a.town].filter(Boolean);
        return parts.length ? parts.join(', ') : data.display_name.split(',')[0];
      }
    } catch (err) {
      console.error('Geocode error:', err);
    }
    return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
  };

  const stopWatch = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Location not supported on this device');
      return;
    }

    stopWatch();
    setGettingLocation(true);
    setSelectedLocation(null);
    setLocationAccuracy(null);
    toast.loading('Getting your location…', { id: 'location' });

    let bestAccuracy = Infinity;

    // Auto-stop after 20 seconds with whatever we have
    const timeout = setTimeout(() => {
      stopWatch();
      setGettingLocation(false);
      if (bestAccuracy === Infinity) {
        toast.error('Could not get location. Enter address manually.', { id: 'location' });
      } else {
        toast.success('Location found!', { id: 'location' });
      }
    }, 20000);

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;

        // Ignore if not better than what we already have
        if (accuracy >= bestAccuracy) return;
        bestAccuracy = accuracy;

        // Update coords and pin right away
        setSelectedLocation([latitude, longitude]);
        setLocationAccuracy(accuracy);
        setFormData(prev => ({ ...prev, latitude, longitude }));

        // Reverse geocode quietly in background
        getAddressFromCoords(latitude, longitude).then(address => {
          setFormData(prev => ({ ...prev, address }));
        });

        // Stop once we hit good accuracy (≤ 30m is plenty)
        if (accuracy <= 30) {
          clearTimeout(timeout);
          stopWatch();
          setGettingLocation(false);
          toast.success('Location found!', { id: 'location' });
        }
      },
      (error) => {
        clearTimeout(timeout);
        stopWatch();
        setGettingLocation(false);

        if (error.code === error.PERMISSION_DENIED) {
          toast.error('Location permission denied. Please allow it in settings.', { id: 'location' });
        } else {
          toast.error('Could not get location. Please enter address manually.', { id: 'location' });
        }
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  };

  const openMapPicker = () => {
    window.open('https://www.google.com/maps', '_blank');
    toast.info('Copy coordinates from Google Maps and paste below');
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Photo too large. Max 5MB'); return; }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const uploadPhoto = async () => {
    if (!photoFile) return null;
    try {
      const fileName = `${Date.now()}_${photoFile.name}`;
      const { error } = await supabase.storage.from('report-images').upload(fileName, photoFile);
      if (error) return null;
      const { data } = supabase.storage.from('report-images').getPublicUrl(fileName);
      return data.publicUrl;
    } catch { return null; }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.address) { toast.error('Please enter an address or use current location'); return; }

    stopWatch();
    setLoading(true);

    let zone = 'Matero';
    const addressLower = formData.address.toLowerCase();
    for (const z of zones) {
      if (addressLower.includes(z.toLowerCase())) { zone = z; break; }
    }

    try {
      const photoUrl = await uploadPhoto();
      const { error: insertError } = await supabase.from('waste_reports').insert([{
        user_id: user.id,
        address: formData.address,
        latitude: formData.latitude,
        longitude: formData.longitude,
        waste_type: formData.waste_type,
        description: formData.description,
        is_emergency: formData.is_emergency,
        photo_url: photoUrl,
        zone,
        status: 'pending',
        created_at: new Date().toISOString()
      }]);
      if (insertError) throw insertError;

      const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin');
      for (const admin of admins || []) {
        await supabase.from('notifications').insert([{
          user_id: admin.id,
          title: formData.is_emergency ? 'EMERGENCY REPORT' : 'New Waste Report',
          message: `${formData.is_emergency ? 'EMERGENCY — ' : ''}New report at ${formData.address}`,
          type: formData.is_emergency ? 'error' : 'info'
        }]);
      }

      toast.success(formData.is_emergency ? 'Emergency report submitted!' : 'Report submitted!');
      navigate('/dashboard');
    } catch (err) {
      console.error('Submit error:', err);
      toast.error('Failed to submit. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-0">
      <div className={`rounded-t-2xl p-4 sm:p-6 text-white ${formData.is_emergency ? 'bg-red-600' : 'bg-gradient-to-r from-green-600 to-green-700'}`}>
        <h1 className="text-xl sm:text-2xl font-bold">Report Waste Issue</h1>
        <p className="text-green-100 text-sm mt-1">Help keep Lusaka clean and green</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-b-2xl shadow-lg p-4 sm:p-6 space-y-4 sm:space-y-6">

        {/* Location */}
        <div className="border rounded-lg p-3 sm:p-4 bg-blue-50">
          <h2 className="font-semibold mb-3 flex items-center gap-2 text-sm sm:text-base">
            <i className="fas fa-map-marker-alt text-blue-600"></i>
            Location Information
          </h2>
          <div className="space-y-3">

            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Enter street address, landmark, or area"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 text-sm bg-white"
              required
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={getCurrentLocation}
                disabled={gettingLocation}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-60 flex items-center justify-center gap-2 text-sm font-medium"
              >
                <i className={`fas ${gettingLocation ? 'fa-spinner fa-spin' : 'fa-location-dot'}`}></i>
                {gettingLocation ? 'Getting location…' : 'Use My Location'}
              </button>

              <button
                type="button"
                onClick={openMapPicker}
                className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition flex items-center justify-center gap-2 text-sm"
              >
                <i className="fas fa-map"></i>
                Pick on Map
              </button>
            </div>

            {/* Show location once found — no warnings, just coords + accuracy */}
            {selectedLocation && (
              <div className="text-xs text-green-700 bg-green-100 p-2 rounded flex items-center gap-2">
                <i className="fas fa-check-circle text-green-600"></i>
                <span>{selectedLocation[0].toFixed(5)}, {selectedLocation[1].toFixed(5)}</span>
                {locationAccuracy && (
                  <span className="ml-auto font-medium">±{Math.round(locationAccuracy)}m</span>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Latitude (optional)"
                value={formData.latitude || ''}
                onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) || null })}
                className="px-3 py-2 border rounded-lg text-sm bg-white"
              />
              <input
                type="text"
                placeholder="Longitude (optional)"
                value={formData.longitude || ''}
                onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) || null })}
                className="px-3 py-2 border rounded-lg text-sm bg-white"
              />
            </div>
          </div>
        </div>

        {/* Waste Type */}
        <div className="border rounded-lg p-3 sm:p-4">
          <h2 className="font-semibold mb-3 flex items-center gap-2 text-sm sm:text-base">
            <i className="fas fa-trash-alt text-green-600"></i>
            Waste Type
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {wasteTypes.map(type => (
              <label
                key={type.value}
                className={`flex items-center gap-3 p-2 sm:p-3 rounded-lg cursor-pointer transition border ${
                  formData.waste_type === type.value
                    ? 'border-green-600 bg-green-50'
                    : 'border-gray-200 hover:border-green-300'
                }`}
              >
                <input
                  type="radio"
                  name="waste_type"
                  value={type.value}
                  checked={formData.waste_type === type.value}
                  onChange={(e) => setFormData({ ...formData, waste_type: e.target.value })}
                  className="sr-only"
                />
                <span className="text-sm font-medium">{type.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="border rounded-lg p-3 sm:p-4">
          <h2 className="font-semibold mb-3 flex items-center gap-2 text-sm sm:text-base">
            <i className="fas fa-edit text-green-600"></i>
            Description
          </h2>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows="4"
            placeholder="Describe the waste issue in detail..."
            className="w-full px-3 py-2 border rounded-lg resize-none focus:ring-2 focus:ring-green-500 text-sm"
          />
        </div>

        {/* Photo */}
        <div className="border rounded-lg p-3 sm:p-4">
          <h2 className="font-semibold mb-3 flex items-center gap-2 text-sm sm:text-base">
            <i className="fas fa-camera text-green-600"></i>
            Photo (Optional)
          </h2>
          {photoPreview ? (
            <div className="relative inline-block">
              <img src={photoPreview} alt="Preview" className="max-h-32 rounded-lg" />
              <button
                type="button"
                onClick={() => { setPhotoPreview(null); setPhotoFile(null); }}
                className="absolute top-0 right-0 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-700 text-xs"
              >✕</button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition">
              <i className="fas fa-cloud-upload-alt text-2xl sm:text-3xl text-gray-400 mb-2"></i>
              <p className="text-xs sm:text-sm text-gray-500">Click to upload a photo</p>
              <p className="text-xs text-gray-400">PNG, JPG up to 5MB</p>
              <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            </label>
          )}
        </div>

        {/* Emergency */}
        <div className={`border rounded-lg p-3 sm:p-4 ${formData.is_emergency ? 'border-red-400 bg-red-50' : 'border-red-200 bg-red-50'}`}>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.is_emergency}
              onChange={(e) => setFormData({ ...formData, is_emergency: e.target.checked })}
              className="mt-1 w-4 h-4 sm:w-5 sm:h-5 accent-red-600"
            />
            <div>
              <p className="font-semibold text-red-700 flex items-center gap-2 text-sm sm:text-base">
                <i className="fas fa-exclamation-triangle"></i>
                Mark as Emergency
              </p>
              <p className="text-xs sm:text-sm text-red-600">
                Check this if the waste poses immediate health or environmental risks
              </p>
            </div>
          </label>
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="px-4 py-3 border rounded-lg hover:bg-gray-50 transition font-medium text-sm order-2 sm:order-1"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className={`flex-1 px-4 py-3 rounded-lg text-white font-medium transition text-sm order-1 sm:order-2 ${
              formData.is_emergency
                ? 'bg-red-600 hover:bg-red-700 animate-pulse'
                : 'bg-green-600 hover:bg-green-700'
            } disabled:opacity-50`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <i className="fas fa-spinner fa-spin"></i>
                Submitting...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <i className="fas fa-paper-plane"></i>
                {formData.is_emergency ? 'Submit Emergency Report' : 'Submit Report'}
              </span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Report;