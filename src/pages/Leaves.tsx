import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { collection, query, getDocs, where, addDoc, updateDoc, doc, orderBy, runTransaction } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatDate, calculateLeaveDays } from '../lib/utils';
import { Plus, Check, X, FileText, Calendar, User, Filter, Building } from 'lucide-react';

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
  solde_conge?: number; // Ajout du solde
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
    
    // Filtre par employé
    if (selectedEmployee !== 'all') {
      filtered = filtered.filter(leave => leave.employe_id === selectedEmployee);
    }
    
    // Filtre par entreprise (pour super admin)
    if (selectedCompany !== 'all') {
      filtered = filtered.filter(leave => leave.entreprise === selectedCompany);
    }
    
    setFilteredLeaves(filtered);
  }, [leaves, selectedEmployee, selectedCompany]);

  // Filtrer les employés en fonction de l'entreprise sélectionnée
  useEffect(() => {
    if (selectedCompany === 'all') {
      setFilteredEmployees(allEmployees);
    } else {
      setFilteredEmployees(allEmployees.filter(employee => employee.entreprise === selectedCompany));
    }
    
    // Réinitialiser le filtre employé quand l'entreprise change
    setSelectedEmployee('all');
  }, [selectedCompany, allEmployees]);

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
      // Rechercher l'employé dans la collection employes par userId
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
      // D'ABORD: Lire tous les documents nécessaires
      const leaveRef = doc(db, 'conges', leaveId);
      
      // Rechercher l'employé dans employes par employe_id (qui est le userId)
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
      
      // ENSUITE: Écrire les modifications
      transaction.update(leaveRef, {
        statut: newStatus,
        updated_at: new Date().toISOString(),
      });
      
      // Gestion du solde pour les congés annuels
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
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'annuel':
        return <Badge variant="default">Congé annuel</Badge>;
      case 'maladie':
        return <Badge variant="destructive">Congé maladie</Badge>;
      case 'exceptionnel':
        return <Badge variant="secondary">Congé exceptionnel</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
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
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Gestion des Congés</h1>
          {userProfile?.role === 'employe' && (
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Demander un congé
            </Button>
          )}
        </div>

        {/* Filtres pour les responsables et super admins */}
        {userProfile?.role !== 'employe' && (
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-blue-800">
                <Filter className="h-5 w-5 mr-2" />
                Filtres avancés
              </CardTitle>
              <p className="text-sm text-blue-600 mt-1">
                Affinez votre recherche en sélectionnant des critères spécifiques
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Filtre par entreprise pour les super admins */}
                {userProfile?.role === 'super_admin' && companies.length > 0 && (
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-blue-100">
                    <label className="block text-sm font-medium mb-2 text-blue-700 flex items-center">
                      <Building className="h-4 w-4 mr-1" />
                      Entreprise
                    </label>
                    <div className="relative">
                      <select
                        value={selectedCompany}
                        onChange={(e) => setSelectedCompany(e.target.value)}
                        className="w-full border border-blue-200 rounded-lg px-4 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white cursor-pointer"
                      >
                        <option value="all">Toutes les entreprises</option>
                        {companies.map((company) => (
                          <option key={company.id} value={company.nom}>
                            {company.nom}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-blue-500">
                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                    {selectedCompany !== 'all' && (
                      <button 
                        onClick={() => setSelectedCompany('all')}
                        className="mt-2 text-xs text-blue-600 hover:text-blue-800 flex items-center"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Réinitialiser ce filtre
                      </button>
                    )}
                  </div>
                )}
                
                {/* Filtre par employé pour les responsables et super admins */}
                {allEmployees.length > 0 && (
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-blue-100">
                    <label className="block text-sm font-medium mb-2 text-blue-700 flex items-center">
                      <User className="h-4 w-4 mr-1" />
                      Employé
                      {selectedCompany !== 'all' && (
                        <span className="ml-2 text-xs text-blue-500">
                          ({filteredEmployees.length} employé(s) dans {selectedCompany})
                        </span>
                      )}
                    </label>
                    <div className="relative">
                      <select
                        value={selectedEmployee}
                        onChange={(e) => setSelectedEmployee(e.target.value)}
                        className="w-full border border-blue-200 rounded-lg px-4 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white cursor-pointer"
                        disabled={filteredEmployees.length === 0}
                      >
                        <option value="all">Tous les employés</option>
                        {filteredEmployees.map(employee => (
                          <option key={employee.id} value={employee.id}>
                            {employee.prenom} {employee.nom}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-blue-500">
                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                    {selectedEmployee !== 'all' && (
                      <button 
                        onClick={() => setSelectedEmployee('all')}
                        className="mt-2 text-xs text-blue-600 hover:text-blue-800 flex items-center"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Réinitialiser ce filtre
                      </button>
                    )}
                  </div>
                )}
              </div>
              
              {/* Indicateurs de filtres actifs */}
              {(selectedCompany !== 'all' || selectedEmployee !== 'all') && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Filter className="h-4 w-4 text-blue-600 mr-2" />
                      <span className="text-sm font-medium text-blue-800">Filtres actifs:</span>
                    </div>
                    <button 
                      onClick={() => {
                        setSelectedCompany('all');
                        setSelectedEmployee('all');
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Tout réinitialiser
                    </button>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedCompany !== 'all' && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Entreprise: {companies.find(c => c.nom === selectedCompany)?.nom}
                        <button 
                          onClick={() => setSelectedCompany('all')}
                          className="ml-1.5 rounded-full flex-shrink-0"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    )}
                    
                    {selectedEmployee !== 'all' && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Employé: {allEmployees.find(e => e.id === selectedEmployee)?.prenom} {allEmployees.find(e => e.id === selectedEmployee)?.nom}
                        <button 
                          onClick={() => setSelectedEmployee('all')}
                          className="ml-1.5 rounded-full flex-shrink-0"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Request Form for Employees */}
        {showForm && userProfile?.role === 'employe' && (
          <Card>
            <CardHeader>
              <CardTitle>Nouvelle demande de congé</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Type de congé</label>
                    <select
                      className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    >
                      <option value="annuel">Congé annuel</option>
                      <option value="maladie">Congé maladie</option>
                      <option value="exceptionnel">Congé exceptionnel</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Date de début</label>
                    <Input
                      type="date"
                      required
                      value={formData.date_debut}
                      onChange={(e) => setFormData({ ...formData, date_debut: e.target.value })}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Date de fin</label>
                    <Input
                      type="date"
                      required
                      value={formData.date_fin}
                      onChange={(e) => setFormData({ ...formData, date_fin: e.target.value })}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Durée</label>
                    <Input
                      readOnly
                      value={
                        formData.date_debut && formData.date_fin
                          ? `${calculateLeaveDays(formData.date_debut, formData.date_fin)} jour(s)`
                          : ''
                      }
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Motif</label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    required
                    value={formData.motif}
                    onChange={(e) => setFormData({ ...formData, motif: e.target.value })}
                  />
                </div>
                
                <div className="flex space-x-2">
                  <Button type="submit">Soumettre la demande</Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForm(false)}
                  >
                    Annuler
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Leaves List */}
        <Card>
          <CardHeader>
            <CardTitle>
              {userProfile?.role === 'employe' ? 'Mes demandes de congé' : 'Demandes de congé'} 
              ({filteredLeaves.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredLeaves.length > 0 ? (
              <div className="space-y-4">
                {filteredLeaves.map((leave) => (
                  <div key={leave.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center space-x-2">
                          {getTypeBadge(leave.type)}
                          {getStatusBadge(leave.statut)}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <div className="flex items-center text-gray-600">
                              <User className="h-4 w-4 mr-1" />
                              Employé
                            </div>
                            <div className="font-medium">
                              {userProfile?.role === 'employe' 
                                ? 'Moi' 
                                : `${leave.prenom_employe} ${leave.nom_employe}`}
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex items-center text-gray-600">
                              <Calendar className="h-4 w-4 mr-1" />
                              Période
                            </div>
                            <div className="font-medium">
                              {formatDate(leave.date_debut)} - {formatDate(leave.date_fin)}
                            </div>
                            <div className="text-gray-500">
                              {leave.duree || calculateLeaveDays(leave.date_debut, leave.date_fin)} jour(s)
                            </div>
                          </div>
                          
                          {userProfile?.role !== 'employe' && (
                            <div>
                              <div className="flex items-center text-gray-600">
                                <Building className="h-4 w-4 mr-1" />
                                Entreprise
                              </div>
                              <div className="font-medium">{leave.entreprise}</div>
                            </div>
                          )}
                          
                          <div>
                            <div className="flex items-center text-gray-600">
                              <FileText className="h-4 w-4 mr-1" />
                              Motif
                            </div>
                            <div className="font-medium">{leave.motif}</div>
                          </div>
                        </div>
                      </div>
                      
                      {userProfile?.role !== 'employe' && leave.statut === 'en_attente' && (
                        <div className="flex space-x-2 ml-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusUpdate(leave.id, 'accepte', leave)}
                            className="text-green-600 hover:bg-green-50"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Accepter
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusUpdate(leave.id, 'refuse', leave)}
                            className="text-red-600 hover:bg-red-50"
                          >
                            <X className="h-4 w-4 mr-1" />
                            Refuser
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Aucune demande de congé trouvée
              </div>
            )}
          </CardContent>
        </Card>
      </div>
  );
}
