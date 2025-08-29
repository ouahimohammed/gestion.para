import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { collection, query, getDocs, where, addDoc, updateDoc, doc, orderBy, runTransaction } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatDate, calculateLeaveDays } from '../lib/utils';
import { 
  Plus, 
  Check, 
  X, 
  FileText, 
  Calendar, 
  User, 
  Filter, 
  Building,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Eye,
  Save,
  Trash2,
  Edit3
} from 'lucide-react';

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

interface Employee {
  id: string;
  nom: string;
  prenom: string;
  entreprise: string;
  solde_conge?: number;
}

interface Company {
  id: string;
  nom: string;
}

export function Leaves() {
  const { userProfile } = useAuth();
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filteredLeaves, setFilteredLeaves] = useState<Leave[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [selectedCompany, setSelectedCompany] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [formData, setFormData] = useState({
    type: 'annuel',
    date_debut: '',
    date_fin: '',
    motif: '',
  });

  useEffect(() => {
    if (userProfile) {
      fetchLeaves();
      if (userProfile.role === 'super_admin') {
        fetchCompanies();
      }
      if (userProfile.role !== 'employe') {
        fetchEmployees();
      }
    }
  }, [userProfile]);

  useEffect(() => {
    let filtered = leaves;
    
    if (selectedEmployee !== 'all') {
      filtered = filtered.filter(leave => leave.employe_id === selectedEmployee);
    }
    
    if (selectedCompany !== 'all') {
      filtered = filtered.filter(leave => leave.entreprise === selectedCompany);
    }
    
    setFilteredLeaves(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [leaves, selectedEmployee, selectedCompany]);

  useEffect(() => {
    if (selectedCompany === 'all') {
      setFilteredEmployees(allEmployees);
    } else {
      setFilteredEmployees(allEmployees.filter(employee => employee.entreprise === selectedCompany));
    }
    
    setSelectedEmployee('all');
  }, [selectedCompany, allEmployees]);

  // Pagination
  const totalPages = Math.ceil(filteredLeaves.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedLeaves = filteredLeaves.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(totalPages, page)));
  };

  const fetchCompanies = async () => {
    try {
      const q = query(collection(db, 'entreprises'));
      const querySnapshot = await getDocs(q);
      const companiesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Company));

      setCompanies(companiesData);
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      let q;
      if (userProfile?.role === 'super_admin') {
        q = query(collection(db, 'employes'));
      } else if (userProfile?.role === 'responsable' && userProfile.entreprise) {
        q = query(
          collection(db, 'employes'),
          where('entreprise', '==', userProfile.entreprise)
        );
      } else {
        return;
      }

      const querySnapshot = await getDocs(q);
      const employeesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        nom: doc.data().nom || '',
        prenom: doc.data().prenom || '',
        entreprise: doc.data().entreprise || '',
        solde_conge: doc.data().solde_conge || 0
      } as Employee));

      setAllEmployees(employeesData);
      setFilteredEmployees(employeesData);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchLeaves = async () => {
    try {
      let q;
      if (userProfile?.role === 'super_admin') {
        q = query(collection(db, 'conges'), orderBy('date_debut', 'desc'));
      } else if (userProfile?.role === 'responsable' && userProfile.entreprise) {
        q = query(
          collection(db, 'conges'),
          where('entreprise', '==', userProfile.entreprise),
          orderBy('date_debut', 'desc')
        );
      } else if (userProfile?.role === 'employe') {
        q = query(
          collection(db, 'conges'),
          where('employe_id', '==', userProfile.uid),
          orderBy('date_debut', 'desc')
        );
      } else {
        setLoading(false);
        return;
      }

      const querySnapshot = await getDocs(q);
      const leavesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Leave));

      setLeaves(leavesData);
    } catch (error) {
      console.error('Error fetching leaves:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;

    try {
      const leaveDays = calculateLeaveDays(formData.date_debut, formData.date_fin);
      
      if (formData.type === 'annuel') {
        const q = query(
          collection(db, 'employes'), 
          where('userId', '==', userProfile.uid)
        );
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const employeDoc = querySnapshot.docs[0];
          const employeData = employeDoc.data();
          const currentBalance = employeData.solde_conge || 0;
          if (currentBalance < leaveDays) {
            alert('Solde de congé insuffisant');
            return;
          }
        }
      }

      const leaveData = {
        employe_id: userProfile.uid,
        nom_employe: userProfile.nom || '',
        prenom_employe: userProfile.prenom || '',
        entreprise: userProfile.entreprise || '',
        type: formData.type,
        date_debut: formData.date_debut,
        date_fin: formData.date_fin,
        statut: 'en_attente',
        motif: formData.motif,
        duree: leaveDays,
        created_at: new Date().toISOString(),
      };

      await addDoc(collection(db, 'conges'), leaveData);
      
      setShowForm(false);
      setFormData({
        type: 'annuel',
        date_debut: '',
        date_fin: '',
        motif: '',
      });
      
      fetchLeaves();
    } catch (error) {
      console.error('Error creating leave request:', error);
    }
  };

  const handleStatusUpdate = async (leaveId: string, newStatus: 'accepte' | 'refuse', leave: Leave) => {
    try {
      const leaveDays = leave.duree || calculateLeaveDays(leave.date_debut, leave.date_fin);
      
      await runTransaction(db, async (transaction) => {
        const leaveRef = doc(db, 'conges', leaveId);
        
        const q = query(
          collection(db, 'employes'), 
          where('userId', '==', leave.employe_id)
        );
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          throw new Error("L'employé n'existe pas");
        }
        
        const employeDoc = querySnapshot.docs[0];
        const employeRef = doc(db, 'employes', employeDoc.id);
        
        const leaveDoc = await transaction.get(leaveRef);
        const employeData = await transaction.get(employeRef);
        
        if (!leaveDoc.exists()) {
          throw new Error("La demande de congé n'existe pas");
        }
        
        const currentStatus = leaveDoc.data().statut;
        const currentBalance = employeData.data().solde_conge || 0;
        
        transaction.update(leaveRef, {
          statut: newStatus,
          updated_at: new Date().toISOString(),
        });
        
        if (leave.type === 'annuel') {
          if (newStatus === 'accepte') {
            if (currentBalance < leaveDays) {
              throw new Error("Solde de congé insuffisant");
            }
            
            transaction.update(employeRef, {
              solde_conge: currentBalance - leaveDays
            });
          } 
          else if (newStatus === 'refuse' && currentStatus === 'accepte') {
            transaction.update(employeRef, {
              solde_conge: currentBalance + leaveDays
            });
          }
        }
      });
      
      fetchLeaves();
      alert(`Demande ${newStatus === 'accepte' ? 'acceptée' : 'refusée'} avec succès`);
    } catch (error: any) {
      console.error('Error updating leave status:', error);
      alert(error.message || 'Erreur lors de la mise à jour du statut');
    }
  };

  const getStatusBadge = (status: string) => {
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
    
    const config = statusConfig[status as keyof typeof statusConfig] || {
      bg: 'bg-gray-100',
      text: 'text-gray-800',
      label: status
    };
    
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const getTypeBadge = (type: string) => {
    const typeConfig = {
      'annuel': {
        bg: 'bg-blue-100',
        text: 'text-blue-800',
        label: 'Congé annuel'
      },
      'maladie': {
        bg: 'bg-red-100',
        text: 'text-red-800',
        label: 'Congé maladie'
      },
      'exceptionnel': {
        bg: 'bg-purple-100',
        text: 'text-purple-800',
        label: 'Congé exceptionnel'
      }
    };
    
    const config = typeConfig[type as keyof typeof typeConfig] || {
      bg: 'bg-gray-100',
      text: 'text-gray-800',
      label: type
    };
    
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
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
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header avec design premium light */}
        <div className="relative bg-white/90 backdrop-blur-xl border border-gray-200/50 rounded-3xl p-6 md:p-8 mb-8 shadow-xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -skew-x-12 animate-pulse"></div>
          
          <div className="relative z-10">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg">
                  <FileText className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent mb-2">
                    Gestion des Congés
                  </h1>
                  <p className="text-gray-600 text-lg">
                    Gestion des demandes de congés et autorisations
                    {userProfile?.role === 'responsable' && (
                      <span className="ml-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                        {userProfile.entreprise}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              
              {userProfile?.role === 'employe' && (
                <button
                  onClick={() => setShowForm(true)}
                  className="group flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-5 py-3 rounded-2xl hover:from-blue-600 hover:to-blue-700 transition-all duration-300 text-sm font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <Plus size={16} className="group-hover:rotate-90 transition-transform duration-300" />
                  Demander un congé
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Filtres pour les responsables et super admins */}
        {userProfile?.role !== 'employe' && (
          <div className="relative bg-white/90 backdrop-blur-xl border border-gray-200/50 rounded-3xl p-6 shadow-xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 hover:opacity-100 transition-opacity duration-500"></div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
                  <Filter className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Filtres Avancés</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Filtre par entreprise pour les super admins */}
                {userProfile?.role === 'super_admin' && companies.length > 0 && (
                  <div className="bg-white/70 backdrop-blur-sm border border-gray-200 rounded-2xl p-4 hover:bg-white/90 transition-all duration-300">
                    <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                      <Building className="h-4 w-4 mr-2 text-gray-500" />
                      Entreprise
                    </label>
                    <div className="relative">
                      <select
                        value={selectedCompany}
                        onChange={(e) => setSelectedCompany(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white outline-none appearance-none"
                      >
                        <option value="all">Toutes les entreprises</option>
                        {companies.map((company) => (
                          <option key={company.id} value={company.nom}>
                            {company.nom}
                          </option>
                        ))}
                      </select>
                      <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                )}
                
                {/* Filtre par employé pour les responsables et super admins */}
                {allEmployees.length > 0 && (
                  <div className="bg-white/70 backdrop-blur-sm border border-gray-200 rounded-2xl p-4 hover:bg-white/90 transition-all duration-300">
                    <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                      <User className="h-4 w-4 mr-2 text-gray-500" />
                      Employé
                      {selectedCompany !== 'all' && (
                        <span className="ml-2 text-xs text-gray-500">
                          ({filteredEmployees.length} employé(s))
                        </span>
                      )}
                    </label>
                    <div className="relative">
                      <select
                        value={selectedEmployee}
                        onChange={(e) => setSelectedEmployee(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white outline-none appearance-none"
                        disabled={filteredEmployees.length === 0}
                      >
                        <option value="all">Tous les employés</option>
                        {filteredEmployees.map(employee => (
                          <option key={employee.id} value={employee.id}>
                            {employee.prenom} {employee.nom}
                          </option>
                        ))}
                      </select>
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                )}
              </div>
              
              {/* Indicateurs de filtres actifs */}
              {(selectedCompany !== 'all' || selectedEmployee !== 'all') && (
                <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/50 rounded-2xl">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">Filtres actifs:</span>
                    </div>
                    <button 
                      onClick={() => {
                        setSelectedCompany('all');
                        setSelectedEmployee('all');
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <X className="h-3 w-3" />
                      Tout réinitialiser
                    </button>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {selectedCompany !== 'all' && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Entreprise: {companies.find(c => c.nom === selectedCompany)?.nom}
                        <button 
                          onClick={() => setSelectedCompany('all')}
                          className="ml-1.5 rounded-full flex-shrink-0 hover:bg-blue-200 transition-colors duration-200"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    )}
                    
                    {selectedEmployee !== 'all' && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Employé: {allEmployees.find(e => e.id === selectedEmployee)?.prenom} {allEmployees.find(e => e.id === selectedEmployee)?.nom}
                        <button 
                          onClick={() => setSelectedEmployee('all')}
                          className="ml-1.5 rounded-full flex-shrink-0 hover:bg-blue-200 transition-colors duration-200"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Request Form for Employees */}
        {showForm && userProfile?.role === 'employe' && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white/95 backdrop-blur-xl rounded-3xl max-w-md w-full p-8 shadow-2xl border border-gray-200/50">
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
                    <Plus className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Nouvelle demande de congé</h2>
                </div>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-2xl transition-all duration-200"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Type de congé</label>
                  <div className="relative">
                    <FileText className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <select
                      className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white outline-none"
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    >
                      <option value="annuel">Congé annuel</option>
                      <option value="maladie">Congé maladie</option>
                      <option value="exceptionnel">Congé exceptionnel</option>
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">Date de début</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        type="date"
                        required
                        value={formData.date_debut}
                        onChange={(e) => setFormData({ ...formData, date_debut: e.target.value })}
                        className="pl-12 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">Date de fin</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        type="date"
                        required
                        value={formData.date_fin}
                        onChange={(e) => setFormData({ ...formData, date_fin: e.target.value })}
                        className="pl-12 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Durée</label>
                  <Input
                    readOnly
                    value={
                      formData.date_debut && formData.date_fin
                        ? `${calculateLeaveDays(formData.date_debut, formData.date_fin)} jour(s)`
                        : ''
                    }
                    className="border-2 border-gray-200 rounded-2xl py-4 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Motif</label>
                  <textarea
                    className="w-full px-4 py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white outline-none"
                    rows={3}
                    required
                    value={formData.motif}
                    onChange={(e) => setFormData({ ...formData, motif: e.target.value })}
                  />
                </div>
                
                <div className="flex gap-4 mt-8">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 px-6 py-4 border-2 border-gray-200 text-gray-700 rounded-2xl hover:bg-gray-50 transition-all duration-200 font-semibold"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-semibold shadow-xl hover:shadow-2xl transform hover:scale-105"
                  >
                    Soumettre
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Leaves List */}
        <div className="bg-white/90 backdrop-blur-xl border border-gray-200/50 rounded-3xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-6 border-b border-gray-200/50">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {userProfile?.role === 'employe' ? 'Mes demandes de congé' : 'Demandes de congé'} 
                  </h2>
                  <p className="text-sm text-gray-600">
                    Page {currentPage} sur {totalPages} ({filteredLeaves.length} demandes)
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            {paginatedLeaves.length > 0 ? (
              <div className="space-y-6">
                {paginatedLeaves.map((leave) => (
                  <div key={leave.id} className="group relative bg-gradient-to-br from-slate-50 to-slate-100 border border-gray-200/50 p-6 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-500 hover:scale-[1.02] overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    
                    <div className="relative z-10">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 space-y-4">
                          <div className="flex items-center gap-3">
                            {getTypeBadge(leave.type)}
                            {getStatusBadge(leave.statut)}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div>
                              <div className="flex items-center text-gray-600 mb-2">
                                <User className="h-4 w-4 mr-2" />
                                <span className="text-xs font-medium">Employé</span>
                              </div>
                              <div className="font-semibold text-gray-900">
                                {userProfile?.role === 'employe' 
                                  ? 'Moi' 
                                  : `${leave.prenom_employe} ${leave.nom_employe}`}
                              </div>
                            </div>
                            
                            <div>
                              <div className="flex items-center text-gray-600 mb-2">
                                <Calendar className="h-4 w-4 mr-2" />
                                <span className="text-xs font-medium">Période</span>
                              </div>
                              <div className="font-semibold text-gray-900">
                                {formatDate(leave.date_debut)} - {formatDate(leave.date_fin)}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {leave.duree || calculateLeaveDays(leave.date_debut, leave.date_fin)} jour(s)
                              </div>
                            </div>
                            
                            {userProfile?.role !== 'employe' && (
                              <div>
                                <div className="flex items-center text-gray-600 mb-2">
                                  <Building className="h-4 w-4 mr-2" />
                                  <span className="text-xs font-medium">Entreprise</span>
                                </div>
                                <div className="font-semibold text-gray-900">{leave.entreprise}</div>
                              </div>
                            )}
                            
                            <div>
                              <div className="flex items-center text-gray-600 mb-2">
                                <FileText className="h-4 w-4 mr-2" />
                                <span className="text-xs font-medium">Motif</span>
                              </div>
                              <div className="font-semibold text-gray-900">{leave.motif}</div>
                            </div>
                          </div>
                        </div>
                        
                        {userProfile?.role !== 'employe' && leave.statut === 'en_attente' && (
                          <div className="flex gap-2 ml-4">
                            <button
                              onClick={() => handleStatusUpdate(leave.id, 'accepte', leave)}
                              className="group flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-4 py-2.5 rounded-2xl hover:from-emerald-600 hover:to-emerald-700 transition-all duration-300 text-sm font-semibold shadow-md hover:shadow-lg"
                            >
                              <Check size={16} className="group-hover:scale-110 transition-transform duration-300" />
                              Accepter
                            </button>
                            <button
                              onClick={() => handleStatusUpdate(leave.id, 'refuse', leave)}
                              className="group flex items-center gap-2 bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-2.5 rounded-2xl hover:from-red-600 hover:to-red-700 transition-all duration-300 text-sm font-semibold shadow-md hover:shadow-lg"
                            >
                              <X size={16} className="group-hover:scale-110 transition-transform duration-300" />
                              Refuser
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="mx-auto w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-3xl flex items-center justify-center mb-6">
                  <FileText className="h-10 w-10 text-blue-500" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune demande de congé</h3>
                <p className="text-gray-500">
                  {selectedCompany !== 'all' || selectedEmployee !== 'all' 
                    ? 'Aucune demande ne correspond à vos filtres actuels' 
                    : 'Aucune demande de congé trouvée'}
                </p>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 px-4 py-4 bg-gray-50/50 border-t border-gray-200/50 flex items-center justify-between rounded-b-3xl">
                <div className="text-sm text-gray-600">
                  Affichage de {startIndex + 1} à {Math.min(endIndex, filteredLeaves.length)} sur {filteredLeaves.length} demandes
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
        </div>
      </div>
    </div>
  );
}
