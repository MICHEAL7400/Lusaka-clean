import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const ScheduledPickups = ({ user }) => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    address: '',
    waste_type: 'household',
    frequency: 'weekly',
    day_of_week: 'monday',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    notes: ''
  });

  const frequencies = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'biweekly', label: 'Every 2 weeks' },
    { value: 'monthly', label: 'Monthly' }
  ];

  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  useEffect(() => {
    loadSchedules();
  }, []);

  const loadSchedules = async () => {
    try {
      const { data } = await supabase
        .from('scheduled_pickups')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      setSchedules(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const createSchedule = async () => {
    if (!newSchedule.address) {
      toast.error('Please enter an address');
      return;
    }
    
    try {
      const nextPickup = calculateNextPickup(newSchedule);
      const { error } = await supabase.from('scheduled_pickups').insert([{
        user_id: user.id,
        ...newSchedule,
        next_pickup: nextPickup,
        created_at: new Date().toISOString(),
        status: 'active'
      }]);
      if (error) throw error;
      toast.success('Schedule created successfully');
      setShowScheduleModal(false);
      setNewSchedule({
        address: '',
        waste_type: 'household',
        frequency: 'weekly',
        day_of_week: 'monday',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        notes: ''
      });
      loadSchedules();
    } catch (err) {
      toast.error('Failed to create schedule');
    }
  };

  const deleteSchedule = async (id) => {
    if (!confirm('Delete this schedule?')) return;
    try {
      await supabase.from('scheduled_pickups').delete().eq('id', id);
      toast.success('Schedule deleted');
      loadSchedules();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const calculateNextPickup = (schedule) => {
    const today = new Date();
    if (schedule.frequency === 'daily') {
      const next = new Date(today);
      next.setDate(today.getDate() + 1);
      return next.toISOString().split('T')[0];
    }
    if (schedule.frequency === 'weekly') {
      const dayIndex = daysOfWeek.indexOf(schedule.day_of_week);
      const currentDay = today.getDay();
      const daysToAdd = (dayIndex + 7 - currentDay) % 7 || 7;
      const next = new Date(today);
      next.setDate(today.getDate() + daysToAdd);
      return next.toISOString().split('T')[0];
    }
    if (schedule.frequency === 'biweekly') {
      const next = new Date(today);
      next.setDate(today.getDate() + 14);
      return next.toISOString().split('T')[0];
    }
    if (schedule.frequency === 'monthly') {
      const next = new Date(today);
      next.setMonth(today.getMonth() + 1);
      return next.toISOString().split('T')[0];
    }
    return schedule.start_date;
  };

  const getFrequencyIcon = (frequency) => {
    switch(frequency) {
      case 'daily': return 'fa-calendar-day';
      case 'weekly': return 'fa-calendar-week';
      case 'biweekly': return 'fa-calendar-alt';
      case 'monthly': return 'fa-calendar-month';
      default: return 'fa-calendar';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 sm:px-0">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 text-white">
        <div className="flex justify-between items-center flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">Scheduled Pickups</h1>
            <p className="text-blue-100 text-sm mt-1">Set up recurring waste collection</p>
          </div>
          <button onClick={() => setShowScheduleModal(true)} className="bg-white text-blue-600 px-4 py-2 rounded-lg hover:bg-gray-100 font-medium">
            <i className="fas fa-plus mr-2"></i>New Schedule
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {schedules.map(schedule => (
          <div key={schedule.id} className="bg-white rounded-lg shadow border p-4 hover:shadow-md transition">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <i className={`fas ${getFrequencyIcon(schedule.frequency)} text-blue-600`}></i>
                </div>
                <div>
                  <p className="font-semibold">{schedule.address}</p>
                  <p className="text-sm text-gray-500 capitalize">{schedule.waste_type}</p>
                </div>
              </div>
              <button onClick={() => deleteSchedule(schedule.id)} className="text-red-500 hover:text-red-700">
                <i className="fas fa-trash-alt"></i>
              </button>
            </div>
            
            <div className="mt-3 pt-3 border-t">
              <div className="flex flex-wrap gap-2 mb-2">
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded capitalize">
                  <i className="fas fa-clock mr-1"></i>{schedule.frequency}
                </span>
                {schedule.frequency === 'weekly' && (
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded capitalize">
                    <i className="fas fa-calendar-day mr-1"></i>Every {schedule.day_of_week}
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-600">
                <p><i className="fas fa-calendar-alt mr-2 w-4"></i>Next pickup: <span className="font-medium">{new Date(schedule.next_pickup).toLocaleDateString()}</span></p>
                {schedule.notes && (
                  <p className="mt-1 text-gray-500"><i className="fas fa-note-sticky mr-2 w-4"></i>{schedule.notes}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {schedules.length === 0 && (
        <div className="bg-white rounded-lg border p-12 text-center text-gray-500">
          <i className="fas fa-calendar-alt text-5xl mb-3"></i>
          <p className="text-lg">No scheduled pickups yet</p>
          <p className="text-sm mt-1">Set up recurring waste collection for regular waste</p>
          <button onClick={() => setShowScheduleModal(true)} className="mt-4 text-green-600 hover:underline">
            Create your first schedule →
          </button>
        </div>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Create Schedule</h2>
            <div className="space-y-3">
              <input 
                type="text" 
                placeholder="Address *" 
                value={newSchedule.address} 
                onChange={(e) => setNewSchedule({...newSchedule, address: e.target.value})} 
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
              <select 
                value={newSchedule.waste_type} 
                onChange={(e) => setNewSchedule({...newSchedule, waste_type: e.target.value})} 
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="household">Household Waste</option>
                <option value="recycling">Recycling</option>
                <option value="construction">Construction Debris</option>
              </select>
              <select 
                value={newSchedule.frequency} 
                onChange={(e) => setNewSchedule({...newSchedule, frequency: e.target.value})} 
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {frequencies.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
              {newSchedule.frequency === 'weekly' && (
                <select 
                  value={newSchedule.day_of_week} 
                  onChange={(e) => setNewSchedule({...newSchedule, day_of_week: e.target.value})} 
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {daysOfWeek.map(day => <option key={day} value={day} className="capitalize">{day}</option>)}
                </select>
              )}
              <textarea 
                placeholder="Notes (optional) - e.g., gate code, special instructions" 
                value={newSchedule.notes} 
                onChange={(e) => setNewSchedule({...newSchedule, notes: e.target.value})} 
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" 
                rows="2" 
              />
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowScheduleModal(false)} className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50">
                  Cancel
                </button>
                <button onClick={createSchedule} className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
                  Create Schedule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduledPickups;