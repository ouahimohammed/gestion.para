import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Label } from '../components/ui/Label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/Dialog';
import { 
  collection, query, getDocs, where, addDoc, updateDoc, deleteDoc, doc 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { setDoc } from "firebase/firestore";
import { formatDate } from '../lib/utils';
import { 
  Plus, Edit, Trash2, User, Info, Search, Filter, UserPlus, X, 
  Phone, Mail, Building, Calendar, Briefcase, CreditCard,
  ChevronDown, ChevronUp, AlertCircle, Users, TrendingUp,
  MapPin, Globe, Award, Clock
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
        if (a[sortConfig.key as keyof Employee] < b[sortConfig.key as keyof Employee]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key as keyof Employee] > b[sortConfig.key as keyof Employee]) {
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

  const getInitials = (prenom: string, nom: string) => {
    return `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase();
  };

  const getGradientForEmployee = (index: number) => {
    const gradients = [
      'bg-gradient-to-br from-blue-500 to-purple-600',
      'bg-gradient-to-br from-green-500 to-teal-600',
      'bg-gradient-to-br from-orange-500 to-red-600',
      'bg-gradient-to-br from-purple-500 to-pink-600',
      'bg-gradient-to-br from-indigo-500 to-blue-600',
      'bg-gradient-to-br from-teal-500 to-cyan-600'
    ];
    return gradients[index % gradients.length];
  };

  if (loading) {
    return (
      <div className="min-h-screen  ">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="relative">
              <div className="w-16 h-16 mx-auto mb-4">
                <div className="absolute top-0 left-0 w-full h-full border-4 border-indigo-200 rounded-full animate-pulse"></div>
                <div className="absolute top-0 left-0 w-full h-full border-t-4 border-indigo-600 rounded-full animate-spin"></div>
              </div>
            </div>
            <p className="text-lg text-gray-600 font-medium">Chargement des employés...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen  ">
      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-800 bg-clip-text text-transparent">
                Gestion des Employés
              </h1>
              <p className="text-lg text-gray-600 leading-relaxed">
                Gérez votre équipe avec style et efficacité
              </p>
            </div>
            
            {/* Stats Cards */}
            <div className="flex gap-4">
              
              <Button 
                onClick={() => setShowForm(true)} 
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                size="lg"
              >
                <UserPlus className="h-5 w-5 mr-2" />
                Nouvel employé
              </Button>
            </div>
          </div>
        </div>

        {/* Search and Filters Card */}
        <Card className="mb-8 bg-white/70 backdrop-blur-sm border-white/20 shadow-xl">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  placeholder="Rechercher par nom, prénom, poste ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 h-12 bg-white/50 border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200"
                />
              </div>
              
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 h-12 bg-white/50 border-gray-200 hover:bg-white/80 transition-all duration-200"
                >
                  <Filter className="h-4 w-4" />
                  Filtres
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`} />
                </Button>
                
                {(searchTerm || selectedCompany) && (
                  <Button 
                    variant="ghost" 
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedCompany('');
                    }}
                    className="flex items-center gap-2 h-12 hover:bg-red-50 hover:text-red-600 transition-colors"
                  >
                    <X className="h-4 w-4" />
                    Réinitialiser
                  </Button>
                )}
              </div>
            </div>

            {showFilters && userProfile?.role === 'super_admin' && (
              <div className="mt-6 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                <Label className="block text-sm font-semibold mb-3 text-gray-700">
                  Filtrer par entreprise
                </Label>
                <select
                  value={selectedCompany}
                  onChange={(e) => setSelectedCompany(e.target.value)}
                  className="w-full md:w-80 h-11 border border-gray-200 rounded-lg px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
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

        {/* Employees Grid */}
        {filteredEmployees.length > 0 ? (
          <div className="space-y-6">
            {/* Results Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                {filteredEmployees.length} employé{filteredEmployees.length > 1 ? 's' : ''} trouvé{filteredEmployees.length > 1 ? 's' : ''}
              </h2>
              {selectedCompany && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  <Building className="h-3 w-3 mr-1" />
                  {selectedCompany}
                </Badge>
              )}
            </div>

            {/* Desktop View */}
            <div className="hidden lg:block">
              <Card className="bg-white/70 backdrop-blur-sm border-white/20 shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-200">
                        <th 
                          className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-blue-50 transition-colors"
                          onClick={() => requestSort('nom')}
                        >
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Employé
                            {sortConfig.key === 'nom' && (
                              sortConfig.direction === 'ascending' ? 
                              <ChevronUp className="h-4 w-4 text-indigo-600" /> : 
                              <ChevronDown className="h-4 w-4 text-indigo-600" />
                            )}
                          </div>
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4" />
                            CIN
                          </div>
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                          <div className="flex items-center gap-2">
                            <Briefcase className="h-4 w-4" />
                            Poste
                          </div>
                        </th>
                        {userProfile?.role === 'super_admin' && (
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                            <div className="flex items-center gap-2">
                              <Building className="h-4 w-4" />
                              Entreprise
                            </div>
                          </th>
                        )}
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Date embauche
                          </div>
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Congés
                          </div>
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {filteredEmployees.map((employee, index) => (
                        <tr key={employee.id} className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-4">
                              <div className={`h-12 w-12 rounded-xl ${getGradientForEmployee(index)} flex items-center justify-center shadow-lg`}>
                                <span className="font-bold text-white text-sm">
                                  {getInitials(employee.prenom, employee.nom)}
                                </span>
                              </div>
                              <div>
                                <div className="text-sm font-semibold text-gray-900">
                                  {employee.prenom} {employee.nom}
                                </div>
                                {employee.email && (
                                  <div className="text-sm text-gray-500 flex items-center gap-1">
                                    <Mail className="h-3 w-3" />
                                    {employee.email}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-medium text-gray-900 bg-gray-50 px-2 py-1 rounded-md">
                              {employee.cin}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge variant="secondary" className="bg-purple-50 text-purple-700 border-purple-200">
                              {employee.poste}
                            </Badge>
                          </td>
                          {userProfile?.role === 'super_admin' && (
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <Building className="h-4 w-4 text-gray-400" />
                                <span className="text-sm text-gray-900">{employee.entreprise}</span>
                              </div>
                            </td>
                          )}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              <span className="text-sm text-gray-900">{formatDate(employee.date_embauche)}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge 
                              variant={employee.solde_conge > 20 ? "default" : employee.solde_conge > 10 ? "secondary" : "destructive"}
                              className="font-semibold"
                            >
                              {employee.solde_conge} jours
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEdit(employee)}
                                className="hover:bg-blue-100 hover:text-blue-700 transition-colors"
                                title="Modifier"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDelete(employee.id)}
                                className="hover:bg-red-100 hover:text-red-700 transition-colors"
                                title="Supprimer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden space-y-4">
              {filteredEmployees.map((employee, index) => (
                <Card key={employee.id} className="bg-white/80 backdrop-blur-sm border-white/20 shadow-lg hover:shadow-xl transition-all duration-200">
                  <CardContent className="p-0">
                    <div 
                      className="p-6 cursor-pointer"
                      onClick={() => toggleExpandEmployee(employee.id)}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div className={`h-14 w-14 rounded-xl ${getGradientForEmployee(index)} flex items-center justify-center shadow-lg`}>
                            <span className="font-bold text-white">
                              {getInitials(employee.prenom, employee.nom)}
                            </span>
                          </div>
                          <div>
                            <div className="text-lg font-semibold text-gray-900">
                              {employee.prenom} {employee.nom}
                            </div>
                            <div className="text-sm text-gray-600 flex items-center gap-1">
                              <Briefcase className="h-3 w-3" />
                              {employee.poste}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={employee.solde_conge > 20 ? "default" : employee.solde_conge > 10 ? "secondary" : "destructive"}
                            className="font-semibold"
                          >
                            {employee.solde_conge}j
                          </Badge>
                          {expandedEmployee === employee.id ? (
                            <ChevronUp className="h-5 w-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-sm">
                          <div className="flex items-center gap-2 text-gray-600">
                            <CreditCard className="h-4 w-4" />
                            <span className="font-medium">{employee.cin}</span>
                          </div>
                        </div>
                        <div className="text-sm">
                          <div className="flex items-center gap-2 text-gray-600">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDate(employee.date_embauche)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {expandedEmployee === employee.id && (
                      <div className="px-6 pb-6 bg-gradient-to-r from-gray-50 to-blue-50 border-t border-gray-100">
                        <div className="space-y-4 pt-4">
                          <div className="grid grid-cols-1 gap-3">
                            {userProfile?.role === 'super_admin' && (
                              <div className="flex items-center gap-2 text-sm">
                                <Building className="h-4 w-4 text-gray-400" />
                                <span className="text-gray-700">{employee.entreprise}</span>
                              </div>
                            )}
                            {employee.email && (
                              <div className="flex items-center gap-2 text-sm">
                                <Mail className="h-4 w-4 text-gray-400" />
                                <span className="text-gray-700">{employee.email}</span>
                              </div>
                            )}
                            {employee.telephone && (
                              <div className="flex items-center gap-2 text-sm">
                                <Phone className="h-4 w-4 text-gray-400" />
                                <span className="text-gray-700">+212 {employee.telephone}</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex gap-3 pt-4 border-t border-gray-200">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(employee)}
                              className="flex-1 bg-white hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition-all duration-200"
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Modifier
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(employee.id)}
                              className="flex-1 bg-white hover:bg-red-50 hover:text-red-700 hover:border-red-300 transition-all duration-200"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Supprimer
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <Card className="bg-white/70 backdrop-blur-sm border-white/20 shadow-xl">
            <CardContent className="py-16">
              <div className="text-center">
                <div className="mx-auto h-32 w-32 mb-6">
                  <div className="h-full w-full bg-gradient-to-br from-blue-100 to-indigo-200 rounded-full flex items-center justify-center">
                    <Users className="h-16 w-16 text-gray-400" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Aucun employé trouvé</h3>
                <p className="text-lg text-gray-600 mb-8">
                  {searchTerm || selectedCompany 
                    ? 'Essayez de modifier vos critères de recherche' 
                    : 'Commencez par ajouter votre premier employé à l\'équipe'}
                </p>
                <div className="space-y-4">
                  <Button 
                    onClick={() => setShowForm(true)}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                    size="lg"
                  >
                    <UserPlus className="h-5 w-5 mr-2" />
                    Ajouter le premier employé
                  </Button>
                  {(searchTerm || selectedCompany) && (
                    <div>
                      <Button 
                        variant="outline"
                        onClick={() => {
                          setSearchTerm('');
                          setSelectedCompany('');
                        }}
                        className="ml-4"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Réinitialiser les filtres
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add/Edit Employee Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border-0">
          <DialogHeader className="space-y-3 px-6 pt-6 pb-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg mb-2">
              {editingEmployee ? 
                <Edit className="h-8 w-8 text-white" /> : 
                <UserPlus className="h-8 w-8 text-white" />
              }
            </div>
            <DialogTitle className="text-2xl text-center text-gray-900 font-bold">
              {editingEmployee ? 'Modifier l\'employé' : 'Ajouter un employé'}
            </DialogTitle>
            <DialogDescription className="text-center text-gray-600">
              {editingEmployee 
                ? 'Modifiez les informations de l\'employé ci-dessous' 
                : 'Remplissez les informations pour ajouter un nouvel employé à votre équipe'}
            </DialogDescription>
          </DialogHeader>
          
          {formError && (
            <div className="mx-6 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 text-red-700 text-sm p-4 rounded-xl flex items-start gap-3">
              <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="p-6 space-y-8">
            {/* Informations personnelles */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-3 rounded-full shadow-lg">
                  <User className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Informations personnelles</h3>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="nom" className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                    Nom <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="nom"
                    required
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    className="h-12 rounded-xl border-gray-300 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                    placeholder="Entrez le nom"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="prenom" className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                    Prénom <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="prenom"
                    required
                    value={formData.prenom}
                    onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                    className="h-12 rounded-xl border-gray-300 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                    placeholder="Entrez le prénom"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="cin" className="text-sm font-semibold text-gray-700">
                    CIN
                  </Label>
                  <Input
                    id="cin"
                    value={formData.cin}
                    onChange={(e) => setFormData({ ...formData, cin: e.target.value })}
                    className="h-12 rounded-xl border-gray-300 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                    placeholder="Numéro de CIN"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="telephone" className="text-sm font-semibold text-gray-700">
                    Téléphone
                  </Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                      <span className="text-gray-500 font-medium">+212</span>
                    </div>
                    <Input
                      id="telephone"
                      type="tel"
                      value={formData.telephone}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        if (value.length <= 9) {
                          setFormData({ ...formData, telephone: value });
                        }
                      }}
                      className="h-12 rounded-xl border-gray-300 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 pl-16"
                      placeholder="612-345-678"
                      maxLength={9}
                    />
                  </div>
                  <p className="text-xs text-gray-500">Format: 612345678 (9 chiffres)</p>
                </div>
              </div>
            </div>
            
            {/* Informations professionnelles */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-3 rounded-full shadow-lg">
                  <Briefcase className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Informations professionnelles</h3>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="poste" className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                    Poste <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="poste"
                    required
                    value={formData.poste}
                    onChange={(e) => setFormData({ ...formData, poste: e.target.value })}
                    className="h-12 rounded-xl border-gray-300 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                    placeholder="Poste de l'employé"
                  />
                </div>
                
                {userProfile?.role === 'super_admin' && (
                  <div className="space-y-2">
                    <Label htmlFor="entreprise" className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                      Entreprise <span className="text-red-500">*</span>
                    </Label>
                    <select
                      id="entreprise"
                      value={formData.entreprise}
                      onChange={(e) => setFormData({ ...formData, entreprise: e.target.value })}
                      className="flex h-12 w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-2 text-sm focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200"
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
                  <Label htmlFor="date_embauche" className="text-sm font-semibold text-gray-700">
                    Date d'embauche
                  </Label>
                  <Input
                    id="date_embauche"
                    type="date"
                    value={formData.date_embauche}
                    onChange={(e) => setFormData({ ...formData, date_embauche: e.target.value })}
                    className="h-12 rounded-xl border-gray-300 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="solde_conge" className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                    Solde congé <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="solde_conge"
                      type="number"
                      required
                      value={formData.solde_conge}
                      onChange={(e) => setFormData({ ...formData, solde_conge: parseInt(e.target.value) || 0 })}
                      className="h-12 rounded-xl border-gray-300 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 pr-14"
                      placeholder="0"
                      min="0"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                      <span className="text-gray-500 text-sm font-medium">jours</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {!editingEmployee && (
              <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200">
                <div className="flex items-start gap-3">
                  <Info className="h-6 w-6 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-blue-900 mb-2">Information importante</p>
                    <p className="text-sm text-blue-800 leading-relaxed">
                      Un compte utilisateur sera automatiquement créé avec l'email généré à partir du nom et prénom, 
                      et le mot de passe par défaut <span className="font-bold bg-blue-100 px-2 py-1 rounded">123456</span>.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-4 pt-6 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setEditingEmployee(null);
                  setFormError(null);
                }}
                className="h-12 rounded-xl border-gray-300 hover:bg-gray-50 transition-colors"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                className="h-12 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 px-8"
              >
                {editingEmployee ? 'Modifier l\'employé' : 'Ajouter l\'employé'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
} 
