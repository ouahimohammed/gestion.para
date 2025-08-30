import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { collection, query, getDocs, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatDate } from '../lib/utils';
import { User, Building2,CreditCard  , Calendar, Award, FileText, Clock, Shield, Users, Mail, IdCard, Briefcase } from 'lucide-react';

interface Employee {
  id: string;
  nom: string;
  prenom: string;
  cin: string;
  poste: string;
  entreprise: string;
  date_embauche: string;
  solde_conge: number;
  responsable_id?: string;
  is_super_admin?: boolean;
}

interface UserProfile {
  uid: string;
  email: string;
  role?: string;
  is_super_admin?: boolean;
}

interface LeaveStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  used: number;
}

interface ManagerInfo {
  nom: string;
  prenom: string;
  email: string;
  poste: string;
}

export function Profile() {
  const { userProfile } = useAuth();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [manager, setManager] = useState<ManagerInfo | null>(null);
  const [leaveStats, setLeaveStats] = useState<LeaveStats>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    used: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userProfile) {
      fetchEmployeeProfile();
      fetchLeaveStats();
    }
  }, [userProfile]);

  const fetchEmployeeProfile = async () => {
    if (!userProfile?.uid) return;

    try {
      // Try to find employee by matching user ID or email
      const q = query(collection(db, 'employes'));
      const querySnapshot = await getDocs(q);
      
      let employeeData = null;
      querySnapshot.docs.forEach(doc => {
        const data = doc.data();
        // You might need to adjust this logic based on how you link users to employees
        if (data.email === userProfile.email || doc.id === userProfile.uid) {
          employeeData = { id: doc.id, ...data } as Employee;
        }
      });

      if (employeeData) {
        setEmployee(employeeData);
        
        // Fetch manager info if employee has a responsable_id
        if (employeeData.responsable_id) {
          await fetchManagerInfo(employeeData.responsable_id);
        }
      }
    } catch (error) {
      console.error('Error fetching employee profile:', error);
    }
  };

  const fetchManagerInfo = async (managerId: string) => {
    try {
      const managerDoc = await getDoc(doc(db, 'employes', managerId));
      if (managerDoc.exists()) {
        const managerData = managerDoc.data();
        setManager({
          nom: managerData.nom,
          prenom: managerData.prenom,
          email: managerData.email,
          poste: managerData.poste
        });
      }
    } catch (error) {
      console.error('Error fetching manager info:', error);
    }
  };

  const fetchLeaveStats = async () => {
    if (!userProfile?.uid) return;

    try {
      const q = query(
        collection(db, 'conges'),
        where('employe_id', '==', userProfile.uid)
      );

      const querySnapshot = await getDocs(q);
      const leaves = querySnapshot.docs.map(doc => doc.data());

      const stats = {
        total: leaves.length,
        pending: leaves.filter(l => l.statut === 'en_attente').length,
        approved: leaves.filter(l => l.statut === 'accepte').length,
        rejected: leaves.filter(l => l.statut === 'refuse').length,
        used: leaves.filter(l => l.statut === 'accepte').length, // Simplified calculation
      };

      setLeaveStats(stats);
    } catch (error) {
      console.error('Error fetching leave stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-3 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
          <p className="text-gray-600">Chargement du profil...</p>
        </div>
      </div>
    );
  }

  const isSuperAdmin = userProfile?.is_super_admin || employee?.is_super_admin;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-xl">
            <User className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Mon Profil</h1>
          {isSuperAdmin && (
            <Badge variant="default" className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0 px-3 py-1">
              <Shield className="h-3 w-3 mr-1" />
              Super Admin
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Information */}
          <div className="lg:col-span-2">
            <Card className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20">
              <CardHeader className="border-b border-gray-200/50">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                  <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-2 rounded-lg">
                    <User className="h-5 w-5 text-white" />
                  </div>
                  Informations personnelles
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {employee ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-200/50">
                        <label className="block text-sm font-medium text-gray-600 mb-2 flex items-center">
                          <User className="h-4 w-4 mr-1" />
                          Nom complet
                        </label>
                        <div className="text-lg font-semibold text-gray-900">
                          {employee.prenom} {employee.nom}
                        </div>
                      </div>
                      
                      <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-200/50">
                        <label className="block text-sm font-medium text-gray-600 mb-2 flex items-center">
                          <CreditCard   className="h-4 w-4 mr-1" />
                          CIN
                        </label>
                        <div className="text-lg font-semibold text-gray-900">
                          {employee.cin}
                        </div>
                      </div>
                      
                      <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-200/50">
                        <label className="block text-sm font-medium text-gray-600 mb-2 flex items-center">
                          <Mail className="h-4 w-4 mr-1" />
                          Email
                        </label>
                        <div className="text-lg font-semibold text-gray-900">
                          {userProfile?.email}
                        </div>
                      </div>
                      
                      <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-200/50">
                        <label className="block text-sm font-medium text-gray-600 mb-2 flex items-center">
                          <Briefcase className="h-4 w-4 mr-1" />
                          Poste
                        </label>
                        <Badge variant="default" className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-3 py-1 text-sm">
                          {employee.poste}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="border-t border-gray-200/50 pt-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-200/50">
                          <label className="block text-sm font-medium text-gray-600 mb-2 flex items-center">
                            <Building2 className="h-4 w-4 mr-1" />
                            Entreprise
                          </label>
                          <div className="text-lg font-semibold text-gray-900">
                            {employee.entreprise}
                          </div>
                        </div>
                        
                        <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-200/50">
                          <label className="block text-sm font-medium text-gray-600 mb-2 flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            Date d'embauche
                          </label>
                          <div className="text-lg font-semibold text-gray-900">
                            {formatDate(employee.date_embauche)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Manager Information */}
                    {manager && (
                      <div className="border-t border-gray-200/50 pt-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                          <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-2 rounded-lg mr-3">
                            <Users className="h-5 w-5 text-white" />
                          </div>
                          Responsable hiérarchique
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-200/50">
                            <label className="block text-sm font-medium text-gray-600 mb-2">
                              Nom complet
                            </label>
                            <div className="text-lg font-semibold text-gray-900">
                              {manager.prenom} {manager.nom}
                            </div>
                          </div>
                          
                          <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-200/50">
                            <label className="block text-sm font-medium text-gray-600 mb-2">
                              Poste
                            </label>
                            <div className="text-lg font-semibold text-gray-900">
                              {manager.poste}
                            </div>
                          </div>
                          
                          <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-200/50 md:col-span-2">
                            <label className="block text-sm font-medium text-gray-600 mb-2">
                              Email
                            </label>
                            <div className="text-lg font-semibold text-gray-900">
                              {manager.email}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Super Admin Information */}
                    {isSuperAdmin && (
                      <div className="border-t border-gray-200/50 pt-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                          <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-2 rounded-lg mr-3">
                            <Shield className="h-5 w-5 text-white" />
                          </div>
                          Privilèges Super Admin
                        </h3>
                        <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-xl border border-purple-200/50">
                          <p className="text-purple-800">
                            Vous avez accès à toutes les fonctionnalités administratives du système.
                            Vous pouvez gérer les employés, les congés, et les paramètres de l'application.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="bg-gradient-to-r from-gray-100 to-gray-200 p-4 rounded-2xl w-16 h-16 flex items-center justify-center mx-auto mb-4">
                      <User className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-gray-600">
                      Profil employé non trouvé. Contactez votre responsable.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Leave Balance & Stats */}
          <div className="space-y-6">
            {/* Leave Balance */}
            <Card className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20">
              <CardHeader className="border-b border-gray-200/50">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                  <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-2 rounded-lg">
                    <Award className="h-5 w-5 text-white" />
                  </div>
                  Solde de congés
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-5xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-2">
                    {employee?.solde_conge || 0}
                  </div>
                  <div className="text-sm text-gray-600">
                    jours disponibles
                  </div>
                  <div className="mt-4 bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-xl border border-green-200/50">
                    <p className="text-xs text-green-700">
                      Votre solde de congés est mis à jour annuellement
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Leave Statistics */}
            <Card className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20">
              <CardHeader className="border-b border-gray-200/50">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                  <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-2 rounded-lg">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  Statistiques des congés
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-50/50 rounded-xl">
                    <span className="text-sm text-gray-600">Total demandes</span>
                    <Badge variant="default" className="bg-gray-200 text-gray-800 px-3 py-1">
                      {leaveStats.total}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-amber-50/50 rounded-xl">
                    <span className="text-sm text-gray-600 flex items-center">
                      <Clock className="h-4 w-4 mr-2 text-amber-600" />
                      En attente
                    </span>
                    <Badge variant="warning" className="bg-amber-100 text-amber-800 px-3 py-1">
                      {leaveStats.pending}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-green-50/50 rounded-xl">
                    <span className="text-sm text-gray-600">Approuvées</span>
                    <Badge variant="success" className="bg-green-100 text-green-800 px-3 py-1">
                      {leaveStats.approved}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-red-50/50 rounded-xl">
                    <span className="text-sm text-gray-600">Refusées</span>
                    <Badge variant="destructive" className="bg-red-100 text-red-800 px-3 py-1">
                      {leaveStats.rejected}
                    </Badge>
                  </div>
                  
                  <div className="border-t border-gray-200/50 pt-4">
                    <div className="flex justify-between items-center p-3 bg-blue-50/50 rounded-xl">
                      <span className="text-sm font-medium text-gray-900">
                        Jours utilisés cette année
                      </span>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800 px-3 py-1 font-semibold">
                        {leaveStats.used}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

          
          </div>
        </div>
      </div>
    </div>
  );
}
