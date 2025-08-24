import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select';
import { collection, query, getDocs, where, addDoc, orderBy, updateDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatDate, formatDateTime } from '../lib/utils';
import { Calendar, User, Building2, Clock, CheckCircle, XCircle, Plus, Search, Filter, FileText, CalendarDays, UserCheck, ArrowLeft, Download, MoreVertical } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/Dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/Tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/DropdownMenu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/Tooltip';

export function MarkAbsence() {
  const { userProfile } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [absences, setAbsences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('history');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showEmployeeSelect, setShowEmployeeSelect] = useState(false);

  useEffect(() => {
    if (userProfile) {
      fetchEmployees();
      fetchAbsences();
    }
  }, [userProfile]);

  const fetchEmployees = async () => {
    if (!userProfile) return;
    
    try {
      let q;
      if (userProfile.role === 'super_admin') {
        q = query(collection(db, 'employes'), orderBy('nom'));
      } else if (userProfile.role === 'responsable' && userProfile.entreprise) {
        q = query(
          collection(db, 'employes'),
          where('entreprise', '==', userProfile.entreprise),
          orderBy('nom')
        );
      } else {
        setEmployees([]);
        return;
      }
      
      const querySnapshot = await getDocs(q);
      const employeesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEmployees(employeesData);
    } catch (error) {
      console.error('Erreur lors du chargement des employés:', error);
    }
  };

  const fetchAbsences = async () => {
    if (!userProfile) return;
    
    try {
      let q;
      if (userProfile.role === 'super_admin') {
        q = query(collection(db, 'absences'), orderBy('date_absence', 'desc'));
      } else if (userProfile.role === 'responsable' && userProfile.entreprise) {
        q = query(
          collection(db, 'absences'),
          where('entreprise', '==', userProfile.entreprise),
          orderBy('date_absence', 'desc')
        );
      } else if (userProfile.role === 'employe') {
        q = query(
          collection(db, 'absences'),
          where('employe_id', '==', userProfile.uid),
          orderBy('date_absence', 'desc')
        );
      } else {
        setAbsences([]);
        return;
      }
      
      const querySnapshot = await getDocs(q);
      const absencesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAbsences(absencesData);
    } catch (error) {
      console.error('Erreur lors du chargement des absences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (formData) => {
    if (!userProfile) return;
    setSubmitting(true);

    try {
      // Vérifier les permissions
      if (userProfile.role === 'responsable' && selectedEmployee.entreprise !== userProfile.entreprise) {
        alert('Vous ne pouvez pas marquer une absence pour un employé hors de votre entreprise');
        return;
      }

      // Ajouter l'absence à Firestore
      const absenceData = {
        employe_id: selectedEmployee.id,
        nom_employe: selectedEmployee.nom,
        prenom_employe: selectedEmployee.prenom,
        entreprise: selectedEmployee.entreprise,
        date_absence: formData.date_absence,
        type: formData.type,
        motif: formData.motif,
        duree: formData.duree,
        statut: formData.type === 'justifiee' ? 'accepte' : 'en_attente',
        marque_par: userProfile.uid,
        marque_par_nom: `${userProfile.prenom} ${userProfile.nom}`,
        created_at: new Date().toISOString(),
      };

      await addDoc(collection(db, 'absences'), absenceData);

      // Réinitialiser et actualiser les données
      setSelectedEmployee(null);
      setShowEmployeeSelect(false);
      fetchAbsences();
    } catch (error) {
      console.error('Erreur lors de la soumission:', error);
      alert('Erreur lors de la soumission de l\'absence');
    } finally {
      setSubmitting(false);
    }
  };

  const handleJustifyAbsence = async (absenceId) => {
    try {
      await updateDoc(doc(db, 'absences', absenceId), {
        type: 'justifiee',
        statut: 'accepte',
      });
      fetchAbsences();
    } catch (error) {
      console.error('Erreur lors de la justification:', error);
    }
  };

  const handleStatusChange = async (absenceId, newStatus) => {
    try {
      await updateDoc(doc(db, 'absences', absenceId), {
        statut: newStatus,
      });
      fetchAbsences();
    } catch (error) {
      console.error('Erreur lors du changement de statut:', error);
    }
  };

  const getStatusBadge = (statut) => {
    switch (statut) {
      case 'en_attente':
        return <Badge variant="warning" className="flex items-center gap-1"><Clock className="h-3 w-3" />En attente</Badge>;
      case 'accepte':
        return <Badge variant="success" className="flex items-center gap-1"><CheckCircle className="h-3 w-3" />Accepté</Badge>;
      case 'refuse':
        return <Badge variant="destructive" className="flex items-center gap-1"><XCircle className="h-3 w-3" />Refusé</Badge>;
      default:
        return <Badge variant="secondary">{statut}</Badge>;
    }
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case 'justifiee': return <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">Justifiée</Badge>;
      case 'non_justifiee': return <Badge variant="destructive">Non justifiée</Badge>;
      default: return <Badge variant="secondary">{type}</Badge>;
    }
  };

  const getDureeBadge = (duree) => {
    switch (duree) {
      case 'journee': return <Badge variant="outline" className="bg-blue-50 text-blue-700">Journée</Badge>;
      case 'demi_journee': return <Badge variant="outline" className="bg-purple-50 text-purple-700">Demi-journée</Badge>;
      default: return <Badge variant="outline">{duree}</Badge>;
    }
  };

  // Filtrer les absences selon les critères de recherche
  const filteredAbsences = absences.filter(absence => {
    const matchesSearch = 
      absence.nom_employe.toLowerCase().includes(searchTerm.toLowerCase()) ||
      absence.prenom_employe.toLowerCase().includes(searchTerm.toLowerCase()) ||
      absence.motif.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || absence.statut === statusFilter;
    const matchesType = typeFilter === 'all' || absence.type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestion des Absences</h1>
          <p className="text-gray-600 mt-1">Suivez et gérez les absences du personnel</p>
        </div>
        
        {(userProfile?.role === 'super_admin' || userProfile?.role === 'responsable') && (
          <Dialog open={showEmployeeSelect} onOpenChange={setShowEmployeeSelect}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> 
                Nouvelle absence
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Sélectionner un employé</DialogTitle>
                <DialogDescription>
                  Choisissez l'employé pour lequel vous souhaitez enregistrer une absence.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Employé</label>
                  <Select onValueChange={(value) => setSelectedEmployee(employees.find(e => e.id === value))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un employé" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map(employee => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {employee.prenom} {employee.nom} - {employee.entreprise}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {selectedEmployee && (
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">{selectedEmployee.prenom} {selectedEmployee.nom}</p>
                        <p className="text-sm text-gray-600 flex items-center gap-1">
                          <Building2 className="h-3 w-3" /> 
                          {selectedEmployee.entreprise}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="flex gap-2 justify-end mt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSelectedEmployee(null);
                      setShowEmployeeSelect(false);
                    }}
                  >
                    Annuler
                  </Button>
                  <Button 
                    onClick={() => setShowEmployeeSelect(false)} 
                    disabled={!selectedEmployee}
                  >
                    Continuer
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Formulaire de marquage d'absence */}
      {selectedEmployee && (
        <AbsenceForm 
          employee={selectedEmployee} 
          onSubmit={handleSubmit}
          onCancel={() => setSelectedEmployee(null)}
          submitting={submitting}
        />
      )}

      {/* Liste des absences */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <CardTitle className="flex items-center gap-2 text-xl">
              <CalendarDays className="h-5 w-5" />
              Historique des absences
              <Badge variant="outline" className="ml-2">{filteredAbsences.length}</Badge>
            </CardTitle>
            
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Rechercher..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous statuts</SelectItem>
                    <SelectItem value="en_attente">En attente</SelectItem>
                    <SelectItem value="accepte">Accepté</SelectItem>
                    <SelectItem value="refuse">Refusé</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous types</SelectItem>
                    <SelectItem value="justifiee">Justifiée</SelectItem>
                    <SelectItem value="non_justifiee">Non justifiée</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {filteredAbsences.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employé</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Durée</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Motif</TableHead>
                    {(userProfile?.role === 'super_admin' || userProfile?.role === 'responsable') && (
                      <TableHead className="text-right">Actions</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAbsences.map((absence) => (
                    <TableRow key={absence.id} className="group">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                            <User className="h-4 w-4 text-gray-600" />
                          </div>
                          <div>
                            <div className="font-medium">{absence.prenom_employe} {absence.nom_employe}</div>
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {absence.entreprise}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{formatDate(absence.date_absence)}</div>
                        <div className="text-xs text-gray-500">
                          {formatDateTime(absence.created_at)}
                        </div>
                      </TableCell>
                      <TableCell>{getTypeBadge(absence.type)}</TableCell>
                      <TableCell>{getDureeBadge(absence.duree)}</TableCell>
                      <TableCell>{getStatusBadge(absence.statut)}</TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="max-w-[200px] truncate">
                                {absence.motif || "Aucun motif"}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">{absence.motif || "Aucun motif spécifié"}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      {(userProfile?.role === 'super_admin' || userProfile?.role === 'responsable') && (
                        <TableCell>
                          <div className="flex justify-end">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {absence.type === 'non_justifiee' && (
                                  <DropdownMenuItem onClick={() => handleJustifyAbsence(absence.id)}>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Justifier
                                  </DropdownMenuItem>
                                )}
                                {absence.statut === 'en_attente' && (
                                  <>
                                    <DropdownMenuItem onClick={() => handleStatusChange(absence.id, 'accepte')}>
                                      <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                                      Accepter
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleStatusChange(absence.id, 'refuse')}>
                                      <XCircle className="h-4 w-4 mr-2 text-red-600" />
                                      Refuser
                                    </DropdownMenuItem>
                                  </>
                                )}
                                <DropdownMenuItem>
                                  <FileText className="h-4 w-4 mr-2" />
                                  Voir détails
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Clock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune absence trouvée</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || statusFilter !== 'all' || typeFilter !== 'all' 
                  ? "Aucune absence ne correspond à vos critères de recherche." 
                  : "Aucune absence n'a été enregistrée pour le moment."}
              </p>
              {(userProfile?.role === 'super_admin' || userProfile?.role === 'responsable') && (
                <Button onClick={() => setShowEmployeeSelect(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Marquer une absence
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Composant formulaire d'absence séparé
function AbsenceForm({ employee, onSubmit, onCancel, submitting }) {
  const [formData, setFormData] = useState({
    date_absence: new Date().toISOString().split('T')[0],
    type: 'non_justifiee',
    motif: '',
    duree: 'journee',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Card className="border-blue-200 bg-blue-50 shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onCancel} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <CardTitle className="text-blue-900">Nouvelle absence</CardTitle>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="mb-6 p-3 bg-white rounded-lg border border-blue-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <User className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium">{employee.prenom} {employee.nom}</p>
              <p className="text-sm text-gray-600 flex items-center gap-1">
                <Building2 className="h-3 w-3" /> 
                {employee.entreprise}
              </p>
            </div>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date d'absence *</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                <Input 
                  type="date" 
                  required 
                  className="pl-10 h-11" 
                  value={formData.date_absence} 
                  onChange={(e) => setFormData({ ...formData, date_absence: e.target.value })} 
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type d'absence *</label>
              <Select 
                value={formData.type} 
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Sélectionner un type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="non_justifiee">Non justifiée</SelectItem>
                  <SelectItem value="justifiee">Justifiée</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Durée *</label>
              <Select 
                value={formData.duree} 
                onValueChange={(value) => setFormData({ ...formData, duree: value })}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Sélectionner une durée" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="journee">Journée complète</SelectItem>
                  <SelectItem value="demi_journee">Demi-journée</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {formData.type === 'justifiee' && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Justificatif</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <FileText className="h-8 w-8 text-gray-400" />
                    <p className="text-sm text-gray-600">Glissez-déposez un fichier ou</p>
                    <Button variant="outline" size="sm" type="button">
                      Parcourir
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Motif</label>
            <textarea 
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              rows={3} 
              placeholder="Décrivez le motif de l'absence..." 
              value={formData.motif} 
              onChange={(e) => setFormData({ ...formData, motif: e.target.value })} 
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button 
              type="submit" 
              disabled={submitting} 
              className="flex-1 h-11 gap-2"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Enregistrement...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Enregistrer l'absence
                </>
              )}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel} 
              className="h-11 px-6"
            >
              Annuler
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}