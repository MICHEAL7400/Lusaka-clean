// src/pages/AdminAnalytics.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const AdminAnalytics = () => {
  const [weeklyData, setWeeklyData] = useState([]);
  const [typeData, setTypeData] = useState([]);
  const [statusData, setStatusData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const { data: reports } = await supabase
        .from('waste_reports')
        .select('*');
      
      if (reports) {
        // Weekly data
        const last7Days = {};
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toLocaleDateString();
          last7Days[dateStr] = 0;
        }
        
        reports.forEach(report => {
          const dateStr = new Date(report.created_at).toLocaleDateString();
          if (last7Days[dateStr] !== undefined) {
            last7Days[dateStr]++;
          }
        });
        
        setWeeklyData(Object.entries(last7Days).map(([date, count]) => ({ date, count })));
        
        // Waste type distribution
        const types = {};
        reports.forEach(r => { types[r.waste_type] = (types[r.waste_type] || 0) + 1; });
        setTypeData(Object.entries(types).map(([name, value]) => ({ name, value })));
        
        // Status distribution
        const statuses = { pending: 0, assigned: 0, collected: 0, verified: 0 };
        reports.forEach(r => { statuses[r.status]++; });
        setStatusData(Object.entries(statuses).map(([name, value]) => ({ name, value })));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#FFC107', '#17A2B8', '#6F42C1', '#28A745'];

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Weekly Reports Chart */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-4">Weekly Report Volume</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#28A745" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Waste Type Distribution */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-4">Waste Type Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={typeData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} outerRadius={80} dataKey="value">
                {typeData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        {/* Status Distribution */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-4">Report Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} outerRadius={80} dataKey="value">
                {statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        {/* Response Time Trend */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-4">Response Time Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#FFC107" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="font-semibold mb-4">Key Metrics</h3>
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center p-3 bg-green-50 rounded">
            <p className="text-2xl font-bold text-green-600">{weeklyData.reduce((sum, d) => sum + d.count, 0)}</p>
            <p className="text-sm text-gray-600">Total Reports (7 days)</p>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded">
            <p className="text-2xl font-bold text-blue-600">{statusData.find(s => s.name === 'verified')?.value || 0}</p>
            <p className="text-sm text-gray-600">Resolved Reports</p>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded">
            <p className="text-2xl font-bold text-yellow-600">{statusData.find(s => s.name === 'pending')?.value || 0}</p>
            <p className="text-sm text-gray-600">Pending Reports</p>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded">
            <p className="text-2xl font-bold text-purple-600">{typeData.length}</p>
            <p className="text-sm text-gray-600">Waste Types</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAnalytics;