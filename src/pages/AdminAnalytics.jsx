import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';

const AdminAnalytics = () => {
  const [weeklyData, setWeeklyData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [typeData, setTypeData] = useState([]);
  const [statusData, setStatusData] = useState([]);
  const [workerPerformance, setWorkerPerformance] = useState([]);
  const [responseTimeData, setResponseTimeData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('weekly');

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const { data: reports } = await supabase
        .from('waste_reports')
        .select('*');
      
      const { data: workers } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'worker');
      
      if (reports) {
        // Weekly data
        const last7Days = {};
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toLocaleDateString();
          last7Days[dateStr] = 0;
        }
        
        // Monthly data
        const last4Weeks = {};
        for (let i = 3; i >= 0; i--) {
          const weekStart = new Date();
          weekStart.setDate(weekStart.getDate() - (i * 7));
          const weekLabel = `Week ${4 - i}`;
          last4Weeks[weekLabel] = 0;
        }
        
        reports.forEach(report => {
          const dateStr = new Date(report.created_at).toLocaleDateString();
          if (last7Days[dateStr] !== undefined) {
            last7Days[dateStr]++;
          }
          
          const reportDate = new Date(report.created_at);
          const weeksAgo = Math.floor((Date.now() - reportDate) / (7 * 24 * 60 * 60 * 1000));
          if (weeksAgo >= 0 && weeksAgo < 4) {
            const weekLabel = `Week ${4 - weeksAgo}`;
            last4Weeks[weekLabel]++;
          }
        });
        
        setWeeklyData(Object.entries(last7Days).map(([date, count]) => ({ date, count })));
        setMonthlyData(Object.entries(last4Weeks).map(([week, count]) => ({ week, count })));
        
        // Waste type distribution
        const types = {};
        reports.forEach(r => { types[r.waste_type] = (types[r.waste_type] || 0) + 1; });
        setTypeData(Object.entries(types).map(([name, value]) => ({ name, value })));
        
        // Status distribution
        const statuses = { pending: 0, assigned: 0, collected: 0, ready_for_rating: 0, verified: 0 };
        reports.forEach(r => { if (statuses[r.status] !== undefined) statuses[r.status]++; });
        setStatusData(Object.entries(statuses).map(([name, value]) => ({ name, value })));
        
        // Worker performance
        if (workers) {
          const performance = workers.map(worker => {
            const workerReports = reports.filter(r => r.assigned_worker_id === worker.id);
            const completed = workerReports.filter(r => r.status === 'verified');
            const avgRating = completed.reduce((sum, r) => sum + (r.rating || 0), 0) / (completed.length || 1);
            return {
              name: worker.full_name || worker.email?.split('@')[0] || 'Unknown',
              completed: completed.length,
              rating: Math.round(avgRating * 10) / 10,
              reports: workerReports.length
            };
          }).sort((a, b) => b.completed - a.completed).slice(0, 5);
          setWorkerPerformance(performance);
        }
        
        // Response time data
        const responseTimes = reports
          .filter(r => r.assigned_at && r.collected_at)
          .map(r => ({
            id: r.id.slice(0, 6),
            hours: (new Date(r.collected_at) - new Date(r.assigned_at)) / (1000 * 60 * 60)
          }))
          .slice(0, 10);
        setResponseTimeData(responseTimes);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#FFC107', '#17A2B8', '#6F42C1', '#28A745', '#DC3545', '#FD7E14', '#20C997', '#007BFF'];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2">
        <button
          onClick={() => setTimeframe('weekly')}
          className={`px-3 py-1 rounded-lg text-sm ${timeframe === 'weekly' ? 'bg-green-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
        >
          Weekly
        </button>
        <button
          onClick={() => setTimeframe('monthly')}
          className={`px-3 py-1 rounded-lg text-sm ${timeframe === 'monthly' ? 'bg-green-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
        >
          Monthly
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Report Volume Chart */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-4 dark:text-white">Report Volume</h3>
          <ResponsiveContainer width="100%" height={300}>
            {timeframe === 'weekly' ? (
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px' }} />
                <Bar dataKey="count" fill="#28A745" />
              </BarChart>
            ) : (
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px' }} />
                <Bar dataKey="count" fill="#28A745" />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
        
        {/* Waste Type Distribution */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-4 dark:text-white">Waste Type Distribution</h3>
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
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-4 dark:text-white">Report Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} outerRadius={80} dataKey="value">
                {statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        {/* Worker Performance */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-4 dark:text-white">Top Worker Performance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={workerPerformance} layout="vertical" margin={{ left: 80 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="completed" fill="#28A745" name="Completed Jobs" />
              <Bar dataKey="rating" fill="#FFC107" name="Avg Rating (⭐)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* Response Time Trend */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <h3 className="font-semibold mb-4 dark:text-white">Response Time Trend (Hours)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={responseTimeData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="id" />
            <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
            <Tooltip />
            <Line type="monotone" dataKey="hours" stroke="#FFC107" strokeWidth={2} dot={{ r: 4 }} />
            <Area type="monotone" dataKey="hours" fill="#FFC107" fillOpacity={0.1} />
          </LineChart>
        </ResponsiveContainer>
        <p className="text-xs text-gray-500 mt-2 text-center">* Based on time between assignment and collection</p>
      </div>
      
      {/* Key Metrics Summary */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <h3 className="font-semibold mb-4 dark:text-white">Key Metrics Summary</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{weeklyData.reduce((sum, d) => sum + d.count, 0)}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Reports (7 days)</p>
          </div>
          <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{statusData.find(s => s.name === 'verified')?.value || 0}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Resolved Reports</p>
          </div>
          <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded">
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{statusData.find(s => s.name === 'pending')?.value || 0}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Pending Reports</p>
          </div>
          <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded">
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{typeData.length}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Waste Types</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAnalytics;