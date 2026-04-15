import React from 'react';

const About = () => {
  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-6">About This Project</h1>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-xl font-semibold mb-3">Why I Built This</h2>
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          I grew up in Matero, Lusaka, and I remember seeing bins overflowing for days before collection. 
          Sometimes people would dump waste illegally because they didn't know when collection would happen.
        </p>
        <p className="text-gray-700 dark:text-gray-300">
          When I started studying Computer Science at Cavendish University, I knew I wanted to build 
          something useful for my community. This app connects residents with waste collectors so 
          problems get reported and addressed faster.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-xl font-semibold mb-3">What I've Learned</h2>
        <ul className="space-y-2 text-gray-700 dark:text-gray-300">
          <li>• Talking to actual users changed my design decisions. Residents wanted simple forms, not fancy features.</li>
          <li>• Workers preferred seeing reports on a map rather than a list.</li>
          <li>• The biggest challenge was getting the location picker to work correctly on phones.</li>
          <li>• People in my community gave me feedback that helped improve the app.</li>
        </ul>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-xl font-semibold mb-3">Features</h2>
        <ul className="space-y-2 text-gray-700 dark:text-gray-300">
          <li>• 📍 Report waste with GPS location and photos</li>
          <li>• 🔔 Real-time notifications when workers are assigned</li>
          <li>• 🗺️ Live worker tracking on map</li>
          <li>• ⭐ Rate workers after job completion</li>
          <li>• 📱 Mobile-friendly responsive design</li>
          <li>• 👥 Role-based access (Resident, Worker, Admin)</li>
        </ul>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-xl font-semibold mb-3">What's Next</h2>
        <ul className="space-y-2 text-gray-700 dark:text-gray-300">
          <li>• <span className="font-medium">SMS notifications</span> - For people without smartphones</li>
          <li>• <span className="font-medium">Mobile app</span> - Easier for collectors to use on the road</li>
          <li>• <span className="font-medium">More zones</span> - Expanding to other Lusaka compounds</li>
          <li>• <span className="font-medium">Recycling tips</span> - Helping residents separate waste</li>
        </ul>
      </div>

      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-3">Want to Help?</h2>
        <p className="text-gray-700 dark:text-gray-300 mb-3">
          This project is open for feedback. If you have suggestions or found a bug, please reach out.
        </p>
        <p className="text-gray-600 dark:text-gray-400">
          📧 mm104175@students.cavendish.co.zm<br />
          📱 0976 846612
        </p>
      </div>
    </div>
  );
};

export default About;