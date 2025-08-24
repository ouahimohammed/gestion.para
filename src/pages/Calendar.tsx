import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select';
import Calendar from 'react-calendar';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { format, isWithinInterval, startOfDay, endOfDay, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import 'react-calendar/dist/Calendar.css';
import { LeaveService } from './leaveService';
import { Skeleton } from '../components/ui/Skeleton';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface Leave {
  id: string;
  employe_id: string;
  employe_nom?: string;
  entreprise: string;
  type: string;
  date_debut: string;
  date_fin: string;
  statut: string;
}

interface FilterOptions {
  type: string;
  entreprise: string;
  statut: string;
}

const companyColors = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-indigo-500',
];

const leaveTypes = ['annuel', 'maladie', 'maternité', 'paternité', 'exceptionnel', 'sans-solde'];

export function CalendarPage() {
  const { userProfile } = useAuth();
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [filteredLeaves, setFilteredLeaves] = useState<Leave[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedDateLeaves, setSelectedDateLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [companies, setCompanies] = useState<string[]>([]);
  const [filters, setFilters] = useState<FilterOptions>({
    type: 'tous',
    entreprise: 'tous',
    statut: 'accepte'
  });
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');

  useEffect(() => {
    if (userProfile) {
      fetchLeaves();
    }
  }, [userProfile]);

  useEffect(() => {
    filterLeaves();
  }, [leaves, filters]);

  useEffect(() => {
    updateSelectedDateLeaves();
  }, [selectedDate, filteredLeaves]);

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const leavesData = await LeaveService.fetchLeaves(userProfile);
      
      // Enrichir avec les noms des employés si possible
      const enrichedLeaves = await Promise.all(
        leavesData.map(async (leave) => {
          try {
            const employeeName = await LeaveService.getEmployeeName(leave.employe_id);
            return { ...leave, employe_nom: employeeName };
          } catch {
            return leave;
          }
        })
      );
      
      setLeaves(enrichedLeaves);

      // Extraire les entreprises uniques pour le code couleur
      const uniqueCompanies = [...new Set(leavesData.map(leave => leave.entreprise))];
      setCompanies(uniqueCompanies);
    } catch (error) {
      console.error('Error fetching leaves:', error);
      setError("Impossible de charger les congés. Veuillez réessayer.");
      toast.error("Erreur lors du chargement des congés");
    } finally {
      setLoading(false);
    }
  };

  const filterLeaves = useCallback(() => {
    let result = [...leaves];
    
    if (filters.type !== 'tous') {
      result = result.filter(leave => leave.type === filters.type);
    }
    
    if (filters.entreprise !== 'tous') {
      result = result.filter(leave => leave.entreprise === filters.entreprise);
    }
    
    if (filters.statut !== 'tous') {
      result = result.filter(leave => leave.statut === filters.statut);
    }
    
    setFilteredLeaves(result);
  }, [leaves, filters]);

  const updateSelectedDateLeaves = useCallback(() => {
    const dayLeaves = filteredLeaves.filter(leave => {
      const startDate = parseISO(leave.date_debut);
      const endDate = parseISO(leave.date_fin);
      return isWithinInterval(selectedDate, {
        start: startOfDay(startDate),
        end: endOfDay(endDate)
      });
    });
    
    setSelectedDateLeaves(dayLeaves);
  }, [selectedDate, filteredLeaves]);

  const isDateInLeave = useCallback((date: Date) => {
    return filteredLeaves.some(leave => {
      const startDate = parseISO(leave.date_debut);
      const endDate = parseISO(leave.date_fin);
      return isWithinInterval(date, {
        start: startOfDay(startDate),
        end: endOfDay(endDate)
      }) && leave.statut === 'accepte';
    });
  }, [filteredLeaves]);

  const getCompanyColor = useCallback((entreprise: string) => {
    const index = companies.indexOf(entreprise);
    return companyColors[index % companyColors.length];
  }, [companies]);

  const getStatusBadge = useCallback((status: string) => {
    switch (status) {
      case 'en_attente':
        return <Badge variant="warning">En attente</Badge>;
      case 'accepte':
        return <Badge variant="success">Accepté</Badge>;
      case 'refuse':
        return <Badge variant="destructive">Refusé</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  }, []);

  const handleFilterChange = (key: keyof FilterOptions, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const exportToPDF = () => {
    toast.info("Fonctionnalité d'export PDF à implémenter");
  };

  const exportToExcel = () => {
    toast.info("Fonctionnalité d'export Excel à implémenter");
  };

  const getTileContent = useCallback(({ date }: { date: Date }) => {
    const dateLeaves = filteredLeaves.filter(leave => {
      const startDate = parseISO(leave.date_debut);
      const endDate = parseISO(leave.date_fin);
      return isWithinInterval(date, {
        start: startOfDay(startDate),
        end: endOfDay(endDate)
      }) && leave.statut === 'accepte';
    });

    if (dateLeaves.length === 0) return null;

    return (
      <div className="flex justify-center mt-1">
        {companies.slice(0, 3).map(company => {
          const hasCompanyLeave = dateLeaves.some(leave => leave.entreprise === company);
          if (!hasCompanyLeave) return null;
          
          return (
            <div
              key={company}
              className={`w-2 h-2 rounded-full mx-0.5 ${getCompanyColor(company)}`}
              title={company}
            />
          );
        })}
        {dateLeaves.length > 3 && (
          <span className="text-xs">+{dateLeaves.length - 3}</span>
        )}
      </div>
    );
  }, [filteredLeaves, companies, getCompanyColor]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-40" />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-40" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-64 w-full" />
                <div className="mt-6">
                  <Skeleton className="h-5 w-48 mb-2" />
                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="flex items-center space-x-1">
                        <Skeleton className="w-3 h-3 rounded-full" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div>
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-56" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ToastContainer position="top-right" autoClose={3000} />
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-900">Planning des Congés</h1>
        
        <div className="flex flex-wrap gap-2">
   
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Calendrier</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="calendar-container">
                <Calendar
                  onChange={(date) => setSelectedDate(date as Date)}
                  value={selectedDate}
                  tileClassName={({ date }) => {
                    return isDateInLeave(date) ? 'has-leave' : '';
                  }}
                  tileContent={getTileContent}
                  className="react-calendar"
                  view={viewMode}
                />
              </div>
              
              {/* Legend */}
              {userProfile?.role === 'super_admin' && companies.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Légende des entreprises:</h4>
                  <div className="flex flex-wrap gap-2">
                    {companies.map((company, index) => (
                      <div key={company} className="flex items-center space-x-1">
                        <div className={`w-3 h-3 rounded-full ${getCompanyColor(company)}`}></div>
                        <span className="text-sm text-gray-600">{company}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Selected Date Details */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>
                {format(selectedDate, "EEEE d MMMM yyyy", { locale: fr })}
              </CardTitle>
              <p className="text-sm text-gray-500">
                {selectedDateLeaves.length} congé(s) prévu(s)
              </p>
            </CardHeader>
            <CardContent>
              {selectedDateLeaves.length > 0 ? (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {selectedDateLeaves.map((leave) => (
                    <div key={leave.id} className="p-3 border rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        {userProfile?.role === 'super_admin' && (
                          <div className={`w-3 h-3 rounded-full ${getCompanyColor(leave.entreprise)}`}></div>
                        )}
                        <Badge variant="default">{leave.type}</Badge>
                        {getStatusBadge(leave.statut)}
                      </div>
                      
                      <div className="text-sm space-y-1">
                        {userProfile?.role !== 'employe' && (
                          <div className="text-gray-600">
                            <strong>Entreprise:</strong> {leave.entreprise}
                          </div>
                        )}
                        {leave.employe_nom && (
                          <div className="text-gray-600">
                            <strong>Employé:</strong> {leave.employe_nom}
                          </div>
                        )}
                        <div className="text-gray-600">
                          <strong>Période:</strong> {format(parseISO(leave.date_debut), "dd/MM/yyyy")} - {format(parseISO(leave.date_fin), "dd/MM/yyyy")}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Aucun congé prévu pour cette date
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <style jsx>{`
        .calendar-container .react-calendar {
          width: 100%;
          border: none;
          font-family: inherit;
        }
        
        .calendar-container .react-calendar .has-leave {
          background-color: #3b82f6;
          color: white;
        }
        
        .calendar-container .react-calendar .has-leave:hover {
          background-color: #2563eb;
        }
        
        .calendar-container .react-calendar__tile--active {
          background-color: #1d4ed8;
          color: white;
        }
        
        @media (max-width: 768px) {
          .calendar-container .react-calendar {
            font-size: 0.8rem;
          }
        }
      `}</style>
    </div>
  );
}