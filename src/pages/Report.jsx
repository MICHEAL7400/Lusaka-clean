import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const Report = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [formData, setFormData] = useState({
    address: '',
    waste_type: 'household',
    description: '',
    latitude: null,
    longitude: null,
    is_emergency: false
  });

  const wasteTypes = [
    { value: 'household', label: '🏠 Household Waste', icon: 'fa-trash-alt', color: 'bg-green-100' },
    { value: 'construction', label: '🏗️ Construction Debris', icon: 'fa-hard-hat', color: 'bg-orange-100' },
    { value: 'overflowing', label: '🗑️ Overflowing Bin', icon: 'fa-trash', color: 'bg-red-100' },
    { value: 'illegal', label: '🚫 Illegal Dumping', icon: 'fa-ban', color: 'bg-purple-100' },
    { value: 'hazardous', label: '⚠️ Hazardous Waste', icon: 'fa-skull-crossbones', color: 'bg-red-200' },
    { value: 'recycling', label: '♻️ Recycling', icon: 'fa-recycle', color: 'bg-blue-100' },
    { value: 'other', label: '📦 Other', icon: 'fa-box', color: 'bg-gray-100' }
  ];

  const zones = ['Matero', 'Chilene', 'Kabwata', 'CBD', 'Kanyama', 'Chawama', 'Mandevu'];

  const getCurrentLocation = () => {
    setGettingLocation(true);
    toast.loading('Getting your location...', { id: 'location' });

    if (!navigator.geolocation) {
      toast.error('Geolocation not supported', { id: 'location' });
      setGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        
        setFormData(prev => ({ ...prev, latitude, longitude }));
        setSelectedLocation([latitude, longitude]);
        
        // Reverse geocoding to get address
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
            { headers: { 'User-Agent': 'LusakaClean/1.0' } }
          );
          const data = await response.json();
          
          if (data && data.display_name) {
            const shortAddress = data.display_name.split(',')[0];
            setFormData(prev => ({ ...prev, address: shortAddress }));
          }
        } catch (err) {
          console.error('Geocoding error:', err);
        }
        
        toast.success(`Location found! Accuracy: ${accuracy} meters`, { id: 'location' });
        setGettingLocation(false);
      },
      (error) => {
        console.error('Location error:', error);
        if (error.code === 1) {
          toast.error('Please allow location access', { id: 'location' });
        } else {
          toast.error('Could not get location. Please enter manually', { id: 'location' });
        }
        setGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Photo too large. Max 5MB');
        return;
      }
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const uploadPhoto = async () => {
    if (!photoFile) return null;
    
    const fileName = `${Date.now()}_${photoFile.name}`;
    const { error } = await supabase.storage
      .from('report-images')
      .upload(fileName, photoFile);
    
    if (error) {
      console.error('Upload error:', error);
      return null;
    }
    
    const { data: urlData } = supabase.storage
      .from('report-images')
      .getPublicUrl(fileName);
    
    return urlData.publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.address) {
      toast.error('Please enter an address or use current location');
      return;
    }

    setLoading(true);

    // Determine zone from address
    let zone = 'Matero';
    const addressLower = formData.address.toLowerCase();
    for (const z of zones) {
      if (addressLower.includes(z.toLowerCase())) {
        zone = z;
        break;
      }
    }

    try {
      const photoUrl = await uploadPhoto();
      
      // Insert report and get the ID back
      const { data: insertedReport, error: insertError } = await supabase
        .from('waste_reports')
        .insert([{
          user_id: user.id,
          address: formData.address,
          latitude: formData.latitude,
          longitude: formData.longitude,
          waste_type: formData.waste_type,
          description: formData.description,
          is_emergency: formData.is_emergency,
          photo_url: photoUrl,
          zone: zone,
          status: 'pending',
          created_at: new Date().toISOString()
        }])
        .select();
      
      if (insertError) throw insertError;
      
      const reportId = insertedReport?.[0]?.id;
      
      // Create notification for admins
      const { data: admins } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin');
      
      for (const admin of admins || []) {
        await supabase.from('notifications').insert([{
          user_id: admin.id,
          title: formData.is_emergency ? '🚨 EMERGENCY REPORT' : 'New Waste Report',
          message: `${formData.is_emergency ? 'EMERGENCY - ' : ''}New report at ${formData.address}`,
          type: formData.is_emergency ? 'error' : 'info',
          report_id: reportId
        }]);
      }
      
      toast.success(formData.is_emergency ? '🚨 Emergency report submitted! Help is on the way.' : '✅ Report submitted successfully!');
      navigate('/dashboard');
      
    } catch (err) {
      console.error('Submit error:', err);
      toast.error('Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-t-2xl p-6 text-white">
        <h1 className="text-2xl font-bold">Report Waste Issue</h1>
        <p className="text-green-100 mt-1">Help keep Lusaka clean and green</p>
      </div>
      
      <form onSubmit={handleSubmit} className="bg-white rounded-b-2xl shadow-lg p-6 space-y-6">
        {/* Location Section */}
        <div className="border rounded-lg p-4 bg-blue-50">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <i className="fas fa-map-marker-alt text-blue-600"></i>
            Location Information
          </h2>
          
          <div className="space-y-3">
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Enter street address, landmark, or area"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
              required
            />
            
            <button
              type="button"
              onClick={getCurrentLocation}
              disabled={gettingLocation}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <i className={`fas ${gettingLocation ? 'fa-spinner fa-spin' : 'fa-location-dot'}`}></i>
              {gettingLocation ? 'Getting location...' : 'Use My Current Location'}
            </button>
            
            {selectedLocation && (
              <div className="text-xs text-green-600 bg-green-100 p-2 rounded">
                <i className="fas fa-check-circle mr-1"></i>
                Location captured: {selectedLocation[0].toFixed(6)}, {selectedLocation[1].toFixed(6)}
              </div>
            )}
          </div>
        </div>

        {/* Waste Type Section */}
        <div className="border rounded-lg p-4">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <i className="fas fa-trash-alt text-green-600"></i>
            Waste Type
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {wasteTypes.map(type => (
              <label
                key={type.value}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition border-2 ${
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
                <div className={`w-10 h-10 rounded-full ${type.color} flex items-center justify-center`}>
                  <i className={`fas ${type.icon} text-lg`}></i>
                </div>
                <span className="text-sm font-medium">{type.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Description Section */}
        <div className="border rounded-lg p-4">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <i className="fas fa-edit text-green-600"></i>
            Description
          </h2>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows="4"
            placeholder="Describe the waste issue in detail (e.g., how long it's been there, approximate quantity, any hazards)..."
            className="w-full px-3 py-2 border rounded-lg resize-none focus:ring-2 focus:ring-green-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            <i className="fas fa-info-circle mr-1"></i>
            Detailed descriptions help workers respond appropriately
          </p>
        </div>

        {/* Photo Upload Section */}
        <div className="border rounded-lg p-4">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <i className="fas fa-camera text-green-600"></i>
            Photo Evidence
          </h2>
          
          {photoPreview ? (
            <div className="relative">
              <img src={photoPreview} alt="Preview" className="w-full max-h-48 object-cover rounded-lg" />
              <button
                type="button"
                onClick={() => { setPhotoPreview(null); setPhotoFile(null); }}
                className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 w-8 h-8 flex items-center justify-center hover:bg-red-700"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <i className="fas fa-cloud-upload-alt text-3xl text-gray-400 mb-2"></i>
                <p className="text-sm text-gray-500">Click to upload a photo</p>
                <p className="text-xs text-gray-400">PNG, JPG up to 5MB</p>
              </div>
              <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            </label>
          )}
        </div>

        {/* Emergency Section */}
        <div className="border rounded-lg p-4 border-red-300 bg-red-50">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.is_emergency}
              onChange={(e) => setFormData({ ...formData, is_emergency: e.target.checked })}
              className="mt-1 w-5 h-5 accent-red-600"
            />
            <div>
              <p className="font-semibold text-red-700 flex items-center gap-2">
                <i className="fas fa-exclamation-triangle"></i>
                Mark as Emergency
              </p>
              <p className="text-sm text-red-600">
                Check this if the waste issue poses immediate health or environmental risks
              </p>
            </div>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="flex-1 px-4 py-3 border rounded-lg hover:bg-gray-50 transition font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className={`flex-1 px-4 py-3 rounded-lg text-white font-medium transition ${
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