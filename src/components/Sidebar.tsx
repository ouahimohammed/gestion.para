import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/Button';
import { 
  Home, 
  Users, 
  Calendar, 
  FileText, 
  BarChart3, 
  LogOut,
  Building2,
  Bell,
  Menu,
  X,
  User,
  ClipboardList,
  TrendingUp,
  Clock,
  UserCog,
  FileCheck
} from 'lucide-react';

export function Sidebar() {
  const { userProfile, signOut } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  // Détecter si l'écran est mobile
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      
      // Fermer le sidebar quand on passe en mode desktop
      if (!mobile && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen]);

  const navigation = [
    { name: 'Tableau de bord', href: '/dashboard', icon: Home, roles: ['super_admin', 'responsable', 'employe'] },
    { name: 'Employés', href: '/employees', icon: Users, roles: ['super_admin', 'responsable'] },
    { name: 'Congés', href: '/leaves', icon: Calendar, roles: ['super_admin', 'responsable'] },
    { name: 'Demande de congé', href: '/request-leave', icon: ClipboardList, roles: ['employe'] },
    // { name: 'Planning', href: '/calendar', icon: Calendar, roles: ['super_admin', 'responsable'] },  
    { name: 'Profil', href: '/profile', icon: User, roles: [ 'responsable','employe'] },   
    { name: 'Rapports', href: '/reports', icon: BarChart3, roles: ['super_admin', 'responsable'] },
    { name: 'Absences', href: '/absences', icon: Clock, roles: ['super_admin', 'responsable'] },
    { name: 'Entreprises', href: '/companies', icon: Building2, roles: ['super_admin'] },
    { name: 'Notifications', href: '/notifications', icon: Bell, roles: ['super_admin', 'responsable', 'employe'] },
    { name: 'Responsables', href: '/responsables', icon: UserCog, roles: [ 'super_admin'] },
    { name: 'Profil', href: '/profiladmin', icon: User, roles: [ 'super_admin' ] },   
    { name: 'Justification', href: '/justification', icon: FileCheck, roles: [ 'employe'] },
    { name: 'cuisine', href: '/kitchen', icon: Clock, roles: ['super_admin', 'responsable'] },

  ];

  const filteredNavigation = navigation.filter(item => 
    item.roles.includes(userProfile?.role || '')
  );

  // Fermer le sidebar après un clic sur mobile
  const handleNavClick = () => {
    if (isMobile) {
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* Overlay pour mobile */}
      {isOpen && isMobile && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      {/* Bouton hamburger pour mobile */}
      <button
        className={`fixed top-4 left-4 z-50 lg:hidden p-2 rounded-md bg-blue-600 text-white shadow-md transition-all ${
          isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        onClick={() => setIsOpen(true)}
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* Sidebar */}
      <div className={`
        fixed lg:relative top-0 left-0 h-full z-50 bg-white shadow-lg transition-all duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        w-64
      `}>
        {/* En-tête avec bouton fermer pour mobile */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Gestion RH</h2>
            <p className="text-sm text-gray-600 mt-1">{userProfile?.nom}</p>
            <p className="text-xs text-gray-500 capitalize">{userProfile?.role?.replace('_', ' ')}</p>
          </div>
          <button 
            className="lg:hidden p-1 rounded-md hover:bg-gray-100"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        
        {/* Navigation */}
        <nav className="mt-6 flex-1 overflow-y-auto">
          <ul className="space-y-1 px-4">
            {filteredNavigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    onClick={handleNavClick}
                    className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-l-4 border-transparent'
                    }`}
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        
        {/* Bouton de déconnexion */}
        <div className="p-4 border-t border-gray-100">
          <Button 
            variant="ghost" 
            onClick={signOut}
            className="w-full justify-start text-gray-600 hover:text-red-600 hover:bg-red-50"
          >
            <LogOut className="mr-3 h-4 w-4" />
            Déconnexion
          </Button>
        </div>
      </div>
    </>
  );
}
