import React, { useState } from 'react';
import { Bell, AlertTriangle, Calendar } from 'lucide-react';

const NotificationBell = ({ notifications }) => {
  const [showNotifications, setShowNotifications] = useState(false);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'insurance':
        return '🛡️';
      case 'oil':
        return '🔧';
      case 'technical':
        return '📋';
      default:
        return '⚠️';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'border-l-red-500 bg-red-50';
      case 'medium':
        return 'border-l-orange-500 bg-orange-50';
      default:
        return 'border-l-blue-500 bg-blue-50';
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all duration-200"
      >
        <Bell size={24} />
        {notifications.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-full w-6 h-6 text-xs flex items-center justify-center font-bold shadow-lg animate-pulse">
            {notifications.length}
          </span>
        )}
      </button>
      
      {showNotifications && (
        <div className="absolute right-0 mt-3 w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Bell size={18} />
              Notifications ({notifications.length})
            </h3>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <Bell className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                <p className="font-medium">Aucune notification</p>
                <p className="text-sm">Tout est à jour !</p>
              </div>
            ) : (
              notifications.map((notification, index) => (
                <div 
                  key={index} 
                  className={`p-4 border-l-4 border-b border-gray-100 hover:bg-gray-50 transition-all duration-200 ${getPriorityColor(notification.priority)}`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 leading-relaxed">
                        {notification.message}
                      </p>
                      <div className="mt-2 flex items-center gap-2 text-xs text-gray-600">
                        {notification.date && (
                          <div className="flex items-center gap-1">
                            <Calendar size={12} />
                            <span>{formatDate(notification.date)}</span>
                          </div>
                        )}
                        {notification.remainingKm !== undefined && (
                          <div className="flex items-center gap-1">
                            <span className="w-2 h-2 bg-orange-400 rounded-full"></span>
                            <span>{notification.remainingKm} km restants</span>
                          </div>
                        )}
                        {notification.priority === 'high' && (
                          <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-medium">
                            Urgent
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          
          {notifications.length > 0 && (
            <div className="bg-gray-50 p-3 text-center">
              <button 
                onClick={() => setShowNotifications(false)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Fermer les notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
