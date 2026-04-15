import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const EditReport = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    address: '',
    waste_type: 'household',
    description: ''
  });

  useEffect(() => {
    loadReport();
  }, [id]);

  const loadReport = async () => {
    try {
      const { data, error } = await supabase
        .from('waste_reports')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      setFormData({
        address: data.address || '',
        waste_type: data.waste_type || 'household',
        description: data.description || ''
      });
    } catch (err) {
      console.error(err);
      toast.error('Report not found');
      navigate('/my-reports');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const { error } = await supabase
        .from('waste_reports')
        .update({
          address: formData.address,
          waste_type: formData.waste_type,
          description: formData.description,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success('Report updated successfully');
      navigate('/my-reports');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update report');
    } finally {
      setSubmitting(false);
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
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Edit Report</h1>
      
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Address</label>
          <input
            type="text"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Waste Type</label>
          <select
            value={formData.waste_type}
            onChange={(e) => setFormData({ ...formData, waste_type: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg"
          >
            <option value="household">Household Waste</option>
            <option value="construction">Construction Debris</option>
            <option value="overflowing">Overflowing Bin</option>
            <option value="illegal">Illegal Dumping</option>
            <option value="hazardous">Hazardous Waste</option>
            <option value="other">Other</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows="4"
            className="w-full px-3 py-2 border rounded-lg resize-none"
          />
        </div>
        
        <div className="flex gap-3">
          <button type="button" onClick={() => navigate('/my-reports')} className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit" disabled={submitting} className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700">
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditReport;