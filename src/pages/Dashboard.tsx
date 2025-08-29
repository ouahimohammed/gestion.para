
import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, getDocs, where, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  Users, 
  FileText, 
  Calendar, 
  Building2, 
  Clock, 
  CheckCircle, 
  XCircle,
  TrendingUp,
  AlertCircle,
  Plus,
  Eye,
  Filter,
  Download,
  Sun,
  Moon,
  BarChart3,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';

interface DashboardStats {
  totalEmployees: number;
  totalLeaves: number;
  pendingLeaves: number;
  approvedLeaves: number;
  rejectedLeaves: number;
  totalCompanies: number;
  leaveBalance?: number;
  thisMonthLeaves?: number;
  lastMonthLeaves?: number;
}
interface Leave {
  id: string;
  employe_id: string;
  nom_employe: string;
  prenom_employe: string;
  entreprise: string;
  type: string;
  date_debut: string;
  date_fin: string;
  statut: 'en_attente' | 'accepte' | 'refuse';
  motif: string;
  justificatif?: string;
  created_at: string;
  duree?: number;
}

export function Dashboard() {
  const { userProfile } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    totalLeaves: 0,
    pendingLeaves: 0,
    approvedLeaves: 0,
    rejectedLeaves: 0,
    totalCompanies: 0,
  });
  const [recentLeaves, setRecentLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        if (userProfile?.role === 'super_admin') {
          await fetchSuperAdminData();
        } else if (userProfile?.role === 'responsable') {
          await fetchManagerData();
        } else {
          await fetchEmployeeData();
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (userProfile) {
      fetchDashboardData();
    }
  }, [userProfile]);

  const fetchSuperAdminData = async () => {
    // Fetch employees
    const employeesQuery = query(collection(db, 'employes'));
    const employeesSnapshot = await getDocs(employeesQuery);
    
    // Fetch leaves
    const leavesQuery = query(collection(db, 'conges'), orderBy('date_debut', 'desc'));
    const leavesSnapshot = await getDocs(leavesQuery);
    
    // Fetch companies
    const companiesQuery = query(collection(db, 'entreprises'));
    const companiesSnapshot = await getDocs(companiesQuery);
    
    const leaves = leavesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Leave[];
    
    // Calculate monthly stats
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const thisMonthLeaves = leaves.filter(leave => {
      const leaveDate = new Date(leave.date_debut);
      return leaveDate.getMonth() === currentMonth && leaveDate.getFullYear() === currentYear;
    }).length;
    
    const lastMonthLeaves = leaves.filter(leave => {
      const leaveDate = new Date(leave.date_debut);
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      return leaveDate.getMonth() === lastMonth && leaveDate.getFullYear() === lastMonthYear;
    }).length;

    setStats({
      totalEmployees: employeesSnapshot.size,
      totalLeaves: leavesSnapshot.size,
      pendingLeaves: leaves.filter(l => l.statut === 'en_attente').length,
      approvedLeaves: leaves.filter(l => l.statut === 'accepte').length,
      rejectedLeaves: leaves.filter(l => l.statut === 'refuse').length,
      totalCompanies: companiesSnapshot.size,
      thisMonthLeaves,
      lastMonthLeaves,
    });
    
    setRecentLeaves(leaves.slice(0, 8));
    
    // Prepare chart data
    const chartData = [
      { name: 'En attente', value: leaves.filter(l => l.statut === 'en_attente').length, color: '#f59e0b' },
      { name: 'Accepté', value: leaves.filter(l => l.statut === 'accepte').length, color: '#10b981' },
      { name: 'Refusé', value: leaves.filter(l => l.statut === 'refuse').length, color: '#ef4444' },
    ];
    setChartData(chartData);
  };

  const fetchManagerData = async () => {
    if (!userProfile?.entreprise) return;
    
    // Fetch employees from manager's company
    const employeesQuery = query(
      collection(db, 'employes'),
      where('entreprise', '==', userProfile.entreprise)
    );
    const employeesSnapshot = await getDocs(employeesQuery);
    
    // Fetch leaves from manager's company
    const leavesQuery = query(
      collection(db, 'conges'),
      where('entreprise', '==', userProfile.entreprise),
      orderBy('date_debut', 'desc')
    );
    const leavesSnapshot = await getDocs(leavesQuery);
    
    const leaves = leavesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Leave[];
    
    // Calculate monthly stats
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const thisMonthLeaves = leaves.filter(leave => {
      const leaveDate = new Date(leave.date_debut);
      return leaveDate.getMonth() === currentMonth && leaveDate.getFullYear() === currentYear;
    }).length;

    setStats({
      totalEmployees: employeesSnapshot.size,
      totalLeaves: leavesSnapshot.size,
      pendingLeaves: leaves.filter(l => l.statut === 'en_attente').length,
      approvedLeaves: leaves.filter(l => l.statut === 'accepte').length,
      rejectedLeaves: leaves.filter(l => l.statut === 'refuse').length,
      totalCompanies: 1,
      thisMonthLeaves,
    });
    
    setRecentLeaves(leaves.slice(0, 8));
    
    // Prepare chart data
    const chartData = [
      { name: 'En attente', value: leaves.filter(l => l.statut === 'en_attente').length, color: '#f59e0b' },
      { name: 'Accepté', value: leaves.filter(l => l.statut === 'accepte').length, color: '#10b981' },
      { name: 'Refusé', value: leaves.filter(l => l.statut === 'refuse').length, color: '#ef4444' },
    ];
    setChartData(chartData);
  };

  const fetchEmployeeData = async () => {
    if (!userProfile?.uid) return;
    
    // Fetch employee's leaves
    const leavesQuery = query(
      collection(db, 'conges'),
      where('employe_id', '==', userProfile.uid),
      orderBy('date_debut', 'desc')
    );
    const leavesSnapshot = await getDocs(leavesQuery);
    
    const leaves = leavesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Leave[];
    
    // Fetch employee profile for leave balance
    let employeeProfile = null;
    try {
      const employeesQuery = query(collection(db, 'employes'));
      const employeesSnapshot = await getDocs(employeesQuery);
      employeesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.email === userProfile.email || doc.id === userProfile.uid) {
          employeeProfile = { id: doc.id, ...data };
        }
      });
    } catch (error) {
      console.error('Error fetching employee profile:', error);
    }

    // Calculate monthly stats
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const thisMonthLeaves = leaves.filter(leave => {
      const leaveDate = new Date(leave.date_debut);
      return leaveDate.getMonth() === currentMonth && leaveDate.getFullYear() === currentYear;
    }).length;
    
    setStats({
      totalEmployees: 0,
      totalLeaves: leavesSnapshot.size,
      pendingLeaves: leaves.filter(l => l.statut === 'en_attente').length,
      approvedLeaves: leaves.filter(l => l.statut === 'accepte').length,
      rejectedLeaves: leaves.filter(l => l.statut === 'refuse').length,
      totalCompanies: 0,
      leaveBalance: employeeProfile?.solde_conge || 0,
      thisMonthLeaves,
    });
    
    setRecentLeaves(leaves.slice(0, 6));
    
    // Prepare chart data for employee
    const chartData = [
      { name: 'En attente', value: leaves.filter(l => l.statut === 'en_attente').length, color: '#f59e0b' },
      { name: 'Accepté', value: leaves.filter(l => l.statut === 'accepte').length, color: '#10b981' },
      { name: 'Refusé', value: leaves.filter(l => l.statut === 'refuse').length, color: '#ef4444' },
    ];
    setChartData(chartData);
  };

  const getWelcomeMessage = () => {
    const hour = new Date().getHours();
    let greeting = 'Bonjour';
    if (hour >= 18) greeting = 'Bonsoir';
    else if (hour >= 12) greeting = 'Bon après-midi';
    
    return `${greeting}, ${userProfile?.nom || userProfile?.email?.split('@')[0] || 'Utilisateur'}`;
  };

  const getRoleDisplayName = (role: string) => {
    const roleNames = {
      'super_admin': 'Super Administrateur',
      'responsable': 'Responsable',
      'employe': 'Employé'
    };
    return roleNames[role as keyof typeof roleNames] || role;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getStatusBadge = (statut: string) => {
    const statusConfig = {
      'en_attente': {
        bg: 'bg-amber-100',
        text: 'text-amber-800',
        label: 'En attente'
      },
      'accepte': {
        bg: 'bg-emerald-100',
        text: 'text-emerald-800',
        label: 'Accepté'
      },
      'refuse': {
        bg: 'bg-red-100',
        text: 'text-red-800',
        label: 'Refusé'
      }
    };
    
    const config = statusConfig[statut as keyof typeof statusConfig] || {
      bg: 'bg-gray-100',
      text: 'text-gray-800',
      label: statut
    };
    
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  // Pagination
  const totalPages = Math.ceil(recentLeaves.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedLeaves = recentLeaves.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(totalPages, page)));
  };

  if (loading) {
    return (
      <div className="min-h-screen   flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-6"></div>
            <div className="absolute inset-0 rounded-full h-16 w-16 border-4 border-purple-200 border-t-purple-600 animate-spin mx-auto" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
          </div>
          <p className="text-gray-700 text-lg font-medium">Chargement des données...</p>
          <p className="text-gray-500 text-sm mt-2">Synchronisation avec Firebase</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen  p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header avec design premium light */}
        <div className="relative bg-white/90 backdrop-blur-xl border border-gray-200/50 rounded-3xl p-6 md:p-8 mb-8 shadow-xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -skew-x-12 animate-pulse"></div>
          
          <div className="relative z-10">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg">
                  <BarChart3 className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent mb-2">
                    Tableau de Bord
                  </h1>
                  <p className="text-gray-600 text-lg">
                    {getWelcomeMessage()}
                    {userProfile?.role === 'responsable' && (
                      <span className="ml-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                        {userProfile.entreprise}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="px-4 py-2 bg-gradient-to-r from-blue-100 to-purple-100 rounded-2xl shadow-sm">
                  <span className="text-sm font-medium text-gray-700">
                    {getRoleDisplayName(userProfile?.role || '')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cartes de statistiques en light mode */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {userProfile?.role === 'employe' ? (
            <>
              <div className="group relative bg-white/90 backdrop-blur-xl border border-emerald-200/50 p-6 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative z-10 flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <Calendar className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm font-medium mb-1">Solde congés</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.leaveBalance || 0} jours</p>
                    <div className="flex items-center gap-1 mt-1">
                      <ArrowUpRight size={14} className="text-emerald-500" />
                      <span className="text-emerald-500 text-xs font-medium">disponibles</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="group relative bg-white/90 backdrop-blur-xl border border-blue-200/50 p-6 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative z-10 flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <FileText className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm font-medium mb-1">Mes demandes</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalLeaves}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-blue-500 text-xs font-medium">total</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="group relative bg-white/90 backdrop-blur-xl border border-amber-200/50 p-6 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative z-10 flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <Clock className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm font-medium mb-1">En attente</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.pendingLeaves}</p>
                    <div className="flex items-center gap-1 mt-1">
                      {stats.pendingLeaves > 0 ? (
                        <ArrowUpRight size={14} className="text-amber-500" />
                      ) : null}
                      <span className="text-amber-500 text-xs font-medium">demandes</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="group relative bg-white/90 backdrop-blur-xl border border-emerald-200/50 p-6 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative z-10 flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <CheckCircle className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm font-medium mb-1">Acceptées</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.approvedLeaves}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <ArrowUpRight size={14} className="text-emerald-500" />
                      <span className="text-emerald-500 text-xs font-medium">demandes</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="group relative bg-white/90 backdrop-blur-xl border border-blue-200/50 p-6 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative z-10 flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm font-medium mb-1">Employés</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalEmployees}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <ArrowUpRight size={14} className="text-blue-500" />
                      <span className="text-blue-500 text-xs font-medium">actifs</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {userProfile?.role === 'super_admin' && (
                <div className="group relative bg-white/90 backdrop-blur-xl border border-purple-200/50 p-6 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="relative z-10 flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <Building2 className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm font-medium mb-1">Entreprises</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.totalCompanies}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <ArrowUpRight size={14} className="text-purple-500" />
                        <span className="text-purple-500 text-xs font-medium">partenaires</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="group relative bg-white/90 backdrop-blur-xl border border-amber-200/50 p-6 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative z-10 flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <AlertCircle className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm font-medium mb-1">En attente</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.pendingLeaves}</p>
                    <div className="flex items-center gap-1 mt-1">
                      {stats.pendingLeaves > 0 ? (
                        <ArrowUpRight size={14} className="text-amber-500" />
                      ) : null}
                      <span className="text-amber-500 text-xs font-medium">à traiter</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="group relative bg-white/90 backdrop-blur-xl border border-emerald-200/50 p-6 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative z-10 flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm font-medium mb-1">Ce mois</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.thisMonthLeaves || 0}</p>
                    <div className="flex items-center gap-1 mt-1">
                      {stats.thisMonthLeaves && stats.lastMonthLeaves && stats.thisMonthLeaves > stats.lastMonthLeaves ? (
                        <ArrowUpRight size={14} className="text-emerald-500" />
                      ) : (
                        <ArrowDownRight size={14} className="text-red-500" />
                      )}
                      <span className="text-emerald-500 text-xs font-medium">demandes</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Section employés avec pagination */}
          <div className="bg-white/90 backdrop-blur-xl border border-gray-200/50 rounded-3xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-6 border-b border-gray-200/50">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Congés Récents</h2>
                    <p className="text-sm text-gray-600">
                      Page {currentPage} sur {totalPages} ({recentLeaves.length} demandes)
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50/80">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Employé</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Période</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200/50">
                  {paginatedLeaves.map((leave, index) => (
                    <tr key={leave.id} className="hover:bg-gray-50/50 transition-colors duration-200 group">
                      <td className="px-6 py-4">
  <div className="flex items-center gap-3">
    <div className="relative">
      <div className="h-12 w-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
        <Users className="h-6 w-6 text-white" />
      </div>
      <div className="absolute -top-1 -right-1 h-4 w-4 bg-emerald-400 rounded-full border-2 border-white"></div>
    </div>
    <div>
      <div className="text-sm font-semibold text-gray-900">
        {/* CORRECTION ICI - Afficher le nom réel de l'employé */}
        {leave.prenom_employe || ''} {leave.nom_employe || ''}
      </div>
      <div className="text-sm text-gray-600">{leave.type}</div>
    </div>
  </div>
</td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-900 capitalize">{leave.type}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {formatDate(leave.date_debut)} - {formatDate(leave.date_fin)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {leave.duree} jour(s)
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(leave.statut)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-200/50 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Affichage de {startIndex + 1} à {Math.min(endIndex, recentLeaves.length)} sur {recentLeaves.length} demandes
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  
                  <div className="flex gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => goToPage(page)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                          currentPage === page
                            ? 'bg-blue-500 text-white shadow-lg'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                  
                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Section statistiques */}
          <div className="bg-white/90 backdrop-blur-xl border border-gray-200/50 rounded-3xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 p-6 border-b border-gray-200/50">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg">
                    <BarChart3 className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Statistiques des Congés</h2>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {chartData.map((item, index) => (
                  <div key={index} className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-6 border border-gray-200/50">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 rounded-full" style={{ backgroundColor: item.color }}></div>
                        <span className="text-sm font-medium text-gray-700">{item.name}</span>
                      </div>
                      <span className="text-lg font-bold text-gray-900">{item.value}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full transition-all duration-1000 ease-out" 
                        style={{ 
                          width: `${(item.value / Math.max(1, stats.totalLeaves)) * 100}%`, 
                          backgroundColor: item.color 
                        }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      {Math.round((item.value / Math.max(1, stats.totalLeaves)) * 100)}% du total
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200/50">
                <div className="flex items-center gap-2 mb-4">
                   <Sparkles className="h-5 w-5 text-blue-600" />
                  <h3 className="font-bold text-blue-900">Résumé</h3>
                </div>
                <div className="space-y-3 text-sm text-blue-800">
                  <div className="flex justify-between">
                    <span className="font-medium">Total des demandes:</span>
                    <span className="font-bold text-blue-600">{stats.totalLeaves}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Taux d'acceptation:</span>
                    <span className="font-bold text-blue-600">
                      {Math.round((stats.approvedLeaves / Math.max(1, stats.totalLeaves)) * 100)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Demandes ce mois:</span>
                    <span className="font-bold text-blue-600">{stats.thisMonthLeaves || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
