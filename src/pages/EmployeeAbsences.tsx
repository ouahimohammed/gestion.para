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
import { Calendar, User, Building2, Clock, CheckCircle, XCircle, Plus, Search, Filter } from 'lucide-react';

export function MarkAbsence() {
  const { userProfile } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [absences, setAbsences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formData, setFormData] = useState({
    employe_id: '',
    date_absence: '',
    type: 'non_justifiee',
    motif: '',
    duree: 'journee',
  });

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
        // Super admin peut voir tous les employés
        q = query(collection(db, 'employes'), orderBy('nom'));
      } else if (userProfile.role === 'responsable' && userProfile.entreprise) {
        // Responsable peut voir les employés de son entreprise
        q = query(
          collection(db, 'employes'),
          where('entreprise', '==', userProfile.entreprise),
          orderBy('nom')
        );
      } else {
        // Employé ne peut pas marquer d'absences
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
        // Super admin peut voir toutes les absences
        q = query(collection(db, 'absences'), orderBy('date_absence', 'desc'));
      } else if (userProfile.role === 'responsable' && userProfile.entreprise) {
        // Responsable peut voir les absences de son entreprise
        q = query(
          collection(db, 'absences'),
          where('entreprise', '==', userProfile.entreprise),
          orderBy('date_absence', 'desc')
        );
      } else {
        // Employé ne peut pas voir les absences des autres
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userProfile) return;
    setSubmitting(true);

    try {
      // Trouver l'employé sélectionné
      const selectedEmployee = employees.find(emp => emp.id === formData.employe_id);
      if (!selectedEmployee) {
        alert('Employé non trouvé');
        return;
      }

      // Vérifier les permissions
      if (userProfile.role === 'responsable' && selectedEmployee.entreprise !== userProfile.entreprise) {
        alert('Vous ne pouvez pas marquer une absence pour un employé hors de votre entreprise');
        return;
      }

      // Ajouter l'absence à Firestore
      const absenceData = {
        employe_id: formData.employe_id,
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

      // Réinitialiser le formulaire et actualiser les données
      setShowForm(false);
      setFormData({
        employe_id: '',
        date_absence: '',
        type: 'non_justifiee',
        motif: '',
        duree: 'journee',
      });
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
      fetchAbsences(); // Actualiser la liste
    } catch (error) {
      console.error('Erreur lors de la justification:', error);
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
      case 'justifiee': return <Badge variant="default">Justifiée</Badge>;
      case 'non_justifiee': return <Badge variant="destructive">Non justifiée</Badge>;
      default: return <Badge variant="secondary">{type}</Badge>;
    }
  };

  const getDureeBadge = (duree) => {
    switch (duree) {
      case 'journee': return <Badge variant="outline">Journée</Badge>;
      case 'demi_journee': return <Badge variant="outline">Demi-journée</Badge>;
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
    
    return matchesSearch && matchesStatus;
  });

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Gestion des Absences</h1>
        {(userProfile?.role === 'super_admin' || userProfile?.role === 'responsable') && (
          <Button onClick={() => setShowForm(true)} disabled={showForm}>
            <Plus className="h-4 w-4 mr-2" />Marquer une absence
          </Button>
        )}
      </div>

      {/* Formulaire de marquage d'absence */}
      {showForm && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900">Marquer une absence</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Employé *</label>
                  <select
                    className="w-full h-12 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    value={formData.employe_id}
                    onChange={(e) => setFormData({ ...formData, employe_id: e.target.value })}
                    required
                  >
                    <option value="">Sélectionner un employé</option>
                    {employees.map(employee => (
                      <option key={employee.id} value={employee.id}>
                        {employee.prenom} {employee.nom} - {employee.entreprise}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date d'absence *</label>
                  <Input 
                    type="date" 
                    required 
                    className="h-12" 
                    value={formData.date_absence} 
                    onChange={(e) => setFormData({ ...formData, date_absence: e.target.value })} 
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type d'absence *</label>
                  <select
                    className="w-full h-12 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    required
                  >
                    <option value="non_justifiee">Non justifiée</option>
                    <option value="justifiee">Justifiée</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Durée *</label>
                  <select
                    className="w-full h-12 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    value={formData.duree}
                    onChange={(e) => setFormData({ ...formData, duree: e.target.value })}
                    required
                  >
                    <option value="journee">Journée complète</option>
                    <option value="demi_journee">Demi-journée</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Motif </label>
                <textarea 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  rows={4} 
                   
                  placeholder="Décrivez le motif de l'absence..." 
                  value={formData.motif} 
                  onChange={(e) => setFormData({ ...formData, motif: e.target.value })} 
                />
              </div>

              <div className="flex space-x-4 pt-4">
                <Button type="submit" disabled={submitting} className="flex-1 h-12">
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Enregistrer l'absence
                    </>
                  )}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowForm(false);
                    setFormData({
                      employe_id: '',
                      date_absence: '',
                      type: 'non_justifiee',
                      motif: '',
                      duree: 'journee',
                    });
                  }} 
                  className="h-12 px-8"
                >
                  Annuler
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Liste des absences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Historique des absences ({filteredAbsences.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filtres */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Rechercher par nom ou motif..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2 items-center">
              <Filter className="h-4 w-4 text-gray-500" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrer par statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="en_attente">En attente</SelectItem>
                  <SelectItem value="accepte">Accepté</SelectItem>
                  <SelectItem value="refuse">Refusé</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {filteredAbsences.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employé</TableHead>
                    <TableHead>Entreprise</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Durée</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Motif</TableHead>
                    <TableHead>Marqué par</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAbsences.map((absence) => (
                    <TableRow key={absence.id}>
                      <TableCell>
                        <div className="font-medium">{absence.prenom_employe} {absence.nom_employe}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Building2 className="h-4 w-4 mr-1 text-gray-500" />
                          {absence.entreprise}
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(absence.date_absence)}</TableCell>
                      <TableCell>{getTypeBadge(absence.type)}</TableCell>
                      <TableCell>{getDureeBadge(absence.duree)}</TableCell>
                      <TableCell>{getStatusBadge(absence.statut)}</TableCell>
                      <TableCell className="max-w-xs truncate">{absence.motif}</TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-500">
                          {absence.marque_par_nom}
                          <div className="text-xs">{formatDateTime(absence.created_at)}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {absence.type === 'non_justifiee' && userProfile?.role !== 'employe' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleJustifyAbsence(absence.id)}
                          >
                            Justifier
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Clock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune absence enregistrée</h3>
              <p className="text-gray-600">
                {userProfile?.role === 'employe' 
                  ? "Vous n'avez aucune absence enregistrée." 
                  : "Aucune absence n'a été enregistrée pour le moment."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
