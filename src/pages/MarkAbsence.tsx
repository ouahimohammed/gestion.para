import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select';
import { collection, query, getDocs, where, addDoc, orderBy, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatDate, formatDateTime } from '../lib/utils';
import { Calendar, User, Building2, Clock, CheckCircle, XCircle, Plus, Search, Filter, FileText, CalendarDays, UserCheck, ArrowLeft, Download, MoreVertical, ChevronDown, ChevronUp, Eye, Edit, Trash2, BarChart3, TrendingUp, Users, PieChart } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/Dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/Tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/DropdownMenu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/Tooltip';
import { Label } from '../components/ui/Label';
import { Textarea } from '../components/ui/Textarea';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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
  const [showEmployeeDialog, setShowEmployeeDialog] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'date_absence', direction: 'desc' });
  
  // États pour les rapports
  const [reportPeriod, setReportPeriod] = useState('month');
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');
  const [reportEmployeeFilter, setReportEmployeeFilter] = useState('all');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (userProfile) {
      fetchEmployees();
      fetchAbsences();
    }
  }, [userProfile]);

  useEffect(() => {
    // Définir les dates par défaut pour les rapports
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    setReportStartDate(firstDayOfMonth.toISOString().split('T')[0]);
    setReportEndDate(now.toISOString().split('T')[0]);
  }, []);

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

  const handleDeleteAbsence = async (absenceId) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette absence ?")) {
      return;
    }
    
    try {
      await deleteDoc(doc(db, 'absences', absenceId));
      fetchAbsences();
      alert("Absence supprimée avec succès");
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      alert("Erreur lors de la suppression de l'absence");
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
      if (userProfile.role === 'responsable' && selectedEmployee.entreprise !== userProfile.entreprise) {
        alert('Vous ne pouvez pas marquer une absence pour un employé hors de votre entreprise');
        return;
      }

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

      setSelectedEmployee(null);
      setShowEmployeeDialog(false);
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

  // Fonctions pour les rapports
  const getReportData = () => {
    let filteredData = absences;

    // Filtre par période
    if (reportStartDate && reportEndDate) {
      filteredData = filteredData.filter(absence => {
        const absenceDate = new Date(absence.date_absence);
        const startDate = new Date(reportStartDate);
        const endDate = new Date(reportEndDate);
        return absenceDate >= startDate && absenceDate <= endDate;
      });
    }

    // Filtre par employé
    if (reportEmployeeFilter !== 'all') {
      filteredData = filteredData.filter(absence => absence.employe_id === reportEmployeeFilter);
    }

    return filteredData;
  };

  const getReportStats = () => {
    const reportData = getReportData();
    
    return {
      total: reportData.length,
      justifiees: reportData.filter(a => a.type === 'justifiee').length,
      nonJustifiees: reportData.filter(a => a.type === 'non_justifiee').length,
      enAttente: reportData.filter(a => a.statut === 'en_attente').length,
      acceptees: reportData.filter(a => a.statut === 'accepte').length,
      refusees: reportData.filter(a => a.statut === 'refuse').length,
      journeesCompletes: reportData.filter(a => a.duree === 'journee').length,
      demiJournees: reportData.filter(a => a.duree === 'demi_journee').length,
    };
  };

  const getEmployeeAbsenceStats = () => {
    const reportData = getReportData();
    const stats = {};

    reportData.forEach(absence => {
      const employeeName = `${absence.prenom_employe} ${absence.nom_employe}`;
      if (!stats[employeeName]) {
        stats[employeeName] = {
          total: 0,
          justifiees: 0,
          nonJustifiees: 0,
          acceptees: 0,
          refusees: 0,
          enAttente: 0
        };
      }
      
      stats[employeeName].total++;
      if (absence.type === 'justifiee') stats[employeeName].justifiees++;
      if (absence.type === 'non_justifiee') stats[employeeName].nonJustifiees++;
      if (absence.statut === 'accepte') stats[employeeName].acceptees++;
      if (absence.statut === 'refuse') stats[employeeName].refusees++;
      if (absence.statut === 'en_attente') stats[employeeName].enAttente++;
    });

    return Object.entries(stats).map(([name, data]) => ({
      name,
      ...data
    })).sort((a, b) => b.total - a.total);
  };

  const exportToPDF = async () => {
    setIsExporting(true);
    
    try {
      const reportElement = document.getElementById('report-content');
      if (!reportElement) {
        throw new Error('Élément de rapport non trouvé');
      }

      // Créer un canvas à partir de l'élément HTML
      const canvas = await html2canvas(reportElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      // Créer le PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth - 20; // Marges de 10mm de chaque côté
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let yPosition = 10;

      // Si l'image est plus haute que la page, on la divise
      if (imgHeight <= pdfHeight - 20) {
        pdf.addImage(imgData, 'PNG', 10, yPosition, imgWidth, imgHeight);
      } else {
        // Image trop haute, on la divise en plusieurs pages
        const ratio = imgWidth / canvas.width;
        let srcY = 0;
        
        while (srcY < canvas.height) {
          const srcHeight = Math.min(
            (pdfHeight - 20) / ratio,
            canvas.height - srcY
          );
          
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = canvas.width;
          tempCanvas.height = srcHeight;
          const tempCtx = tempCanvas.getContext('2d');
          
          tempCtx.drawImage(
            canvas,
            0, srcY, canvas.width, srcHeight,
            0, 0, canvas.width, srcHeight
          );
          
          const tempImgData = tempCanvas.toDataURL('image/png');
          pdf.addImage(tempImgData, 'PNG', 10, 10, imgWidth, (srcHeight * ratio));
          
          srcY += srcHeight;
          if (srcY < canvas.height) {
            pdf.addPage();
          }
        }
      }

      // Sauvegarder le PDF
      const fileName = `rapport_absences_${new Date().toLocaleDateString('fr-FR').replace(/\//g, '-')}.pdf`;
      pdf.save(fileName);

    } catch (error) {
      console.error('Erreur lors de l\'export PDF:', error);
      alert('Erreur lors de l\'export PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const getStatusBadge = (statut) => {
    switch (statut) {
      case 'en_attente':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1"><Clock className="h-3 w-3" />En attente</Badge>;
      case 'accepte':
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1"><CheckCircle className="h-3 w-3" />Accepté</Badge>;
      case 'refuse':
        return <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 flex items-center gap-1"><XCircle className="h-3 w-3" />Refusé</Badge>;
      default:
        return <Badge variant="secondary">{statut}</Badge>;
    }
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case 'justifiee': return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Justifiée</Badge>;
      case 'non_justifiee': return <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">Non justifiée</Badge>;
      default: return <Badge variant="secondary">{type}</Badge>;
    }
  };

  const getDureeBadge = (duree) => {
    switch (duree) {
      case 'journee': return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Journée</Badge>;
      case 'demi_journee': return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Demi-journée</Badge>;
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

  // Trier les absences
  const sortedAbsences = [...filteredAbsences].sort((a, b) => {
    if (sortConfig.key) {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
    }
    return 0;
  });

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <ChevronDown className="h-4 w-4 opacity-30" />;
    return sortConfig.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      <p className="text-gray-600">Chargement des données...</p>
    </div>
  );

  const reportStats = getReportStats();
  const employeeStats = getEmployeeAbsenceStats();

  return (
    <div className="space-y-6">
      {/* Header avec statistiques */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestion des Absences</h1>
          <p className="text-gray-600 mt-1">Suivez et gérez les absences du personnel</p>
        </div>
        
        {(userProfile?.role === 'super_admin' || userProfile?.role === 'responsable') && (
          <Dialog open={showEmployeeDialog} onOpenChange={setShowEmployeeDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md hover:shadow-lg transition-all duration-200 px-4 py-2 rounded-lg font-medium">
                <Plus className="h-4 w-4" /> 
                Nouvelle absence
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-xl border-0 bg-white shadow-xl p-0 overflow-hidden">
              <DialogHeader className="space-y-0 px-6 pt-6 pb-4 bg-gradient-to-r from-blue-50 to-blue-100">
                <div className="flex items-center justify-center mb-3">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white border border-blue-200 shadow-sm">
                    <UserCheck className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <DialogTitle className="text-xl text-center text-gray-800 font-semibold">
                  Sélectionner un employé
                </DialogTitle>
                <DialogDescription className="text-center text-gray-600">
                  Choisissez l'employé pour lequel vous souhaitez enregistrer une absence.
                </DialogDescription>
              </DialogHeader>
              
              <div className="px-6 pb-6">
                <div className="grid gap-5 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="employee-select" className="text-sm font-medium text-gray-700 flex items-center">
                      Employé <span className="text-red-500 ml-1">*</span>
                    </Label>
                    
                    <div className="relative">
                      <select
                        id="employee-select"
                        value={selectedEmployee?.id || ""}
                        onChange={(e) => {
                          const selectedId = e.target.value;
                          if (selectedId) {
                            const selected = employees.find(e => e.id === selectedId);
                            setSelectedEmployee(selected);
                          } else {
                            setSelectedEmployee(null);
                          }
                        }}
                        className="w-full h-12 pl-4 pr-10 py-2 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors appearance-none bg-white cursor-pointer"
                      >
                        <option value="">Sélectionner un employé</option>
                        {employees.map(employee => (
                          <option key={employee.id} value={employee.id}>
                            {employee.prenom} {employee.nom} - {employee.entreprise}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                        <ChevronDown className="h-5 w-5" />
                      </div>
                    </div>
                  </div>
                  
                  {selectedEmployee && (
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 transition-all duration-300">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-white border border-blue-200 flex items-center justify-center shadow-sm">
                          <User className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{selectedEmployee.prenom} {selectedEmployee.nom}</p>
                          <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                            <Building2 className="h-3.5 w-3.5" /> 
                            {selectedEmployee.entreprise}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex gap-3 justify-end mt-2">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setSelectedEmployee(null);
                        setShowEmployeeDialog(false);
                      }}
                      className="rounded-lg border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2"
                    >
                      Annuler
                    </Button>
                    <Button 
                      onClick={() => setShowEmployeeDialog(false)} 
                      disabled={!selectedEmployee}
                      className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 px-4 py-2"
                    >
                      Continuer
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Statistiques générales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-5 text-white shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium">Total des absences</p>
              <h3 className="text-2xl font-bold mt-1">{absences.length}</h3>
            </div>
            <div className="bg-blue-400 p-3 rounded-lg">
              <CalendarDays className="h-5 w-5" />
            </div>
          </div>
          <p className="text-xs opacity-80 mt-2">Toutes périodes confondues</p>
        </div>

        <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl p-5 text-white shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium">En attente</p>
              <h3 className="text-2xl font-bold mt-1">{absences.filter(a => a.statut === 'en_attente').length}</h3>
            </div>
            <div className="bg-amber-400 p-3 rounded-lg">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <p className="text-xs opacity-80 mt-2">Requièrent votre attention</p>
        </div>

        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl p-5 text-white shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium">Acceptées</p>
              <h3 className="text-2xl font-bold mt-1">{absences.filter(a => a.statut === 'accepte').length}</h3>
            </div>
            <div className="bg-emerald-400 p-3 rounded-lg">
              <CheckCircle className="h-5 w-5" />
            </div>
          </div>
          <p className="text-xs opacity-80 mt-2">Absences approuvées</p>
        </div>

        <div className="bg-gradient-to-r from-rose-500 to-rose-600 rounded-xl p-5 text-white shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium">Refusées</p>
              <h3 className="text-2xl font-bold mt-1">{absences.filter(a => a.statut === 'refuse').length}</h3>
            </div>
            <div className="bg-rose-400 p-3 rounded-lg">
              <XCircle className="h-5 w-5" />
            </div>
          </div>
          <p className="text-xs opacity-80 mt-2">Absences non approuvées</p>
        </div>
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

      {/* Onglets principal */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-gray-100 rounded-lg p-1">
          <TabsTrigger 
            value="history" 
            className="flex items-center gap-2 rounded-md py-2 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            <CalendarDays className="h-4 w-4" />
            Historique des absences
          </TabsTrigger>
          <TabsTrigger 
            value="reports" 
            className="flex items-center gap-2 rounded-md py-2 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            <BarChart3 className="h-4 w-4" />
            Rapports et statistiques
          </TabsTrigger>
        </TabsList>

        {/* Onglet Historique */}
        <TabsContent value="history" className="space-y-4 mt-6">
          <Card className="rounded-xl overflow-hidden shadow-md">
            <CardHeader className="pb-3 bg-gray-50">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <CalendarDays className="h-5 w-5 text-blue-600" />
                  Historique des absences
                  <Badge variant="outline" className="ml-2 bg-blue-50 text-blue-700 border-blue-200">{filteredAbsences.length}</Badge>
                </CardTitle>
                
                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                    <Input
                      placeholder="Rechercher..."
                      className="pl-10 rounded-lg h-11"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[130px] rounded-lg h-11">
                        <div className="flex items-center gap-2">
                          <Filter className="h-4 w-4" />
                          <SelectValue placeholder="Statut" />
                        </div>
                      </SelectTrigger>
                      <SelectContent className="rounded-lg">
                        <SelectItem value="all" className="rounded-md">Tous statuts</SelectItem>
                        <SelectItem value="en_attente" className="rounded-md">En attente</SelectItem>
                        <SelectItem value="accepte" className="rounded-md">Accepté</SelectItem>
                        <SelectItem value="refuse" className="rounded-md">Refusé</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="w-[150px] rounded-lg h-11">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent className="rounded-lg">
                        <SelectItem value="all" className="rounded-md">Tous types</SelectItem>
                        <SelectItem value="justifiee" className="rounded-md">Justifiée</SelectItem>
                        <SelectItem value="non_justifiee" className="rounded-md">Non justifiée</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-0">
              {sortedAbsences.length > 0 ? (
                <div className="rounded-b-xl overflow-hidden">
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow className="hover:bg-gray-50">
                        <TableHead 
                          className="py-4 font-medium text-gray-700 cursor-pointer"
                          onClick={() => requestSort('nom_employe')}
                        >
                          <div className="flex items-center gap-1">
                            Employé
                            {getSortIcon('nom_employe')}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="py-4 font-medium text-gray-700 cursor-pointer"
                          onClick={() => requestSort('date_absence')}
                        >
                          <div className="flex items-center gap-1">
                            Date
                            {getSortIcon('date_absence')}
                          </div>
                        </TableHead>
                        <TableHead className="py-4 font-medium text-gray-700">Type</TableHead>
                        <TableHead className="py-4 font-medium text-gray-700">Durée</TableHead>
                        <TableHead className="py-4 font-medium text-gray-700">Statut</TableHead>
                        <TableHead className="py-4 font-medium text-gray-700">Motif</TableHead>
                        {(userProfile?.role === 'super_admin' || userProfile?.role === 'responsable') && (
                          <TableHead className="py-4 font-medium text-gray-700 text-right">Actions</TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedAbsences.map((absence) => (
                        <TableRow key={absence.id} className="group border-b hover:bg-gray-50/50 transition-colors">
                          <TableCell className="py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                                <User className="h-5 w-5 text-blue-600" />
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">{absence.prenom_employe} {absence.nom_employe}</div>
                                <div className="text-xs text-gray-500 flex items-center gap-1">
                                  <Building2 className="h-3 w-3" />
                                  {absence.entreprise}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="font-medium text-gray-900">{formatDate(absence.date_absence)}</div>
                            <div className="text-xs text-gray-500">
                              {formatDateTime(absence.created_at)}
                            </div>
                          </TableCell>
                          <TableCell className="py-4">{getTypeBadge(absence.type)}</TableCell>
                          <TableCell className="py-4">{getDureeBadge(absence.duree)}</TableCell>
                          <TableCell className="py-4">{getStatusBadge(absence.statut)}</TableCell>
                          <TableCell className="py-4">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="max-w-[200px] truncate text-gray-700">
                                    {absence.motif || "Aucun motif"}
                                  </div>
                                </TooltipTrigger>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                          {(userProfile?.role === 'super_admin' || userProfile?.role === 'responsable') && (
                            <TableCell className="py-4">
                              <div className="flex justify-end gap-1">
                                {absence.type === 'non_justifiee' && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleJustifyAbsence(absence.id)}
                                    className="h-7 w-7 text-green-600 hover:bg-green-50"
                                    title="Justifier l'absence"
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                )}
                                
                                {absence.statut === 'en_attente' && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleStatusChange(absence.id, 'accepte')}
                                      className="h-7 w-7 text-green-600 hover:bg-green-50"
                                      title="Accepter l'absence"
                                    >
                                      <CheckCircle className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleStatusChange(absence.id, 'refuse')}
                                      className="h-7 w-7 text-rose-600 hover:bg-rose-50"
                                      title="Refuser l'absence"
                                    >
                                      <XCircle className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                                
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteAbsence(absence.id)}
                                  className="h-7 w-7 text-rose-600 hover:bg-rose-50"
                                  title="Supprimer l'absence"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
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
                  <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                    <Clock className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune absence trouvée</h3>
                  <p className="text-gray-600 mb-4 max-w-md mx-auto">
                    {searchTerm || statusFilter !== 'all' || typeFilter !== 'all' 
                      ? "Aucune absence ne correspond à vos critères de recherche." 
                      : "Aucune absence n'a été enregistrée pour le moment."}
                  </p>
                  {(userProfile?.role === 'super_admin' || userProfile?.role === 'responsable') && (
                    <Button 
                      onClick={() => setShowEmployeeDialog(true)} 
                      className="rounded-lg bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Marquer une absence
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Rapports */}
        <TabsContent value="reports" className="space-y-6 mt-6">
          {/* Filtres pour les rapports */}
          <Card className="rounded-xl shadow-md">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-t-xl">
              <CardTitle className="flex items-center gap-2 text-xl text-purple-700">
                <Filter className="h-5 w-5" />
                Filtres du rapport
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="report-start-date">Date de début</Label>
                  <Input
                    id="report-start-date"
                    type="date"
                    value={reportStartDate}
                    onChange={(e) => setReportStartDate(e.target.value)}
                    className="rounded-lg"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="report-end-date">Date de fin</Label>
                  <Input
                    id="report-end-date"
                    type="date"
                    value={reportEndDate}
                    onChange={(e) => setReportEndDate(e.target.value)}
                    className="rounded-lg"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="report-employee">Employé</Label>
                  <Select value={reportEmployeeFilter} onValueChange={setReportEmployeeFilter}>
                    <SelectTrigger className="rounded-lg">
                      <SelectValue placeholder="Tous les employés" />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg">
                      <SelectItem value="all">Tous les employés</SelectItem>
                      {employees.map(employee => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {employee.prenom} {employee.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-end">
                  <Button
                    onClick={exportToPDF}
                    disabled={isExporting}
                    className="w-full h-11 gap-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 rounded-lg"
                  >
                    {isExporting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Export en cours...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        Exporter PDF
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contenu du rapport */}
          <div id="report-content" className="space-y-6 bg-white p-8 rounded-xl">
            {/* En-tête du rapport */}
            <div className="text-center border-b pb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Rapport des Absences</h1>
              <p className="text-gray-600">
                Période : {formatDate(reportStartDate)} - {formatDate(reportEndDate)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Généré le {new Date().toLocaleDateString('fr-FR')} à {new Date().toLocaleTimeString('fr-FR')}
              </p>
            </div>

            {/* Statistiques principales */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <CalendarDays className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total</p>
                    <p className="text-2xl font-bold text-blue-600">{reportStats.total}</p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Justifiées</p>
                    <p className="text-2xl font-bold text-green-600">{reportStats.justifiees}</p>
                  </div>
                </div>
              </div>

              <div className="bg-rose-50 rounded-lg p-4 border border-rose-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center">
                    <XCircle className="h-5 w-5 text-rose-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Non justifiées</p>
                    <p className="text-2xl font-bold text-rose-600">{reportStats.nonJustifiees}</p>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">En attente</p>
                    <p className="text-2xl font-bold text-amber-600">{reportStats.enAttente}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Répartition par statut */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <PieChart className="h-5 w-5 text-purple-600" />
                Répartition par statut
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-lg text-center border">
                  <div className="text-2xl font-bold text-emerald-600 mb-1">{reportStats.acceptees}</div>
                  <div className="text-sm text-gray-600">Acceptées</div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div 
                      className="bg-emerald-500 h-2 rounded-full" 
                      style={{ width: `${reportStats.total ? (reportStats.acceptees / reportStats.total) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="bg-white p-4 rounded-lg text-center border">
                  <div className="text-2xl font-bold text-rose-600 mb-1">{reportStats.refusees}</div>
                  <div className="text-sm text-gray-600">Refusées</div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div 
                      className="bg-rose-500 h-2 rounded-full" 
                      style={{ width: `${reportStats.total ? (reportStats.refusees / reportStats.total) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="bg-white p-4 rounded-lg text-center border">
                  <div className="text-2xl font-bold text-amber-600 mb-1">{reportStats.enAttente}</div>
                  <div className="text-sm text-gray-600">En attente</div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div 
                      className="bg-amber-500 h-2 rounded-full" 
                      style={{ width: `${reportStats.total ? (reportStats.enAttente / reportStats.total) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Statistiques par employé */}
            {employeeStats.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  Absences par employé
                </h3>
                <div className="bg-white rounded-lg overflow-hidden border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-medium">Employé</TableHead>
                        <TableHead className="text-center font-medium">Total</TableHead>
                        <TableHead className="text-center font-medium">Justifiées</TableHead>
                        <TableHead className="text-center font-medium">Non justifiées</TableHead>
                        <TableHead className="text-center font-medium">Acceptées</TableHead>
                        <TableHead className="text-center font-medium">En attente</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employeeStats.slice(0, 10).map((employee, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{employee.name}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-blue-50 text-blue-700">
                              {employee.total}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-green-50 text-green-700">
                              {employee.justifiees}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-rose-50 text-rose-700">
                              {employee.nonJustifiees}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700">
                              {employee.acceptees}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-amber-50 text-amber-700">
                              {employee.enAttente}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Liste des absences pour la période */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-green-600" />
                Détail des absences ({getReportData().length})
              </h3>
              {getReportData().length > 0 ? (
                <div className="bg-white rounded-lg overflow-hidden border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-medium">Employé</TableHead>
                        <TableHead className="font-medium">Date</TableHead>
                        <TableHead className="font-medium">Type</TableHead>
                        <TableHead className="font-medium">Durée</TableHead>
                        <TableHead className="font-medium">Statut</TableHead>
                        <TableHead className="font-medium">Motif</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getReportData().slice(0, 20).map((absence) => (
                        <TableRow key={absence.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{absence.prenom_employe} {absence.nom_employe}</div>
                              <div className="text-xs text-gray-500">{absence.entreprise}</div>
                            </div>
                          </TableCell>
                          <TableCell>{formatDate(absence.date_absence)}</TableCell>
                          <TableCell>{getTypeBadge(absence.type)}</TableCell>
                          <TableCell>{getDureeBadge(absence.duree)}</TableCell>
                          <TableCell>{getStatusBadge(absence.statut)}</TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {absence.motif || "Aucun motif"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {getReportData().length > 20 && (
                    <div className="p-4 text-center text-gray-500 bg-gray-50 border-t">
                      ... et {getReportData().length - 20} autres absences
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-lg p-8 text-center border">
                  <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                    <CalendarDays className="h-6 w-6 text-gray-400" />
                  </div>
                  <p className="text-gray-600">Aucune absence trouvée pour la période sélectionnée</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
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
    <Card className="border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg rounded-xl overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onCancel} className="h-8 w-8 text-white hover:bg-blue-500 rounded-full">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <CardTitle className="text-white">Nouvelle absence</CardTitle>
        </div>
      </CardHeader>
      
      <CardContent className="pt-6">
        <div className="mb-6 p-4 bg-white rounded-lg border border-blue-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
              <User className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">{employee.prenom} {employee.nom}</p>
              <p className="text-sm text-gray-600 flex items-center gap-1">
                <Building2 className="h-3 w-3" /> 
                {employee.entreprise}
              </p>
            </div>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date_absence" className="text-gray-700">Date d'absence *</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                <Input 
                  id="date_absence"
                  type="date" 
                  required 
                  className="pl-10 h-11 rounded-lg" 
                  value={formData.date_absence} 
                  onChange={(e) => setFormData({ ...formData, date_absence: e.target.value })} 
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type" className="text-gray-700">Type d'absence *</Label>
              <div className="relative">
                <select
                  id="type"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full h-11 pl-4 pr-10 py-2 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors appearance-none bg-white cursor-pointer"
                >
                  <option value="non_justifiee">Non justifiée</option>
                  <option value="justifiee">Justifiée</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                  <ChevronDown className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duree" className="text-gray-700">Durée *</Label>
              <div className="relative">
                <select
                  id="duree"
                  value={formData.duree}
                  onChange={(e) => setFormData({ ...formData, duree: e.target.value })}
                  className="w-full h-11 pl-4 pr-10 py-2 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors appearance-none bg-white cursor-pointer"
                >
                  <option value="journee">Journée complète</option>
                  <option value="demi_journee">Demi-journée</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                  <ChevronDown className="h-5 w-5" />
                </div>
              </div>
            </div>
            
            {formData.type === 'justifiee' && (
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="justificatif" className="text-gray-700">Justificatif</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors cursor-pointer">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <FileText className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Glissez-déposez votre fichier</p>
                      <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG (max. 10MB)</p>
                    </div>
                    <Button variant="outline" size="sm" type="button" className="rounded-lg mt-2">
                      Parcourir les fichiers
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="motif" className="text-gray-700">Motif</Label>
            <Textarea
              id="motif"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              rows={3} 
              placeholder="Décrivez le motif de l'absence..." 
              value={formData.motif} 
              onChange={(e) => setFormData({ ...formData, motif: e.target.value })} 
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button 
              type="submit" 
              disabled={submitting} 
              className="flex-1 h-11 gap-2 rounded-lg bg-blue-600 hover:bg-blue-700"
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
              className="h-11 px-6 rounded-lg"
            >
              Annuler
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
