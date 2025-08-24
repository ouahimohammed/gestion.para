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
  Mail, Building, UserCheck, UserX, ChevronDown, ChevronUp, Users
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
  }, [responsables, searchTerm, selectedCompany, sortConfig]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Gestion des Responsables</h1>
          <p className="text-sm text-gray-600 mt-1">
            Sélectionnez des employés existants comme responsables d'entreprise
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
          <UserCog className="h-4 w-4" />
          <span>Attribuer un responsable</span>
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher un responsable..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                <span>Filtres</span>
              </Button>
              
              {(searchTerm || selectedCompany) && (
                <Button 
                  variant="ghost" 
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCompany('');
                  }}
                  className="flex items-center gap-1"
                >
                  <X className="h-4 w-4" />
                  <span>Réinitialiser</span>
                </Button>
              )}
            </div>
          </div>

          {showFilters && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <label className="block text-sm font-medium mb-2">Filtrer par entreprise</label>
              <select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="w-full md:w-64 border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Toutes les entreprises</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.nom}>
                    {company.nom}
                  </option>
                ))}
              </select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Responsable Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="text-xl font-semibold">
              {editingResponsable ? 'Modifier le responsable' : 'Attribuer un responsable'}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              {editingResponsable 
                ? 'Modifiez le responsable attribué à cette entreprise' 
                : 'Sélectionnez un employé existant comme responsable d\'entreprise'}
            </DialogDescription>
          </DialogHeader>
          
          {formError && (
            <div className="mx-6 mt-4 bg-destructive/15 border border-destructive/50 text-destructive text-sm p-3 rounded-md">
              {formError}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Sélectionner un employé <span className="text-destructive">*</span>
                </label>
                <select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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

              {selectedEmployee && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-800">
                  <p>
                    <strong>Information :</strong> L'employé sélectionné sera promu au rôle de responsable 
                    et pourra gérer l'entreprise "{employees.find(e => e.id === selectedEmployee)?.entreprise}".
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setEditingResponsable(null);
                  setSelectedEmployee('');
                  setFormError(null);
                }}
                className="h-10"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                className="h-10"
                disabled={!selectedEmployee}
              >
                {editingResponsable ? 'Modifier' : 'Attribuer'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Responsables List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Liste des responsables ({filteredResponsables.length})</CardTitle>
          <div className="text-sm text-gray-500">
            {selectedCompany && `Filtré par: ${selectedCompany}`}
          </div>
        </CardHeader>
        <CardContent>
          {filteredResponsables.length > 0 ? (
            <div className="overflow-hidden rounded-lg border border-gray-200">
              {/* Desktop Table */}
              <div className="hidden md:block">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
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
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Entreprise
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Statut
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date création
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredResponsables.map((responsable) => (
                      <tr key={responsable.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 flex-shrink-0 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="font-medium text-blue-800">
                                {responsable.prenom.charAt(0)}{responsable.nom.charAt(0)}
                              </span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {responsable.prenom} {responsable.nom}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center">
                            <Mail className="h-4 w-4 mr-1 text-gray-400" />
                            {responsable.email}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center">
                            <Building className="h-4 w-4 mr-1 text-gray-400" />
                            {responsable.entreprise}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge 
                            variant={responsable.status === 'active' ? "default" : "secondary"}
                            className="cursor-pointer"
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
                          {new Date(responsable.createdAt).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(responsable)}
                            title="Modifier"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(responsable.id)}
                            title="Supprimer"
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
              <div className="md:hidden">
                {filteredResponsables.map((responsable) => (
                  <div key={responsable.id} className="border-b border-gray-200 last:border-b-0">
                    <div 
                      className="p-4 hover:bg-gray-50 cursor-pointer"
                      onClick={() => toggleExpandResponsable(responsable.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="font-medium text-blue-800">
                              {responsable.prenom.charAt(0)}{responsable.nom.charAt(0)}
                            </span>
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {responsable.prenom} {responsable.nom}
                            </div>
                            <div className="text-sm text-gray-500">{responsable.entreprise}</div>
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
                      
                      <div className="mt-2 flex justify-between items-center">
                        <Badge 
                          variant={responsable.status === 'active' ? "default" : "secondary"}
                          className="cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleResponsableStatus(responsable);
                          }}
                        >
                          {responsable.status === 'active' ? 'Actif' : 'Inactif'}
                        </Badge>
                        <div className="text-sm text-gray-500">
                          {new Date(responsable.createdAt).toLocaleDateString('fr-FR')}
                        </div>
                      </div>
                    </div>
                    
                    {expandedResponsable === responsable.id && (
                      <div className="px-4 pb-4 bg-gray-50">
                        <div className="grid gap-2 text-sm">
                          <div className="flex items-center">
                            <Mail className="h-4 w-4 mr-2 text-gray-400" />
                            {responsable.email}
                          </div>
                        </div>
                        
                        <div className="flex justify-end space-x-2 mt-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(responsable)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Modifier
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(responsable.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
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
            <div className="text-center py-12">
              <div className="mx-auto h-24 w-24 text-gray-300">
                <Users className="h-full w-full opacity-50" />
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">Aucun responsable trouvé</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || selectedCompany 
                  ? 'Essayez de modifier vos critères de recherche' 
                  : 'Commencez par attribuer un responsable à une entreprise'}
              </p>
              <div className="mt-6">
                <Button onClick={() => setShowForm(true)}>
                  <UserCog className="h-4 w-4 mr-2" />
                  Attribuer un responsable
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}