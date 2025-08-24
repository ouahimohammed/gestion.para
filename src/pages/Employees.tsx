import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/Dialog';
import { 
  collection, query, getDocs, where, addDoc, updateDoc, deleteDoc, doc 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { setDoc } from "firebase/firestore";
import { formatDate } from '../lib/utils';
import { 
  Plus, Edit, Trash2, Search, Filter, UserPlus, X, 
  Phone, Mail, Building, Calendar, Briefcase, CreditCard,
  ChevronDown, ChevronUp
} from 'lucide-react';

interface Employee {
  id: string;
  nom: string;
  prenom: string;
  cin: string;
  poste: string;
  entreprise: string;
  date_embauche: string;
  solde_conge: number;
  email?: string;
  telephone?: string;
  userId?: string;
}

interface Company {
  id: string;
  nom: string;
}

export function Employees() {
  const { userProfile } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: '', direction: 'ascending' });
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    cin: '',
    poste: '',
    entreprise: userProfile?.role === 'responsable' ? userProfile.entreprise || '' : '',
    date_embauche: '',
    solde_conge: 25,
    email: '',
    telephone: ''
  });

  useEffect(() => {
    if (userProfile) {
      fetchEmployees();
      if (userProfile.role === 'super_admin') {
        fetchCompanies();
      }
    }
  }, [userProfile]);

  useEffect(() => {
    let filtered = employees.filter(employee =>
      employee.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.cin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.poste.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (employee.email && employee.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (selectedCompany) {
      filtered = filtered.filter(employee => employee.entreprise === selectedCompany);
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

    setFilteredEmployees(filtered);
  }, [employees, searchTerm, selectedCompany, sortConfig]);

  const requestSort = (key: string) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const fetchEmployees = async () => {
    try {
      let q;
      if (userProfile?.role === 'super_admin') {
        q = query(collection(db, 'employes'));
      } else if (userProfile?.role === 'responsable' && userProfile.entreprise) {
        q = query(collection(db, 'employes'), where('entreprise', '==', userProfile.entreprise));
      } else {
        setLoading(false);
        return;
      }

      const querySnapshot = await getDocs(q);
      const employeesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Employee));

      setEmployees(employeesData);
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
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

  const generateEmail = (prenom: string, nom: string, entreprise: string) => {
    const cleanString = (str: string) => {
      return str
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\s+/g, '.')
        .replace(/[^a-z0-9.]/g, '');
    };

    const cleanNom = cleanString(nom);
    const cleanPrenom = cleanString(prenom);
    const cleanEntreprise = cleanString(entreprise);

    return `${cleanPrenom}.${cleanNom}@${cleanEntreprise}.com`;
  };

  const createUserAccount = async (employeeData: any) => {
    try {
      if (!employeeData.entreprise || !employeeData.nom || !employeeData.prenom) {
        throw new Error('Données manquantes pour générer l\'email');
      }

      let email = generateEmail(employeeData.prenom, employeeData.nom, employeeData.entreprise);
      let counter = 1;
      let userExists = true;
      
      while (userExists) {
        try {
          // Utilisation de l'API REST Firebase Auth au lieu de createUserWithEmailAndPassword
          const response = await fetch(
  `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=AIzaSyBxgvYasrsyi9OaskNjDUpHRpoVwiMm3mc`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                email: email,
                password: '123456',
                returnSecureToken: false // Ne pas retourner de token pour éviter de changer la session
              })
            }
          );

          const data = await response.json();

          if (!response.ok) {
            if (data.error && data.error.message === 'EMAIL_EXISTS') {
              // Email déjà utilisé, on génère un nouveau
              email = generateEmail(employeeData.prenom, employeeData.nom, employeeData.entreprise);
              email = email.replace('@', `${counter}@`);
              counter++;
              continue;
            } else {
              throw new Error(data.error.message || 'Erreur lors de la création du compte');
            }
          }

          // Compte créé avec succès
          const uid = data.localId;
          
          // Créer l'utilisateur dans la collection "users" avec le rôle "employe"
          await setDoc(doc(db, "users", uid), {
            uid: uid,
            email: email,
            nom: employeeData.nom,
            prenom: employeeData.prenom,
            entreprise: employeeData.entreprise,
            role: "employe",
            createdAt: new Date().toISOString(),
            createdBy: userProfile?.uid // Utiliser l'UID de l'admin connecté
          });
          
          userExists = false;
          return { uid, email };
        } catch (error: any) {
          console.error('Error creating user account:', error);
          throw error;
        }
      }
    } catch (error) {
      console.error('Error in createUserAccount:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    
    try {
      if (editingEmployee) {
        // Mise à jour d'un employé existant
        await updateDoc(doc(db, 'employes', editingEmployee.id), formData);
      } else {
        // Création d'un nouvel employé
        const employeeData = {
          ...formData,
          createdAt: new Date().toISOString()
        };
        
        // Créer le compte utilisateur Firebase Auth et l'enregistrer dans "users"
        const userInfo = await createUserAccount(formData);
        
        // Ajouter l'employé dans la collection "employes" avec l'ID de l'utilisateur
        await addDoc(collection(db, 'employes'), {
          ...employeeData,
          email: userInfo.email,
          userId: userInfo.uid
        });
      }
      
      setShowForm(false);
      setEditingEmployee(null);
      setFormData({
        nom: '',
        prenom: '',
        cin: '',
        poste: '',
        entreprise: userProfile?.role === 'responsable' ? userProfile.entreprise || '' : '',
        date_embauche: '',
        solde_conge: 25,
        email: '',
        telephone: ''
      });
      
      fetchEmployees();
    } catch (error: any) {
      console.error('Error saving employee:', error);
      setFormError(error.message || 'Erreur lors de la sauvegarde de l\'employé. Veuillez réessayer.');
    }
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      nom: employee.nom,
      prenom: employee.prenom,
      cin: employee.cin,
      poste: employee.poste,
      entreprise: employee.entreprise,
      date_embauche: employee.date_embauche,
      solde_conge: employee.solde_conge,
      email: employee.email || '',
      telephone: employee.telephone || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet employé ?')) {
      try {
        await deleteDoc(doc(db, 'employes', id));
        fetchEmployees();
      } catch (error) {
        console.error('Error deleting employee:', error);
      }
    }
  };

  const toggleExpandEmployee = (id: string) => {
    if (expandedEmployee === id) {
      setExpandedEmployee(null);
    } else {
      setExpandedEmployee(id);
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
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Gestion des Employés</h1>
          <p className="text-sm text-gray-600 mt-1">
            Gérez les employés de votre entreprise
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          <span>Ajouter un employé</span>
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher un employé..."
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

          {showFilters && userProfile?.role === 'super_admin' && (
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

      {/* Add/Edit Employee Dialog */}
      {/* Add/Edit Employee Dialog */}
<Dialog open={showForm} onOpenChange={setShowForm}>
  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
    <DialogHeader className="px-6 pt-6 pb-4 border-b">
      <DialogTitle className="text-xl font-semibold">
        {editingEmployee ? 'Modifier l\'employé' : 'Ajouter un employé'}
      </DialogTitle>
      <DialogDescription className="text-sm text-muted-foreground mt-1">
        {editingEmployee 
          ? 'Modifiez les informations de l\'employé' 
          : 'Remplissez les informations pour ajouter un nouvel employé'}
      </DialogDescription>
    </DialogHeader>
    
    {formError && (
      <div className="mx-6 mt-4 bg-destructive/15 border border-destructive/50 text-destructive text-sm p-3 rounded-md">
        {formError}
      </div>
    )}
    
    <form onSubmit={handleSubmit} className="p-6 space-y-6">
      {/* Informations personnelles */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-foreground pb-2 border-b">Informations personnelles</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Nom <span className="text-destructive">*</span>
            </label>
            <Input
              required
              value={formData.nom}
              onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
              className="h-10"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Prénom <span className="text-destructive">*</span>
            </label>
            <Input
              required
              value={formData.prenom}
              onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
              className="h-10"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              CIN <span className="text-destructive"></span>
            </label>
            <Input
              
              value={formData.cin}
              onChange={(e) => setFormData({ ...formData, cin: e.target.value })}
              className="h-10"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Téléphone
            </label>
            <Input
              type="tel"
              value={formData.telephone}
              onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
              className="h-10"
            />
          </div>
        </div>
      </div>
      
      {/* Informations professionnelles */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-foreground pb-2 border-b">Informations professionnelles</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Poste <span className="text-destructive">*</span>
            </label>
            <Input
              required
              value={formData.poste}
              onChange={(e) => setFormData({ ...formData, poste: e.target.value })}
              className="h-10"
            />
          </div>
          
          {userProfile?.role === 'super_admin' && (
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Entreprise <span className="text-destructive">*</span>
              </label>
              <select
                value={formData.entreprise}
                onChange={(e) => setFormData({ ...formData, entreprise: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required
              >
                <option value="">Sélectionner une entreprise</option>
                {companiesLoading ? (
                  <option value="" disabled>Chargement...</option>
                ) : (
                  companies.map((company) => (
                    <option key={company.id} value={company.nom}>
                      {company.nom}
                    </option>
                  ))
                )}
              </select>
            </div>
          )}
          
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Date d'embauche <span className="text-destructive"></span>
            </label>
            <Input
              type="date"
              
              value={formData.date_embauche}
              onChange={(e) => setFormData({ ...formData, date_embauche: e.target.value })}
              className="h-10"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Solde congé <span className="text-destructive">*</span>
            </label>
            <Input
              type="number"
              required
              value={formData.solde_conge}
              onChange={(e) => setFormData({ ...formData, solde_conge: parseInt(e.target.value) })}
              className="h-10"
            />
          </div>
        </div>
      </div>
      
      {!editingEmployee && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-800">
          <p>
            <strong>Information :</strong> Un compte utilisateur sera automatiquement créé avec l'email 
            généré à partir du nom et prénom, et le mot de passe par défaut <strong>123456</strong>.
          </p>
        </div>
      )}
      
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setShowForm(false);
            setEditingEmployee(null);
            setFormError(null);
          }}
          className="h-10"
        >
          Annuler
        </Button>
        <Button
          type="submit"
          className="h-10"
        >
          {editingEmployee ? 'Modifier' : 'Ajouter'}
        </Button>
      </div>
    </form>
  </DialogContent>
</Dialog>

      {/* Employees List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Liste des employés ({filteredEmployees.length})</CardTitle>
          <div className="text-sm text-gray-500">
            {selectedCompany && `Filtré par: ${selectedCompany}`}
          </div>
        </CardHeader>
        <CardContent>
          {filteredEmployees.length > 0 ? (
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
                          Employé
                          {sortConfig.key === 'nom' && (
                            sortConfig.direction === 'ascending' ? 
                            <ChevronUp className="ml-1 h-4 w-4" /> : 
                            <ChevronDown className="ml-1 h-4 w-4" />
                          )}
                        </div>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        CIN
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Poste
                      </th>
                      {userProfile?.role === 'super_admin' && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Entreprise
                        </th>
                      )}
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date embauche
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Solde congé
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredEmployees.map((employee) => (
                      <tr key={employee.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 flex-shrink-0 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="font-medium text-blue-800">
                                {employee.prenom.charAt(0)}{employee.nom.charAt(0)}
                              </span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {employee.prenom} {employee.nom}
                              </div>
                              {employee.email && (
                                <div className="text-sm text-gray-500 flex items-center">
                                  <Mail className="h-3 w-3 mr-1" />
                                  {employee.email}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {employee.cin}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {employee.poste}
                        </td>
                        {userProfile?.role === 'super_admin' && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex items-center">
                              <Building className="h-4 w-4 mr-1 text-gray-400" />
                              {employee.entreprise}
                            </div>
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                            {formatDate(employee.date_embauche)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={employee.solde_conge > 20 ? "default" : "secondary"}>
                            {employee.solde_conge} jours
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(employee)}
                            title="Modifier"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(employee.id)}
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
                {filteredEmployees.map((employee) => (
                  <div key={employee.id} className="border-b border-gray-200 last:border-b-0">
                    <div 
                      className="p-4 hover:bg-gray-50 cursor-pointer"
                      onClick={() => toggleExpandEmployee(employee.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="font-medium text-blue-800">
                              {employee.prenom.charAt(0)}{employee.nom.charAt(0)}
                            </span>
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {employee.prenom} {employee.nom}
                            </div>
                            <div className="text-sm text-gray-500">{employee.poste}</div>
                          </div>
                        </div>
                        <div>
                          {expandedEmployee === employee.id ? (
                            <ChevronUp className="h-5 w-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                      </div>
                      
                      <div className="mt-2 flex justify-between">
                        <div className="text-sm text-gray-500 flex items-center">
                          <CreditCard className="h-4 w-4 mr-1" />
                          {employee.cin}
                        </div>
                        <Badge variant={employee.solde_conge > 20 ? "default" : "secondary"}>
                          {employee.solde_conge} jours
                        </Badge>
                      </div>
                    </div>
                    
                    {expandedEmployee === employee.id && (
                      <div className="px-4 pb-4 bg-gray-50">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center">
                            <Building className="h-4 w-4 mr-1 text-gray-400" />
                            {employee.entreprise}
                          </div>
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                            {formatDate(employee.date_embauche)}
                          </div>
                          {employee.email && (
                            <div className="flex items-center col-span-2">
                              <Mail className="h-4 w-4 mr-1 text-gray-400" />
                              {employee.email}
                            </div>
                          )}
                          {employee.telephone && (
                            <div className="flex items-center col-span-2">
                              <Phone className="h-4 w-4 mr-1 text-gray-400" />
                              {employee.telephone}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex justify-end space-x-2 mt-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(employee)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Modifier
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(employee.id)}
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
                <UserPlus className="h-full w-full opacity-50" />
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">Aucun employé trouvé</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || selectedCompany 
                  ? 'Essayez de modifier vos critères de recherche' 
                  : 'Commencez par ajouter votre premier employé'}
              </p>
              <div className="mt-6">
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un employé
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}