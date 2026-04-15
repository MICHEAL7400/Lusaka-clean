import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';

const Sidebar = () => {
  const { user } = useSelector((state) => state.auth);
  const location = useLocation();

  const residentLinks = [
    { to: '/dashboard', icon: 'fa-chart-line', label: 'Dashboard' },
    { to: '/report', icon: 'fa-plus-circle', label: 'New Report' },
    { to: '/my-reports', icon: 'fa-flag', label: 'My Reports' },
    { to: '/map', icon: 'fa-map', label: 'View Map' },
    { to: '/profile', icon: 'fa-user', label: 'Profile' },
  ];

  const workerLinks = [
    { to: '/worker', icon: 'fa-tasks', label: 'My Jobs' },
    { to: '/map', icon: 'fa-map', label: 'Job Map' },
    { to: '/profile', icon: 'fa-user', label: 'Profile' },
  ];

  const adminLinks = [
    { to: '/admin', icon: 'fa-chart-line', label: 'Dashboard' },
    { to: '/admin/reports', icon: 'fa-flag', label: 'All Reports' },
    { to: '/admin/users', icon: 'fa-users', label: 'Users' },
    { to: '/map', icon: 'fa-map', label: 'View Map' },
    { to: '/profile', icon: 'fa-user', label: 'Profile' },
  ];

  let links = [];
  if (user?.role === 'admin') links = adminLinks;
  else if (user?.role === 'worker') links = workerLinks;
  else links = residentLinks;

  const isActive = (path) => location.pathname === path;

  return (
    <aside className="w-64 bg-white dark:bg-gray-800 border-r dark:border-gray-700 hidden md:block">
      <div className="p-4">
        <div className="mb-6 pb-4 border-b dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white font-bold">
              {user?.full_name?.[0] || user?.email?.[0] || 'U'}
            </div>
            <div>
              <p className="font-medium dark:text-white">{user?.full_name || 'User'}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user?.role}</p>
            </div>
          </div>
        </div>
        
        <nav className="space-y-1">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition ${
                isActive(link.to)
                  ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <i className={`fas ${link.icon} w-5`}></i>
              <span>{link.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;