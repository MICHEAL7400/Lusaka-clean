import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const questionsPerPage = 6;

  const toggleFAQ = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const faqCategories = [
    { title: "Getting Started", color: "bg-blue-500", hoverColor: "hover:bg-blue-600" },
    { title: "Reporting Waste Issues", color: "bg-orange-500", hoverColor: "hover:bg-orange-600" },
    { title: "For Workers", color: "bg-green-500", hoverColor: "hover:bg-green-600" },
    { title: "For Residents", color: "bg-purple-500", hoverColor: "hover:bg-purple-600" },
    { title: "Technical Support", color: "bg-red-500", hoverColor: "hover:bg-red-600" },
    { title: "Privacy & Security", color: "bg-indigo-500", hoverColor: "hover:bg-indigo-600" }
  ];

  const faqContent = {
    "Getting Started": [
      {
        q: "What is Lusaka Clean?",
        a: "Lusaka Clean is a community-based waste collection notification system that connects residents with council workers to report and track waste collection issues in real-time."
      },
      {
        q: "How do I create an account?",
        a: "Click the 'Register' button on the login page. Fill in your name, email, phone number, and password. Select your role (Resident or Worker) and submit the form."
      },
      {
        q: "Is Lusaka Clean free to use?",
        a: "Yes! Lusaka Clean is completely free for all residents and council workers. We believe in making waste management accessible to everyone."
      }
    ],
    "Reporting Waste Issues": [
      {
        q: "How do I report a waste issue?",
        a: "Log in to your account, click 'New Report', select your location on the map, upload a photo of the waste, describe the issue, and submit. Your report will be sent to the nearest available worker."
      },
      {
        q: "What types of waste can I report?",
        a: "You can report household waste, recycling issues, overflowing bins, construction debris, illegal dumping, hazardous waste, and overflowing waste."
      },
      {
        q: "Do I need to upload a photo?",
        a: "Photos are optional but highly recommended. They help workers identify the issue faster and provide evidence of the problem."
      },
      {
        q: "What happens after I submit a report?",
        a: "Your report will appear on the map. An administrator will assign it to a worker in your zone. You can track the status from 'Pending' → 'Assigned' → 'Collected' → 'Verified'."
      }
    ],
    "For Workers": [
      {
        q: "How do I get assigned to reports?",
        a: "Log in as a worker, go to 'Available Jobs', and you'll see all pending reports in your zone. Click 'Accept' to take a job."
      },
      {
        q: "How do I mark a job as completed?",
        a: "Go to 'My Tasks', select the job you've completed, add any notes, upload a completion photo (recommended), and click 'Mark as Collected'. The resident will be notified to verify."
      },
      {
        q: "Can I see my assigned tasks on a map?",
        a: "Yes! Workers can see all assigned tasks on the interactive map, along with the best route to complete them efficiently."
      },
      {
        q: "How do I share my live location?",
        a: "Go to 'Share Location' in your dashboard to enable live location tracking. Residents will be able to see your location and estimated arrival time."
      }
    ],
    "For Residents": [
      {
        q: "Can I track my report status?",
        a: "Absolutely! Go to 'My Reports' to see all your submitted reports and their current status. You'll also receive notifications when your report status changes."
      },
      {
        q: "How do I know when a worker is coming?",
        a: "Once a worker accepts your report, you can see their live location on the map, along with the estimated arrival time and distance."
      },
      {
        q: "Can I chat with the assigned worker?",
        a: "Yes! Once a worker is assigned to your report, you'll see a 'Chat' button. You can send messages and share additional information directly with the worker."
      },
      {
        q: "What if the worker doesn't show up?",
        a: "You can report an issue by clicking 'Report Issue' on the report details page. Select 'Worker never showed up' and an administrator will reassign your report."
      }
    ],
    "Technical Support": [
      {
        q: "I forgot my password. What do I do?",
        a: "Click 'Forgot Password' on the login page. Enter your email address, and we'll send you a link to reset your password."
      },
      {
        q: "The map isn't loading properly. Why?",
        a: "The map requires an internet connection. Please check your connection and refresh the page. If the problem persists, clear your browser cache or try a different browser."
      },
      {
        q: "I'm not receiving notifications. How do I fix this?",
        a: "Make sure you've allowed browser notifications when prompted. Check your browser settings to ensure notifications are enabled for this site."
      },
      {
        q: "How do I contact support?",
        a: "You can email us at support@lusakaclean.com or call +260 97 684 6612 during business hours (Monday-Friday, 8 AM - 5 PM)."
      }
    ],
    "Privacy & Security": [
      {
        q: "Is my personal information secure?",
        a: "Yes! We use industry-standard encryption to protect your data. Your information is never shared with third parties without your consent."
      },
      {
        q: "Who can see my reports?",
        a: "Your reports are visible to administrators and assigned workers only. Other residents cannot see your specific reports or personal information."
      },
      {
        q: "How is my location data used?",
        a: "Your location data is used only to assign the nearest worker to your report and to help workers navigate to your location. We never share your location with third parties."
      }
    ]
  };

  // Build all questions array
  const allQuestions = [];
  faqCategories.forEach((category) => {
    const questions = faqContent[category.title] || [];
    questions.forEach((q, qIdx) => {
      allQuestions.push({
        ...q,
        category: category.title,
        categoryColor: category.color,
        categoryHover: category.hoverColor,
        questionIndex: qIdx,
        uniqueId: `${category.title}-${qIdx}`
      });
    });
  });

  // Pagination logic
  const totalPages = Math.ceil(allQuestions.length / questionsPerPage);
  const startIndex = (currentPage - 1) * questionsPerPage;
  const paginatedQuestions = allQuestions.slice(startIndex, startIndex + questionsPerPage);

  const goToPage = (page) => {
    setCurrentPage(page);
    setOpenIndex(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Filter questions by category
  const filterByCategory = (categoryTitle) => {
    const firstIndex = allQuestions.findIndex(q => q.category === categoryTitle);
    const page = Math.floor(firstIndex / questionsPerPage) + 1;
    goToPage(page);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-green-600 text-2xl font-bold">?</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-2">
          Frequently Asked Questions
        </h1>
        <p className="text-gray-500 max-w-2xl mx-auto">
          Find answers to common questions about Lusaka Clean. Can't find what you're looking for? Contact our support team.
        </p>
        <div className="mt-4 flex justify-center gap-3">
          <Link to="/contact">
            <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm">
              Contact Support
            </button>
          </Link>
          <Link to="/dashboard">
            <button className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition text-sm">
              Back to Dashboard
            </button>
          </Link>
        </div>
      </div>

      {/* Category Buttons - Horizontal Scroll on Mobile, Colored on Desktop */}
      <div className="mb-8">
        <div className="overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
          <div className="flex gap-2 min-w-max md:justify-center">
            {faqCategories.map((category, idx) => (
              <button
                key={idx}
                onClick={() => filterByCategory(category.title)}
                className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition transform hover:scale-105 ${category.color} ${category.hoverColor} shadow-md`}
              >
                {category.title}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ List with Pagination */}
      <div className="space-y-3">
        {paginatedQuestions.map((item) => (
          <div key={item.uniqueId} className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <button
              onClick={() => toggleFAQ(item.uniqueId)}
              className="w-full px-5 py-4 flex justify-between items-center text-left hover:bg-gray-50 transition"
            >
              <div>
                <span className="text-xs text-green-600 font-medium">{item.category}</span>
                <p className="font-medium text-gray-800 mt-0.5 pr-4">{item.q}</p>
              </div>
              <span className="text-gray-400 text-xl flex-shrink-0 ml-2">
                {openIndex === item.uniqueId ? '−' : '+'}
              </span>
            </button>
            <div className={`overflow-hidden transition-all duration-300 ${openIndex === item.uniqueId ? 'max-h-96' : 'max-h-0'}`}>
              <div className="px-5 pb-4 pt-1">
                <p className="text-gray-600 text-sm leading-relaxed">{item.a}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <>
          <div className="flex justify-center items-center gap-2 mt-8">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-2 border rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition"
            >
              Previous
            </button>
            
            <div className="hidden sm:flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => goToPage(page)}
                  className={`w-8 h-8 rounded-lg text-sm transition ${
                    currentPage === page
                      ? 'bg-green-600 text-white'
                      : 'border text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
            
            {/* Mobile: Show current page / total pages */}
            <div className="sm:hidden text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </div>
            
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-2 border rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition"
            >
              Next
            </button>
          </div>

          {/* Page Info */}
          <div className="text-center mt-4">
            <p className="text-xs text-gray-400">
              Showing {startIndex + 1} - {Math.min(startIndex + questionsPerPage, allQuestions.length)} of {allQuestions.length} questions
            </p>
          </div>
        </>
      )}

      {/* Still Have Questions? */}
      <div className="mt-8 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6 text-center">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Still have questions?</h3>
        <p className="text-gray-600 text-sm mb-4">
          Can't find the answer you're looking for? Please contact our support team.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <a
            href="mailto:support@lusakaclean.com"
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
          >
            Email Support
          </a>
          <a
            href="tel:+260976846612"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
          >
            Call Support
          </a>
          <Link to="/contact">
            <button className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition text-sm">
              Contact Form
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default FAQ;