import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { collection, query, getDocs, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatDate } from '../lib/utils';
import { User, Building2, Calendar, Award, FileText, Clock, Shield, Users } from 'lucide-react';

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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const isSuperAdmin = userProfile?.is_super_admin || employee?.is_super_admin;

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <User className="h-8 w-8 text-blue-600" />
        <h1 className="text-3xl font-bold text-gray-900">Mon Profil</h1>
        {isSuperAdmin && (
          <Badge variant="default" className="bg-purple-100 text-purple-800 border-purple-200">
            <Shield className="h-3 w-3 mr-1" />
            Super Admin
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Information */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informations personnelles
              </CardTitle>
            </CardHeader>
            <CardContent>
              {employee ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        Nom complet
                      </label>
                      <div className="text-lg font-semibold text-gray-900">
                        {employee.prenom} {employee.nom}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        CIN
                      </label>
                      <div className="text-lg font-semibold text-gray-900">
                        {employee.cin}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        Email
                      </label>
                      <div className="text-lg font-semibold text-gray-900">
                        {userProfile?.email}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        Poste
                      </label>
                      <Badge variant="default" className="text-sm px-3 py-1">
                        {employee.poste}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="border-t pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">
                          <Building2 className="inline h-4 w-4 mr-1" />
                          Entreprise
                        </label>
                        <div className="text-lg font-semibold text-gray-900">
                          {employee.entreprise}
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">
                          <Calendar className="inline h-4 w-4 mr-1" />
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
                    <div className="border-t pt-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                        <Users className="h-5 w-5 mr-2 text-blue-500" />
                        Responsable hiérarchique
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">
                            Nom complet
                          </label>
                          <div className="text-lg font-semibold text-gray-900">
                            {manager.prenom} {manager.nom}
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">
                            Poste
                          </label>
                          <div className="text-lg font-semibold text-gray-900">
                            {manager.poste}
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">
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
                    <div className="border-t pt-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                        <Shield className="h-5 w-5 mr-2 text-purple-500" />
                        Privilèges Super Admin
                      </h3>
                      <div className="bg-purple-50 p-4 rounded-lg">
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
                  <User className="mx-auto h-12 w-12 text-gray-400 mb-4" />
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-green-600" />
                Solde de congés
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-4xl font-bold text-green-600 mb-2">
                  {employee?.solde_conge || 0}
                </div>
                <div className="text-sm text-gray-600">
                  jours disponibles
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Leave Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Statistiques
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total demandes</span>
                  <Badge variant="default">{leaveStats.total}</Badge>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    En attente
                  </span>
                  <Badge variant="warning">{leaveStats.pending}</Badge>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Approuvées</span>
                  <Badge variant="success">{leaveStats.approved}</Badge>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Refusées</span>
                  <Badge variant="destructive">{leaveStats.rejected}</Badge>
                </div>
                
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-900">
                      Jours utilisés cette année
                    </span>
                    <Badge variant="secondary" className="font-semibold">
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
  );
}