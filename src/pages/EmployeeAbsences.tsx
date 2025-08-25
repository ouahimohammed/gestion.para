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
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Search, 
  Filter, 
  User, 
  RefreshCw, 
  AlertCircle,
  FileText,
  ChevronDown,
  ChevronUp,
  Download,
  Eye
} from 'lucide-react';

export function EmployeeAbsences() {
  const { userProfile } = useAuth();
  const [absences, setAbsences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [employeeId, setEmployeeId] = useState(null);
  const [expandedAbsence, setExpandedAbsence] = useState(null);
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    if (userProfile && userProfile.role === 'employe') {
      findEmployeeId();
    } else {
      setLoading(false);
    }
  }, [userProfile]);

  const findEmployeeId = async () => {
    if (!userProfile) return;
    
    try {
      // Chercher l'employé par email
      let q = query(
        collection(db, 'employes'),
        where('email', '==', userProfile.email)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const employeeDoc = querySnapshot.docs[0];
        setEmployeeId(employeeDoc.id);
        fetchEmployeeAbsences(employeeDoc.id);
      } else {
        // Si pas trouvé par email, essayer par UID
        q = query(
          collection(db, 'employes'),
          where('uid', '==', userProfile.uid)
        );
        
        const uidSnapshot = await getDocs(q);
        if (!uidSnapshot.empty) {
          const employeeDoc = uidSnapshot.docs[0];
          setEmployeeId(employeeDoc.id);
          fetchEmployeeAbsences(employeeDoc.id);
        } else {
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
      
      setAbsences(absencesData);
    } catch (error) {
      console.error('Erreur lors du chargement des absences:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    if (employeeId) {
      await fetchEmployeeAbsences(employeeId);
    } else {
      await findEmployeeId();
    }
  };

  const getStatusBadge = (statut) => {
    if (!statut) return <Badge variant="secondary" className="px-2 py-1">Inconnu</Badge>;
    
    switch (statut) {
      case 'en_attente':
        return <Badge variant="warning" className="flex items-center gap-1 px-2 py-1"><Clock className="h-3 w-3" />En attente</Badge>;
      case 'accepte':
        return <Badge variant="success" className="flex items-center gap-1 px-2 py-1"><CheckCircle className="h-3 w-3" />Accepté</Badge>;
      case 'refuse':
        return <Badge variant="destructive" className="flex items-center gap-1 px-2 py-1"><XCircle className="h-3 w-3" />Refusé</Badge>;
      default:
        return <Badge variant="secondary" className="px-2 py-1">{statut}</Badge>;
    }
  };

  const getTypeBadge = (type) => {
    if (!type) return <Badge variant="secondary" className="px-2 py-1">Inconnu</Badge>;
    
    switch (type) {
      case 'justifiee': 
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 px-2 py-1">Justifiée</Badge>;
      case 'non_justifiee': 
        return <Badge variant="destructive" className="px-2 py-1">Non justifiée</Badge>;
      default: 
        return <Badge variant="secondary" className="px-2 py-1">{type}</Badge>;
    }
  };

  const getDureeBadge = (duree) => {
    if (!duree) return <Badge variant="outline" className="px-2 py-1">Inconnue</Badge>;
    
    switch (duree) {
      case 'journee': 
        return <Badge variant="outline" className="px-2 py-1">Journée</Badge>;
      case 'demi_journee': 
        return <Badge variant="outline" className="px-2 py-1">Demi-journée</Badge>;
      default: 
        return <Badge variant="outline" className="px-2 py-1">{duree}</Badge>;
    }
  };

  const toggleExpandAbsence = (id) => {
    if (expandedAbsence === id) {
      setExpandedAbsence(null);
    } else {
      setExpandedAbsence(id);
    }
  };

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
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="text-gray-600">Chargement de vos absences...</p>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4 text-gray-600">
        <AlertCircle className="h-12 w-12" />
        <p className="text-lg">Utilisateur non connecté</p>
      </div>
    );
  }

  if (userProfile.role !== 'employe') {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4 text-gray-600">
        <XCircle className="h-12 w-12" />
        <p className="text-lg">Accès réservé aux employés</p>
        <p className="text-sm">Votre rôle: {userProfile.role}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Mes Absences</h1>
          <p className="text-sm text-gray-600 mt-1">
            Consultez l'historique et le statut de vos demandes d'absence
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            size="sm"
            disabled={refreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Actualisation...' : 'Actualiser'}
          </Button>
          <Badge variant="outline" className="flex items-center gap-2 px-3 py-2">
            <User className="h-4 w-4" />
            <span>{userProfile?.prenom} {userProfile?.nom}</span>
          </Badge>
        </div>
      </div>

      {/* Debug Info (optionnel) */}
      {showDebug && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-sm font-medium text-blue-800">Informations de débogage</h3>
            <Button variant="ghost" size="sm" onClick={() => setShowDebug(false)}>
              <XCircle className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-blue-800">
            <p><strong>UID Utilisateur:</strong> {userProfile.uid}</p>
            <p><strong>Email:</strong> {userProfile.email}</p>
            <p><strong>ID Employé trouvé:</strong> {employeeId || 'Non trouvé'}</p>
            <p><strong>Nombre d'absences:</strong> {absences.length}</p>
          </div>
        </div>
      )}

      {/* Bouton pour afficher/masquer les infos de débogage */}
      {!showDebug && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setShowDebug(true)}
          className="text-xs text-gray-500"
        >
          Afficher les informations techniques
        </Button>
      )}

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Total des absences</p>
                <p className="text-2xl font-bold text-blue-900">{absences.length}</p>
              </div>
              <div className="p-3 bg-blue-200 rounded-full">
                <Calendar className="h-6 w-6 text-blue-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Absences justifiées</p>
                <p className="text-2xl font-bold text-green-900">
                  {absences.filter(a => a.type === 'justifiee').length}
                </p>
              </div>
              <div className="p-3 bg-green-200 rounded-full">
                <CheckCircle className="h-6 w-6 text-green-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-700">En attente</p>
                <p className="text-2xl font-bold text-amber-900">
                  {absences.filter(a => a.statut === 'en_attente').length}
                </p>
              </div>
              <div className="p-3 bg-amber-200 rounded-full">
                <Clock className="h-6 w-6 text-amber-700" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des absences */}
      <Card className="border-gray-200">
        <CardHeader className="bg-gray-50 rounded-t-lg border-b">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <CardTitle className="flex items-center gap-2 text-gray-800">
              <FileText className="h-5 w-5" />
              Historique de mes absences
            </CardTitle>
            <Badge variant="outline" className="px-3 py-1">
              {filteredAbsences.length} {filteredAbsences.length === 1 ? 'absence' : 'absences'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {/* Filtres */}
          <div className="flex flex-col md:flex-row gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Rechercher par motif ou nom..."
                className="pl-10 bg-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex flex-col md:flex-row gap-2">
              <div className="flex gap-2 items-center">
                <Filter className="h-4 w-4 text-gray-500" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-[150px] bg-white">
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
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full md:w-[150px] bg-white">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="justifiee">Justifiée</SelectItem>
                  <SelectItem value="non_justifiee">Non justifiée</SelectItem>
                </SelectContent>
              </Select>
              {(searchTerm || statusFilter !== 'all' || typeFilter !== 'all') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                    setTypeFilter('all');
                  }}
                  className="h-10 text-gray-500"
                >
                  Réinitialiser
                </Button>
              )}
            </div>
          </div>

          {filteredAbsences.length > 0 ? (
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              {/* Desktop Table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="font-semibold text-gray-700">Date</TableHead>
                      <TableHead className="font-semibold text-gray-700">Type</TableHead>
                      <TableHead className="font-semibold text-gray-700">Durée</TableHead>
                      <TableHead className="font-semibold text-gray-700">Statut</TableHead>
                      <TableHead className="font-semibold text-gray-700">Motif</TableHead>
                      <TableHead className="font-semibold text-gray-700">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAbsences.map((absence) => (
                      <React.Fragment key={absence.id}>
                        <TableRow className="hover:bg-gray-50">
                          <TableCell className="font-medium">
                            {formatDate(absence.date_absence)}
                          </TableCell>
                          <TableCell>{getTypeBadge(absence.type)}</TableCell>
                          <TableCell>{getDureeBadge(absence.duree)}</TableCell>
                          <TableCell>{getStatusBadge(absence.statut)}</TableCell>
                          <TableCell className="max-w-xs truncate">{absence.motif}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleExpandAbsence(absence.id)}
                              className="h-8 w-8 p-0"
                            >
                              {expandedAbsence === absence.id ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                        {expandedAbsence === absence.id && (
                          <TableRow className="bg-blue-50">
                            <TableCell colSpan={6} className="p-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div>
                                  <p className="font-medium text-gray-700">Motif complet:</p>
                                  <p className="mt-1 text-gray-600">{absence.motif}</p>
                                </div>
                                <div>
                                  <p className="font-medium text-gray-700">Marqué par:</p>
                                  <p className="mt-1 text-gray-600">{absence.marque_par_nom || 'Non spécifié'}</p>
                                </div>
                                <div>
                                  <p className="font-medium text-gray-700">Date de saisie:</p>
                                  <p className="mt-1 text-gray-600">{formatDate(absence.created_at)}</p>
                                </div>
                                <div className="flex items-end">
                                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                                    <Eye className="h-4 w-4" />
                                    Voir les détails
                                  </Button>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden">
                {filteredAbsences.map((absence) => (
                  <div key={absence.id} className="border-b border-gray-200 last:border-b-0 p-4">
                    <div 
                      className="flex justify-between items-start cursor-pointer"
                      onClick={() => toggleExpandAbsence(absence.id)}
                    >
                      <div>
                        <div className="font-medium text-gray-900">
                          {formatDate(absence.date_absence)}
                        </div>
                        <div className="flex gap-2 mt-2">
                          {getTypeBadge(absence.type)}
                          {getStatusBadge(absence.statut)}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        {expandedAbsence === absence.id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    
                    {expandedAbsence === absence.id && (
                      <div className="mt-4 pl-2 space-y-3 text-sm border-l-2 border-blue-200">
                        <div>
                          <p className="font-medium text-gray-700">Motif:</p>
                          <p className="mt-1 text-gray-600">{absence.motif}</p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-700">Durée:</p>
                          <p className="mt-1 text-gray-600">{getDureeBadge(absence.duree)}</p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-700">Marqué par:</p>
                          <p className="mt-1 text-gray-600">{absence.marque_par_nom || 'Non spécifié'}</p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-700">Date de saisie:</p>
                          <p className="mt-1 text-gray-600">{formatDate(absence.created_at)}</p>
                        </div>
                        <Button variant="outline" size="sm" className="w-full flex items-center justify-center gap-2 mt-2">
                          <Eye className="h-4 w-4" />
                          Voir les détails complets
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="mx-auto h-16 w-16 text-gray-400 mb-4">
                <Calendar className="h-full w-full" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {absences.length === 0 ? 'Aucune absence enregistrée' : 'Aucune absence correspond aux filtres'}
              </h3>
              <p className="text-gray-600 mb-4">
                {absences.length === 0 
                  ? "Vous n'avez aucune absence enregistrée pour le moment."
                  : "Essayez de modifier vos critères de recherche ou de filtrage."}
              </p>
              {absences.length === 0 && (
                <Button>
                  <FileText className="h-4 w-4 mr-2" />
                  Déclarer une absence
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
