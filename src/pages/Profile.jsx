import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    zone: 'Matero',
    vehicle_type: '',
    worker_id: '',
    experience: ''
  });

  const zones = ['Matero', 'Chilene', 'Kabwata', 'CBD', 'Kanyama', 'Chawama', 'Mandevu'];
  const vehicleTypes = [
    { value: 'Bicycle', label: '🚲 Bicycle', description: 'Best for small loads (household waste, recycling)' },
    { value: 'Motorbike', label: '🏍️ Motorbike', description: 'Good for small to medium loads' },
    { value: 'Pickup', label: '🚛 Pickup Truck', description: 'Ideal for medium to large loads' },
    { value: 'Truck', label: '🚚 Large Truck', description: 'Can handle all waste types including construction' }
  ];
  const experienceLevels = ['Less than 1 year', '1-3 years', '3-5 years', '5+ years'];

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      setFormData({
        full_name: parsedUser.full_name || '',
        phone: parsedUser.phone || '',
        zone: parsedUser.zone || 'Matero',
        vehicle_type: parsedUser.vehicle_type || '',
        worker_id: parsedUser.worker_id || '',
        experience: parsedUser.experience || ''
      });
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const updateData = {
        full_name: formData.full_name,
        phone: formData.phone,
        zone: formData.zone,
        updated_at: new Date().toISOString()
      };
      
      // Only add worker-specific fields if user is a worker
      if (user?.role === 'worker') {
        updateData.vehicle_type = formData.vehicle_type;
        updateData.worker_id = formData.worker_id;
        updateData.experience = formData.experience;
      }
      
      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);
      
      if (error) throw error;
      
      // Update local storage
      const updatedUser = { ...user, ...updateData };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      
      toast.success('Profile updated successfully');
      setIsEditing(false);
      
    } catch (err) {
      console.error(err);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="text-center py-12">
        <p>Please login to view profile</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 px-4 sm:px-0">
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-2xl p-4 sm:p-6 text-white">
        <h1 className="text-xl sm:text-2xl font-bold">My Profile</h1>
        <p className="text-green-100 text-sm mt-1">Manage your account information</p>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="font-semibold">Personal Information</h2>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="text-green-600 text-sm hover:underline"
            >
              Edit Profile
            </button>
          )}
        </div>

        <div className="p-4">
          {isEditing ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={user.email}
                  disabled
                  className="w-full px-3 py-2 border rounded-lg bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="0977 123456"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Zone / Area</label>
                <select
                  value={formData.zone}
                  onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  {zones.map(zone => (
                    <option key={zone} value={zone}>{zone}</option>
                  ))}
                </select>
              </div>

              {/* Worker-specific fields */}
              {user.role === 'worker' && (
                <>
                  <div className="border-t pt-4 mt-2">
                    <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <i className="fas fa-truck text-green-600"></i>
                      Worker Information
                    </h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Worker ID</label>
                        <input
                          type="text"
                          value={formData.worker_id}
                          onChange={(e) => setFormData({ ...formData, worker_id: e.target.value })}
                          placeholder="LCC-WKR-001"
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">Your worker identification number</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Vehicle Type</label>
                        <select
                          value={formData.vehicle_type}
                          onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                        >
                          <option value="">Select vehicle type</option>
                          {vehicleTypes.map(vehicle => (
                            <option key={vehicle.value} value={vehicle.value}>
                              {vehicle.label}
                            </option>
                          ))}
                        </select>
                        {formData.vehicle_type && (
                          <p className="text-xs text-blue-600 mt-1">
                            {vehicleTypes.find(v => v.value === formData.vehicle_type)?.description}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Years of Experience</label>
                        <select
                          value={formData.experience}
                          onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                        >
                          <option value="">Select experience level</option>
                          {experienceLevels.map(level => (
                            <option key={level} value={level}>{level}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </>
              )}
              
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Full Name</p>
                <p className="font-medium">{user.full_name || 'Not set'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{user.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="font-medium">{user.phone || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Zone</p>
                <p className="font-medium">{user.zone || 'Not set'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Role</p>
                <p className="font-medium capitalize">{user.role}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Member Since</p>
                <p className="font-medium">{user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Recently'}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Worker Information Section - View Mode */}
      {user.role === 'worker' && !isEditing && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-200">
          <h3 className="font-semibold mb-3 flex items-center gap-2 text-blue-800">
            <i className="fas fa-truck"></i>
            Worker Details
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center py-2 border-b border-blue-100">
              <span className="text-gray-600">Worker ID:</span>
              <span className="font-medium">{user.worker_id || 'Not assigned'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-blue-100">
              <span className="text-gray-600">Vehicle Type:</span>
              <span className="font-medium">
                {user.vehicle_type ? (
                  <span className="flex items-center gap-1">
                    {user.vehicle_type === 'Bicycle' && '🚲'}
                    {user.vehicle_type === 'Motorbike' && '🏍️'}
                    {user.vehicle_type === 'Pickup' && '🚛'}
                    {user.vehicle_type === 'Truck' && '🚚'}
                    {' '}{user.vehicle_type}
                  </span>
                ) : 'Not specified'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-blue-100">
              <span className="text-gray-600">Experience:</span>
              <span className="font-medium">{user.experience || 'Not specified'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-blue-100">
              <span className="text-gray-600">Jobs Completed:</span>
              <span className="font-medium">{user.completed_jobs || 0}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600">Rating:</span>
              <span className="font-medium text-yellow-600">
                {user.rating || 0}⭐ ({user.rating_count || 0} reviews)
              </span>
            </div>
          </div>
          
          {/* Vehicle Recommendation based on current selection */}
          {user.vehicle_type && (
            <div className="mt-4 p-3 bg-white rounded-lg border border-blue-200">
              <p className="text-xs font-medium text-gray-600 mb-1">Your Vehicle Capability:</p>
              <p className="text-sm">
                {user.vehicle_type === 'Truck' && '✓ Can handle all waste types including construction and hazardous waste'}
                {user.vehicle_type === 'Pickup' && '✓ Can handle most waste types including construction debris'}
                {user.vehicle_type === 'Motorbike' && '⚠️ Best for small to medium loads. Not suitable for large construction waste.'}
                {user.vehicle_type === 'Bicycle' && '⚠️ Best for small loads only. Consider upgrading for larger jobs.'}
              </p>
            </div>
          )}
          
          <button
            onClick={() => setIsEditing(true)}
            className="mt-4 w-full text-center text-blue-600 text-sm hover:underline"
          >
            Edit Worker Information →
          </button>
        </div>
      )}

      {/* Tips Section */}
      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
        <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
          <i className="fas fa-lightbulb text-yellow-600"></i>
          Tips for Workers
        </h3>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>• <strong>Vehicle Type:</strong> Selecting the correct vehicle helps residents know what to expect</li>
          <li>• <strong>Update regularly:</strong> Keep your vehicle information up to date</li>
          <li>• <strong>Complete jobs:</strong> More completed jobs = higher rating = more job opportunities</li>
          <li>• <strong>Location sharing:</strong> Enable location tracking so residents can see your ETA</li>
        </ul>
      </div>
    </div>
  );
};

export default Profile;