import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/Dialog';
import { 
  collection, query, getDocs, where, updateDoc, deleteDoc, doc 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  Plus, Edit, Trash2, Search, Filter, UserCog, X, 
  Mail, Building, UserCheck, UserX, ChevronDown, ChevronUp, Users,
  Download, Calendar, ArrowUpDown, Eye, EyeOff
} from 'lucide-react';

interface Responsable {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  entreprise: string;
  userId: string;
  createdAt: string;
  status: 'active' | 'inactive';
}

interface Employee {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  entreprise: string;
  role: string;
  status: 'active' | 'inactive';
}

interface Company {
  id: string;
  nom: string;
  responsableId?: string;
}

export function Responsables() {
  const { userProfile } = useAuth();
  const [responsables, setResponsables] = useState<Responsable[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filteredResponsables, setFilteredResponsables] = useState<Responsable[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingResponsable, setEditingResponsable] = useState<Responsable | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: '', direction: 'ascending' });
  const [expandedResponsable, setExpandedResponsable] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState('');

  useEffect(() => {
    if (userProfile && userProfile.role === 'super_admin') {
      fetchResponsables();
      fetchCompanies();
      fetchEmployees();
    }
  }, [userProfile]);

  useEffect(() => {
    let filtered = responsables.filter(responsable =>
      responsable.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      responsable.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      responsable.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      responsable.entreprise.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (selectedCompany) {
      filtered = filtered.filter(responsable => responsable.entreprise === selectedCompany);
    }

    if (selectedStatus) {
      filtered = filtered.filter(responsable => responsable.status === selectedStatus);
    }

    // Apply sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }

    setFilteredResponsables(filtered);
  }, [responsables, searchTerm, selectedCompany, selectedStatus, sortConfig]);

  const requestSort = (key: string) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const fetchResponsables = async () => {
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'responsable'));
      const querySnapshot = await getDocs(q);
      const responsablesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Responsable));

      setResponsables(responsablesData);
    } catch (error) {
      console.error('Error fetching responsables:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      setEmployeesLoading(true);
      // Récupérer tous les utilisateurs d'abord, puis filtrer localement
      const q = query(collection(db, 'users'));
      const querySnapshot = await getDocs(q);
      
      // Filtrer localement pour exclure les responsables et super_admins
      const employeesData = querySnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Employee))
        .filter(employee => 
          employee.role !== 'responsable' && 
          employee.role !== 'super_admin'
        );

      setEmployees(employeesData);
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setEmployeesLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      setCompaniesLoading(true);
      const q = query(collection(db, 'entreprises'));
      const querySnapshot = await getDocs(q);
      const companiesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Company));

      setCompanies(companiesData);
    } catch (error) {
      console.error('Error fetching companies:', error);
    } finally {
      setCompaniesLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    
    try {
      if (!selectedEmployee) {
        throw new Error('Veuillez sélectionner un employé');
      }

      // Trouver l'employé sélectionné
      const selectedEmp = employees.find(emp => emp.id === selectedEmployee);
      if (!selectedEmp) {
        throw new Error('Employé sélectionné non trouvé');
      }

      // Vérifier si l'entreprise a déjà un responsable
      const entrepriseQuery = query(
        collection(db, 'users'), 
        where('entreprise', '==', selectedEmp.entreprise),
        where('role', '==', 'responsable')
      );
      const entrepriseSnapshot = await getDocs(entrepriseQuery);
      
      if (!entrepriseSnapshot.empty) {
        const existingResponsable = entrepriseSnapshot.docs[0].data();
        if (!editingResponsable || existingResponsable.id !== editingResponsable.id) {
          throw new Error('Cette entreprise a déjà un responsable');
        }
      }

      if (editingResponsable) {
        // Mise à jour d'un responsable existant
        await updateDoc(doc(db, 'users', editingResponsable.id), {
          nom: selectedEmp.nom,
          prenom: selectedEmp.prenom,
          email: selectedEmp.email,
          entreprise: selectedEmp.entreprise,
          updatedAt: new Date().toISOString()
        });
      } else {
        // Transformer l'employé en responsable
        await updateDoc(doc(db, 'users', selectedEmp.id), {
          role: "responsable",
          updatedAt: new Date().toISOString()
        });

        // Mettre à jour l'entreprise avec l'ID du responsable
        const companyToUpdate = companies.find(c => c.nom === selectedEmp.entreprise);
        if (companyToUpdate) {
          await updateDoc(doc(db, 'entreprises', companyToUpdate.id), {
            responsableId: selectedEmp.id
          });
        }
      }
      
      setShowForm(false);
      setEditingResponsable(null);
      setSelectedEmployee('');
      
      fetchResponsables();
      fetchEmployees();
      fetchCompanies();
    } catch (error: any) {
      console.error('Error saving responsable:', error);
      setFormError(error.message || 'Erreur lors de la sauvegarde du responsable. Veuillez réessayer.');
    }
  };

  const handleEdit = (responsable: Responsable) => {
    setEditingResponsable(responsable);
    setSelectedEmployee(responsable.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce responsable ?')) {
      try {
        // Retirer le rôle de responsable (mais garder l'utilisateur)
        await updateDoc(doc(db, 'users', id), {
          role: 'employee', // ou autre rôle approprié
          updatedAt: new Date().toISOString()
        });
        
        // Trouver l'entreprise associée à ce responsable et retirer l'ID du responsable
        const responsableToDelete = responsables.find(r => r.id === id);
        if (responsableToDelete) {
          const companyToUpdate = companies.find(c => c.nom === responsableToDelete.entreprise);
          if (companyToUpdate && companyToUpdate.responsableId === id) {
            await updateDoc(doc(db, 'entreprises', companyToUpdate.id), {
              responsableId: null
            });
          }
        }
        
        fetchResponsables();
        fetchEmployees();
        fetchCompanies();
      } catch (error) {
        console.error('Error deleting responsable:', error);
      }
    }
  };

  const toggleExpandResponsable = (id: string) => {
    if (expandedResponsable === id) {
      setExpandedResponsable(null);
    } else {
      setExpandedResponsable(id);
    }
  };

  const toggleResponsableStatus = async (responsable: Responsable) => {
    try {
      const newStatus = responsable.status === 'active' ? 'inactive' : 'active';
      await updateDoc(doc(db, 'users', responsable.id), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
      
      fetchResponsables();
    } catch (error) {
      console.error('Error updating responsable status:', error);
    }
  };

  const exportToCSV = () => {
    const headers = ['Nom', 'Prénom', 'Email', 'Entreprise', 'Statut', 'Date de création'];
    const csvData = filteredResponsables.map(responsable => [
      responsable.nom,
      responsable.prenom,
      responsable.email,
      responsable.entreprise,
      responsable.status === 'active' ? 'Actif' : 'Inactif',
      new Date(responsable.createdAt).toLocaleDateString('fr-FR')
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `responsables-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-6">
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-gradient-to-r from-blue-500 to-purple-500 border-t-transparent mx-auto"></div>
          <p className="text-gray-600 mt-4 text-center">Chargement des responsables...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header with premium styling */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Gestion des Responsables
            </h1>
            <p className="text-gray-600 mt-2">Attribuez et gérez les responsables d'entreprise</p>
          </div>
          <Button 
            onClick={() => setShowForm(true)} 
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 border-0 rounded-2xl px-6 py-3 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
          >
            <UserCog className="h-5 w-5 mr-2" />
            Nouveau Responsable
          </Button>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300 p-6">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1">
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-gradient-to-br from-blue-500 to-indigo-600 p-2 rounded-xl">
                <Search className="h-4 w-4 text-white" />
              </div>
              <Input
                placeholder="Rechercher un responsable..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-16 h-12 rounded-2xl border-gray-200/60 bg-white/80 backdrop-blur-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all"
              />
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowFilters(!showFilters)}
                className="rounded-2xl border-gray-200/60 bg-white/80 backdrop-blur-sm hover:bg-white transition-all flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Filtres
              </Button>
              
              <Button 
                onClick={exportToCSV}
                variant="outline" 
                className="rounded-2xl border-gray-200/60 bg-white/80 backdrop-blur-sm hover:bg-white transition-all flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Exporter
              </Button>

              {(searchTerm || selectedCompany || selectedStatus) && (
                <Button 
                  variant="ghost" 
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCompany('');
                    setSelectedStatus('');
                  }}
                  className="rounded-2xl hover:bg-gray-100/80 backdrop-blur-sm flex items-center gap-1"
                >
                  <X className="h-4 w-4" />
                  Réinitialiser
                </Button>
              )}
            </div>
          </div>

          {showFilters && (
            <div className="mt-4 p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl border border-blue-100/50 space-y-4">
              <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filtres avancés
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Entreprise</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                      <Building className="h-4 w-4 text-gray-500" />
                    </div>
                    <select
                      value={selectedCompany}
                      onChange={(e) => setSelectedCompany(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/80 backdrop-blur-sm"
                    >
                      <option value="">Toutes les entreprises</option>
                      {companies.map((company) => (
                        <option key={company.id} value={company.nom}>
                          {company.nom}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Statut</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                      {selectedStatus === 'active' ? (
                        <UserCheck className="h-4 w-4 text-green-500" />
                      ) : selectedStatus === 'inactive' ? (
                        <UserX className="h-4 w-4 text-red-500" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-500" />
                      )}
                    </div>
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/80 backdrop-blur-sm"
                    >
                      <option value="">Tous les statuts</option>
                      <option value="active">Actif</option>
                      <option value="inactive">Inactif</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Add/Edit Responsable Dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl border border-white/20 shadow-2xl">
            <DialogHeader className="px-6 pt-6 pb-4 border-b border-blue-200/50 bg-white/90 backdrop-blur-sm rounded-t-3xl">
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {editingResponsable ? 'Modifier le responsable' : 'Attribuer un responsable'}
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600 mt-1">
                {editingResponsable 
                  ? 'Modifiez le responsable attribué à cette entreprise' 
                  : 'Sélectionnez un employé existant comme responsable d\'entreprise'}
              </DialogDescription>
            </DialogHeader>
            
            {formError && (
              <div className="mx-6 mt-4 bg-red-100 border border-red-300 text-red-700 text-sm p-3 rounded-xl flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                {formError}
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6 bg-white/90 backdrop-blur-sm">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 leading-none">
                    Sélectionner un employé <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-gradient-to-br from-blue-500 to-indigo-600 p-2 rounded-xl">
                      <Users className="h-4 w-4 text-white" />
                    </div>
                    <select
                      value={selectedEmployee}
                      onChange={(e) => setSelectedEmployee(e.target.value)}
                      className="flex h-12 w-full rounded-2xl border border-gray-300 bg-white/80 backdrop-blur-sm pl-16 pr-4 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                      required
                    >
                      <option value="">Sélectionner un employé</option>
                      {employeesLoading ? (
                        <option value="" disabled>Chargement des employés...</option>
                      ) : (
                        employees.map((employee) => (
                          <option 
                            key={employee.id} 
                            value={employee.id}
                          >
                            {employee.prenom} {employee.nom} - {employee.email} ({employee.entreprise})
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                {selectedEmployee && (
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-2xl text-sm text-blue-700 flex items-start">
                    <svg className="w-5 h-5 mr-2 mt-0.5 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <p>
                      <strong>Information :</strong> L'employé sélectionné sera promu au rôle de responsable 
                      et pourra gérer l'entreprise "{employees.find(e => e.id === selectedEmployee)?.entreprise}".
                    </p>
                  </div>
                )}
              </div>
              
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4 border-t border-gray-200/50">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setEditingResponsable(null);
                    setSelectedEmployee('');
                    setFormError(null);
                  }}
                  className="h-11 rounded-xl border-gray-300 text-gray-700 hover:bg-gray-100 transition-all"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  className="h-11 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                  disabled={!selectedEmployee}
                >
                  {editingResponsable ? (
                    <>
                      <Edit className="h-4 w-4 mr-2" />
                      Modifier
                    </>
                  ) : (
                    <>
                      <UserCog className="h-4 w-4 mr-2" />
                      Attribuer
                    </>
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
{/* Statistics Card */}
        {responsables.length > 0 && (
          <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300 p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-2xl border border-blue-200/50">
                <div className="flex items-center">
                  <div className="bg-blue-500 p-3 rounded-xl mr-4">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-700">Total responsables</p>
                    <p className="text-2xl font-bold text-blue-900">{responsables.length}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-2xl border border-green-200/50">
                <div className="flex items-center">
                  <div className="bg-green-500 p-3 rounded-xl mr-4">
                    <UserCheck className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-green-700">Responsables actifs</p>
                    <p className="text-2xl font-bold text-green-900">
                      {responsables.filter(r => r.status === 'active').length}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-2xl border border-red-200/50">
                <div className="flex items-center">
                  <div className="bg-red-500 p-3 rounded-xl mr-4">
                    <UserX className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-red-700">Responsables inactifs</p>
                    <p className="text-2xl font-bold text-red-900">
                      {responsables.filter(r => r.status === 'inactive').length}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Responsables List */}
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden">
          <div className="p-6 border-b border-gray-200/50">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                  Liste des responsables
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {filteredResponsables.length} responsable(s) trouvé(s)
                  {selectedCompany && ` • Filtre: ${selectedCompany}`}
                  {selectedStatus && ` • Statut: ${selectedStatus === 'active' ? 'Actif' : 'Inactif'}`}
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Trier par:</span>
                <div className="relative">
                  <select
                    onChange={(e) => requestSort(e.target.value)}
                    className="rounded-xl border border-gray-300 bg-white/80 backdrop-blur-sm px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sélectionner</option>
                    <option value="nom">Nom</option>
                    <option value="entreprise">Entreprise</option>
                    <option value="createdAt">Date de création</option>
                  </select>
                  <ArrowUpDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-500" />
                </div>
              </div>
            </div>
          </div>

          <div className="p-6">
            {filteredResponsables.length > 0 ? (
              <div className="overflow-hidden rounded-2xl border border-gray-200/50">
                {/* Desktop Table */}
                <div className="hidden md:block">
                  <table className="min-w-full divide-y divide-gray-200/50">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                      <tr>
                        <th 
                          className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100/50 transition-colors"
                          onClick={() => requestSort('nom')}
                        >
                          <div className="flex items-center">
                            Responsable
                            {sortConfig.key === 'nom' && (
                              sortConfig.direction === 'ascending' ? 
                              <ChevronUp className="ml-1 h-4 w-4" /> : 
                              <ChevronDown className="ml-1 h-4 w-4" />
                            )}
                          </div>
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Email
                        </th>
                        <th 
                          className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100/50 transition-colors"
                          onClick={() => requestSort('entreprise')}
                        >
                          <div className="flex items-center">
                            Entreprise
                            {sortConfig.key === 'entreprise' && (
                              sortConfig.direction === 'ascending' ? 
                              <ChevronUp className="ml-1 h-4 w-4" /> : 
                              <ChevronDown className="ml-1 h-4 w-4" />
                            )}
                          </div>
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Statut
                        </th>
                        <th 
                          className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100/50 transition-colors"
                          onClick={() => requestSort('createdAt')}
                        >
                          <div className="flex items-center">
                            Date création
                            {sortConfig.key === 'createdAt' && (
                              sortConfig.direction === 'ascending' ? 
                              <ChevronUp className="ml-1 h-4 w-4" /> : 
                              <ChevronDown className="ml-1 h-4 w-4" />
                            )}
                          </div>
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200/50">
                      {filteredResponsables.map((responsable) => (
                        <tr key={responsable.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-10 w-10 flex-shrink-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                                <span className="font-medium text-white text-sm">
                                  {responsable.prenom.charAt(0)}{responsable.nom.charAt(0)}
                                </span>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-semibold text-gray-900">
                                  {responsable.prenom} {responsable.nom}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex items-center">
                              <Mail className="h-4 w-4 mr-2 text-blue-500" />
                              {responsable.email}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex items-center">
                              <Building className="h-4 w-4 mr-2 text-purple-500" />
                              {responsable.entreprise}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge 
                              variant={responsable.status === 'active' ? "default" : "secondary"}
                              className="cursor-pointer rounded-xl px-3 py-1 font-medium transition-all hover:scale-105"
                              onClick={() => toggleResponsableStatus(responsable)}
                            >
                              {responsable.status === 'active' ? (
                                <>
                                  <UserCheck className="h-3 w-3 mr-1" />
                                  Actif
                                </>
                              ) : (
                                <>
                                  <UserX className="h-3 w-3 mr-1" />
                                  Inactif
                                </>
                              )}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                              {new Date(responsable.createdAt).toLocaleDateString('fr-FR')}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(responsable)}
                              title="Modifier"
                              className="rounded-xl text-blue-600 hover:bg-blue-50 hover:text-blue-700 transition-all"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(responsable.id)}
                              title="Supprimer"
                              className="rounded-xl text-red-600 hover:bg-red-50 hover:text-red-700 transition-all"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-4">
                  {filteredResponsables.map((responsable) => (
                    <div 
                      key={responsable.id} 
                      className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 p-4 hover:shadow-lg transition-all duration-300"
                    >
                      <div 
                        className="cursor-pointer"
                        onClick={() => toggleExpandResponsable(responsable.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="h-12 w-12 flex-shrink-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                              <span className="font-medium text-white">
                                {responsable.prenom.charAt(0)}{responsable.nom.charAt(0)}
                              </span>
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-semibold text-gray-900">
                                {responsable.prenom} {responsable.nom}
                              </div>
                              <div className="text-xs text-gray-500 flex items-center mt-1">
                                <Building className="h-3 w-3 mr-1" />
                                {responsable.entreprise}
                              </div>
                            </div>
                          </div>
                          <div>
                            {expandedResponsable === responsable.id ? (
                              <ChevronUp className="h-5 w-5 text-gray-400" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                        </div>
                        
                        <div className="mt-3 flex justify-between items-center">
                          <Badge 
                            variant={responsable.status === 'active' ? "default" : "secondary"}
                            className="cursor-pointer rounded-xl px-2 py-1 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleResponsableStatus(responsable);
                            }}
                          >
                            {responsable.status === 'active' ? 'Actif' : 'Inactif'}
                          </Badge>
                          <div className="text-xs text-gray-500 flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {new Date(responsable.createdAt).toLocaleDateString('fr-FR')}
                          </div>
                        </div>
                      </div>
                      
                      {expandedResponsable === responsable.id && (
                        <div className="mt-4 pt-4 border-t border-gray-200/50 space-y-3">
                          <div className="grid gap-2 text-sm">
                            <div className="flex items-center">
                              <Mail className="h-4 w-4 mr-2 text-blue-500" />
                              {responsable.email}
                            </div>
                          </div>
                          
                          <div className="flex justify-end space-x-2 mt-4">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(responsable)}
                              className="rounded-xl border-blue-200 text-blue-600 hover:bg-blue-50"
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Modifier
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(responsable.id)}
                              className="rounded-xl border-red-200 text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Supprimer
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border border-gray-200/50">
                <div className="bg-gradient-to-br from-blue-100 to-purple-100 p-6 rounded-3xl inline-block mb-6">
                  <Users className="h-16 w-16 text-blue-600 mx-auto" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Aucun responsable trouvé</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  {searchTerm || selectedCompany || selectedStatus
                    ? 'Essayez de modifier vos critères de recherche' 
                    : 'Commencez par attribuer un responsable à une entreprise'
                  }
                </p>
                <div className="mt-6">
                  <Button 
                    onClick={() => setShowForm(true)}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 border-0 rounded-2xl px-6 py-3 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                  >
                    <UserCog className="h-5 w-5 mr-2" />
                    Attribuer un responsable
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        
      </div>
    </div>
  );
}
