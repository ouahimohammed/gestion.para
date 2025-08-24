import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Input } from '../components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { collection, query, getDocs, where, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatDate } from '../lib/utils';
import { Calendar, Clock, CheckCircle, XCircle, Search, Filter, User, RefreshCw } from 'lucide-react';

export function EmployeeAbsences() {
  const { userProfile } = useAuth();
  const [absences, setAbsences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [employeeId, setEmployeeId] = useState(null);

  useEffect(() => {
    if (userProfile && userProfile.role === 'employe') {
      findEmployeeId();
    } else {
      setLoading(false);
    }
  }, [userProfile]);

  // Trouver l'ID de l'employé dans la collection "employes" qui correspond à l'utilisateur connecté
  const findEmployeeId = async () => {
    if (!userProfile) return;
    
    try {
      console.log('Recherche de l\'employé pour l\'utilisateur:', userProfile.uid, userProfile.email);
      
      // Chercher l'employé par email (le plus fiable)
      let q = query(
        collection(db, 'employes'),
        where('email', '==', userProfile.email)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const employeeDoc = querySnapshot.docs[0];
        const employeeData = employeeDoc.data();
        console.log('Employé trouvé:', employeeDoc.id, employeeData);
        setEmployeeId(employeeDoc.id);
        fetchEmployeeAbsences(employeeDoc.id);
      } else {
        // Si pas trouvé par email, essayer par UID
        console.log('Aucun employé trouvé par email, tentative par UID...');
        q = query(
          collection(db, 'employes'),
          where('uid', '==', userProfile.uid)
        );
        
        const uidSnapshot = await getDocs(q);
        if (!uidSnapshot.empty) {
          const employeeDoc = uidSnapshot.docs[0];
          const employeeData = employeeDoc.data();
          console.log('Employé trouvé par UID:', employeeDoc.id, employeeData);
          setEmployeeId(employeeDoc.id);
          fetchEmployeeAbsences(employeeDoc.id);
        } else {
          console.log('Aucun employé trouvé dans la collection employes');
          setLoading(false);
        }
      }
    } catch (error) {
      console.error('Erreur lors de la recherche de l\'employé:', error);
      setLoading(false);
    }
  };

  const fetchEmployeeAbsences = async (empId) => {
    if (!empId) {
      setLoading(false);
      return;
    }
    
    try {
      console.log('Recherche des absences pour employe_id:', empId);
      
      const q = query(
        collection(db, 'absences'),
        where('employe_id', '==', empId),
        orderBy('date_absence', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const absencesData = querySnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));
      
      console.log('Absences trouvées:', absencesData);
      setAbsences(absencesData);
    } catch (error) {
      console.error('Erreur lors du chargement des absences:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (statut) => {
    if (!statut) return <Badge variant="secondary">Inconnu</Badge>;
    
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
    if (!type) return <Badge variant="secondary">Inconnu</Badge>;
    
    switch (type) {
      case 'justifiee': 
        return <Badge variant="default">Justifiée</Badge>;
      case 'non_justifiee': 
        return <Badge variant="destructive">Non justifiée</Badge>;
      default: 
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  const getDureeBadge = (duree) => {
    if (!duree) return <Badge variant="outline">Inconnue</Badge>;
    
    switch (duree) {
      case 'journee': 
        return <Badge variant="outline">Journée</Badge>;
      case 'demi_journee': 
        return <Badge variant="outline">Demi-journée</Badge>;
      default: 
        return <Badge variant="outline">{duree}</Badge>;
    }
  };

  // Filtrer les absences selon les critères de recherche
  const filteredAbsences = absences.filter(absence => {
    const matchesSearch = 
      absence.motif?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      absence.nom_employe?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      absence.prenom_employe?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || absence.statut === statusFilter;
    const matchesType = typeFilter === 'all' || absence.type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div></div>;
  }

  if (!userProfile) {
    return <div className="flex items-center justify-center h-64 text-gray-600">Utilisateur non connecté</div>;
  }

  if (userProfile.role !== 'employe') {
    return <div className="flex items-center justify-center h-64 text-gray-600">Accès réservé aux employés</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Mes Absences</h1>
        <div className="flex items-center gap-4">
          <Button 
            onClick={() => findEmployeeId()} 
            variant="outline" 
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
          <Badge variant="outline" className="flex items-center gap-1">
            <User className="h-4 w-4" />
            {userProfile?.prenom} {userProfile?.nom}
          </Badge>
        </div>
      </div>

      {/* Debug Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <p className="text-sm text-blue-800">
          <strong>UID Utilisateur:</strong> {userProfile.uid}
        </p>
        <p className="text-sm text-blue-800">
          <strong>Email:</strong> {userProfile.email}
        </p>
        <p className="text-sm text-blue-800">
          <strong>ID Employé trouvé:</strong> {employeeId || 'Non trouvé'}
        </p>
      </div>

      {/* ... le reste du code reste inchangé ... */}
      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total des absences</p>
                <p className="text-2xl font-bold">{absences.length}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Absences justifiées</p>
                <p className="text-2xl font-bold">
                  {absences.filter(a => a.type === 'justifiee').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">En attente</p>
                <p className="text-2xl font-bold">
                  {absences.filter(a => a.statut === 'en_attente').length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des absences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Historique de mes absences ({filteredAbsences.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filtres */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Rechercher par motif ou nom..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-4">
              <div className="flex gap-2 items-center">
                <Filter className="h-4 w-4 text-gray-500" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="en_attente">En attente</SelectItem>
                    <SelectItem value="accepte">Accepté</SelectItem>
                    <SelectItem value="refuse">Refusé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 items-center">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les types</SelectItem>
                    <SelectItem value="justifiee">Justifiée</SelectItem>
                    <SelectItem value="non_justifiee">Non justifiée</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {filteredAbsences.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Durée</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Motif</TableHead>
                    <TableHead>Marqué par</TableHead>
                    <TableHead>Date de saisie</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAbsences.map((absence) => (
                    <TableRow key={absence.id}>
                      <TableCell className="font-medium">
                        {formatDate(absence.date_absence)}
                      </TableCell>
                      <TableCell>{getTypeBadge(absence.type)}</TableCell>
                      <TableCell>{getDureeBadge(absence.duree)}</TableCell>
                      <TableCell>{getStatusBadge(absence.statut)}</TableCell>
                      <TableCell className="max-w-xs">{absence.motif}</TableCell>
                      <TableCell>{absence.marque_par_nom}</TableCell>
                      <TableCell>{formatDate(absence.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {absences.length === 0 ? 'Aucune absence enregistrée' : 'Aucune absence correspond aux filtres'}
              </h3>
              <p className="text-gray-600">
                {absences.length === 0 
                  ? "Vous n'avez aucune absence enregistrée pour le moment."
                  : "Essayez de modifier vos critères de recherche ou de filtrage."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}