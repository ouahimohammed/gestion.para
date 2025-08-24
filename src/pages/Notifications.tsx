import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { collection, query, getDocs, where, orderBy, updateDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatDate } from '../lib/utils';
import { Bell, Check, Eye } from 'lucide-react';

interface Notification {
  id: string;
  user_id: string;
  message: string;
  type: 'new_request' | 'approved' | 'rejected';
  created_at: string;
  seen: boolean;
}

export function Notifications() {
  const { userProfile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userProfile) {
      fetchNotifications();
    }
  }, [userProfile]);

  const fetchNotifications = async () => {
    if (!userProfile?.uid) return;
    
    try {
      const q = query(
        collection(db, 'notifications'),
        where('user_id', '==', userProfile.uid),
        orderBy('created_at', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const notificationsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Notification));

      setNotifications(notificationsData);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        seen: true,
      });
      
      setNotifications(notifications.map(notif => 
        notif.id === notificationId 
          ? { ...notif, seen: true }
          : notif
      ));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(notif => !notif.seen);
      
      await Promise.all(
        unreadNotifications.map(notif => 
          updateDoc(doc(db, 'notifications', notif.id), { seen: true })
        )
      );
      
      setNotifications(notifications.map(notif => ({ ...notif, seen: true })));
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_request':
        return <Bell className="h-5 w-5 text-blue-600" />;
      case 'approved':
        return <Check className="h-5 w-5 text-green-600" />;
      case 'rejected':
        return <Eye className="h-5 w-5 text-red-600" />;
      default:
        return <Bell className="h-5 w-5 text-gray-600" />;
    }
  };

  const getNotificationBadge = (type: string) => {
    switch (type) {
      case 'new_request':
        return <Badge variant="default">Nouvelle demande</Badge>;
      case 'approved':
        return <Badge variant="success">Approuvé</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejeté</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  const unreadCount = notifications.filter(notif => !notif.seen).length;

  if (loading) {
    return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
        </div>
    );
  }

  return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
            {unreadCount > 0 && (
              <Badge variant="destructive">{unreadCount} non lue{unreadCount > 1 ? 's' : ''}</Badge>
            )}
          </div>
          
          {unreadCount > 0 && (
            <Button variant="outline" onClick={markAllAsRead}>
              Tout marquer comme lu
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Toutes les notifications ({notifications.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {notifications.length > 0 ? (
              <div className="space-y-4">
                {notifications.map((notification) => (
                  <div 
                    key={notification.id} 
                    className={`p-4 border rounded-lg transition-colors ${
                      notification.seen 
                        ? 'bg-white hover:bg-gray-50' 
                        : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <div className="mt-1">
                          {getNotificationIcon(notification.type)}
                        </div>
                        
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center space-x-2">
                            {getNotificationBadge(notification.type)}
                            {!notification.seen && (
                              <Badge variant="destructive" className="text-xs">Nouveau</Badge>
                            )}
                          </div>
                          
                          <p className="text-gray-900">{notification.message}</p>
                          
                          <p className="text-sm text-gray-500">
                            {formatDate(notification.created_at)}
                          </p>
                        </div>
                      </div>
                      
                      {!notification.seen && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => markAsRead(notification.id)}
                          className="ml-2"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Bell className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium mb-2">Aucune notification</h3>
                <p>Vous n'avez pas encore de notifications.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
  );
}