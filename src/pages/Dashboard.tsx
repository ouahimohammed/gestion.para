import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { collection, query, getDocs, where, orderBy, doc, getDoc } from 'firebase/firestore';
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
  Award
} from 'lucide-react';
import { StatsCard } from './StatsCard';
import { RecentLeaves } from './RecentLeaves';
import { QuickActions } from './QuickActions';
import { LeaveChart } from './LeaveChart';

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
  managerLeaveBalance?: number; // Nouveau champ pour le solde du responsable
}

interface Leave {
  id: string;
  type: string;
  date_debut: string;
  date_fin: string;
  statut: string;
  entreprise?: string;
  employe_nom?: string;
  motif?: string;
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

  // Fonction pour récupérer le solde de congé d'un employé
  const fetchEmployeeLeaveBalance = async (employeeId: string) => {
    try {
      const employeeDoc = await getDoc(doc(db, 'employes', employeeId));
      if (employeeDoc.exists()) {
        return employeeDoc.data().solde_conge || 0;
      }
      return 0;
    } catch (error) {
      console.error('Error fetching employee leave balance:', error);
      return 0;
    }
  };

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

    // Récupérer le solde de congé du responsable
    const managerLeaveBalance = await fetchEmployeeLeaveBalance(userProfile.uid);

    setStats({
      totalEmployees: employeesSnapshot.size,
      totalLeaves: leavesSnapshot.size,
      pendingLeaves: leaves.filter(l => l.statut === 'en_attente').length,
      approvedLeaves: leaves.filter(l => l.statut === 'accepte').length,
      rejectedLeaves: leaves.filter(l => l.statut === 'refuse').length,
      totalCompanies: 1,
      thisMonthLeaves,
      managerLeaveBalance, // Ajout du solde du responsable
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
    
    // Récupérer le solde de congé de l'employé
    const leaveBalance = await fetchEmployeeLeaveBalance(userProfile.uid);

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
      leaveBalance, // Utilisation du solde récupéré
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent"></div>
              <p className="text-slate-600 font-medium">Chargement du tableau de bord...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900">
              {getWelcomeMessage()}
            </h1>
            <p className="text-slate-600 mt-1">
              Voici un aperçu de votre activité aujourd'hui
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="px-3 py-1">
              {getRoleDisplayName(userProfile?.role || '')}
            </Badge>
            <QuickActions userRole={userProfile?.role} />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Carte Mon solde de congé - visible pour employés et responsables */}
          {(userProfile?.role === 'employe' || userProfile?.role === 'responsable') && (
            <StatsCard
              title="Mon solde de congé"
              value={`${userProfile?.role === 'employe' ? stats.leaveBalance || 0 : stats.managerLeaveBalance || 0} jours`}
              icon={Award}
              iconColor="text-amber-600"
              bgColor="bg-amber-50"
              trend="neutral"
              trendText="disponibles"
            />
          )}
          
          {userProfile?.role === 'employe' ? (
            <>
              <StatsCard
                title="Mes demandes"
                value={stats.totalLeaves}
                icon={FileText}
                iconColor="text-blue-600"
                bgColor="bg-blue-50"
                trend="neutral"
                trendText="total"
              />
              <StatsCard
                title="En attente"
                value={stats.pendingLeaves}
                icon={Clock}
                iconColor="text-amber-600"
                bgColor="bg-amber-50"
                trend={stats.pendingLeaves > 0 ? 'up' : 'neutral'}
                trendText="demandes"
              />
              <StatsCard
                title="Acceptées"
                value={stats.approvedLeaves}
                icon={CheckCircle}
                iconColor="text-emerald-600"
                bgColor="bg-emerald-50"
                trend="up"
                trendText="demandes"
              />
            </>
          ) : (
            <>
              <StatsCard
                title="Employés"
                value={stats.totalEmployees}
                icon={Users}
                iconColor="text-blue-600"
                bgColor="bg-blue-50"
                trend="up"
                trendText="actifs"
              />
              {userProfile?.role === 'super_admin' && (
                <StatsCard
                  title="Entreprises"
                  value={stats.totalCompanies}
                  icon={Building2}
                  iconColor="text-purple-600"
                  bgColor="bg-purple-50"
                  trend="up"
                  trendText="partenaires"
                />
              )}
              <StatsCard
                title="En attente"
                value={stats.pendingLeaves}
                icon={AlertCircle}
                iconColor="text-amber-600"
                bgColor="bg-amber-50"
                trend={stats.pendingLeaves > 0 ? 'up' : 'neutral'}
                trendText="à traiter"
                urgent={stats.pendingLeaves > 5}
              />
              <StatsCard
                title="Ce mois"
                value={stats.thisMonthLeaves || 0}
                icon={TrendingUp}
                iconColor="text-emerald-600"
                bgColor="bg-emerald-50"
                trend={stats.thisMonthLeaves && stats.lastMonthLeaves && stats.thisMonthLeaves > stats.lastMonthLeaves ? 'up' : 'down'}
                trendText="demandes"
              />
              <StatsCard
                title="Acceptées"
                value={stats.approvedLeaves}
                icon={CheckCircle}
                iconColor="text-emerald-600"
                bgColor="bg-emerald-50"
                trend="up"
                trendText="validées"
              />
              <StatsCard
                title="Refusées"
                value={stats.rejectedLeaves}
                icon={XCircle}
                iconColor="text-red-600"
                bgColor="bg-red-50"
                trend={stats.rejectedLeaves > 0 ? 'down' : 'neutral'}
                trendText="rejetées"
              />
            </>
          )}
        </div>

        {/* Charts and Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart */}
          <div className="lg:col-span-1">
            <LeaveChart data={chartData} userRole={userProfile?.role} />
          </div>

          {/* Recent Leaves */}
          <div className="lg:col-span-2">
            <RecentLeaves 
              leaves={recentLeaves} 
              userRole={userProfile?.role}
              loading={loading}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
