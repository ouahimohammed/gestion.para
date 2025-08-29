import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  DollarSign, 
  Calendar, 
  User, 
  Moon, 
  Sun,
  TrendingUp,
  Filter,
  Download,
  X,
  BarChart3,
  FileText,
  Building2,
  Clock,
  Eye,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Edit3,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Save,
  AlertCircle
} from 'lucide-react';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

const SuiviHeuresSup = () => {
  const { userProfile } = useAuth();
  
  // États pour les données
  const [employees, setEmployees] = useState([]);
  const [entreprises, setEntreprises] = useState([]);
  const [heuresSupplementaires, setHeuresSupplementaires] = useState([]);
  const [revenusNuit, setRevenusNuit] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // États pour l'interface
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedEntreprise, setSelectedEntreprise] = useState('');
  const [showAddHeuresModal, setShowAddHeuresModal] = useState(false);
  const [showAddRevenusModal, setShowAddRevenusModal] = useState(false);
  const [showEditHeuresModal, setShowEditHeuresModal] = useState(false);
  const [showEditRevenusModal, setShowEditRevenusModal] = useState(false);
  const [showExportHeuresModal, setShowExportHeuresModal] = useState(false);
  const [showExportRevenusModal, setShowExportRevenusModal] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  
  // Formulaires
  const [heuresForm, setHeuresForm] = useState({
    employeeId: '',
    date: '',
    type: 'demi-journée'
  });
  
  const [revenusForm, setRevenusForm] = useState({
    date: '',
    montant: ''
  });

  // Charger les données depuis Firebase
  useEffect(() => {
    if (!userProfile) return;
    
    setLoading(true);
    
    // Charger les entreprises (pour super_admin)
    let entreprisesUnsubscribe = () => {};
    if (userProfile.role === 'super_admin') {
      entreprisesUnsubscribe = onSnapshot(
        collection(db, 'entreprises'), 
        (snapshot) => {
          const entreprisesData = [];
          snapshot.forEach((doc) => {
            entreprisesData.push({ id: doc.id, ...doc.data() });
          });
          setEntreprises(entreprisesData);
        }
      );
    }

    // Charger les employés selon le rôle
    let employeesQuery;
    if (userProfile.role === 'super_admin') {
      employeesQuery = collection(db, 'employes');
    } else if (userProfile.role === 'responsable') {
      employeesQuery = query(
        collection(db, 'employes'),
        where('entreprise', '==', userProfile.entreprise)
      );
    } else {
      employeesQuery = query(
        collection(db, 'employes'),
        where('userId', '==', userProfile.uid)
      );
    }

    const employeesUnsubscribe = onSnapshot(employeesQuery, (snapshot) => {
      const employeesData = [];
      snapshot.forEach((doc) => {
        employeesData.push({ id: doc.id, ...doc.data() });
      });
      setEmployees(employeesData);
    });

    // Charger les heures supplémentaires
    const heuresUnsubscribe = onSnapshot(
      collection(db, 'heures_supplementaires'), 
      (snapshot) => {
        const heuresData = [];
        snapshot.forEach((doc) => {
          heuresData.push({ id: doc.id, ...doc.data() });
        });
        setHeuresSupplementaires(heuresData);
      }
    );

    // Charger les revenus de nuit
    const revenusUnsubscribe = onSnapshot(
      collection(db, 'revenus_nuit'), 
      (snapshot) => {
        const revenusData = [];
        snapshot.forEach((doc) => {
          revenusData.push({ id: doc.id, ...doc.data() });
        });
        setRevenusNuit(revenusData);
        setLoading(false);
      }
    );

    return () => {
      employeesUnsubscribe();
      heuresUnsubscribe();
      revenusUnsubscribe();
      entreprisesUnsubscribe();
    };
  }, [userProfile]);

  // Filtrer les données
  const getFilteredEmployees = () => {
    let filtered = employees;
    
    if (userProfile?.role === 'super_admin' && selectedEntreprise) {
      filtered = filtered.filter(emp => emp.entreprise === selectedEntreprise);
    }
    
    if (selectedEmployee) {
      filtered = filtered.filter(emp => emp.id === selectedEmployee);
    }
    
    return filtered;
  };

  const filteredEmployees = getFilteredEmployees();
  
  // Pagination
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedEmployees = filteredEmployees.slice(startIndex, endIndex);

  const filteredHeures = heuresSupplementaires.filter(item => {
    const date = new Date(item.date);
    const isInPeriod = date.getMonth() + 1 === parseInt(selectedMonth) && 
                     date.getFullYear() === parseInt(selectedYear);
    
    if (!isInPeriod) return false;
    
    return filteredEmployees.some(emp => emp.id === item.employeeId);
  });

  const filteredRevenus = revenusNuit.filter(item => {
    const date = new Date(item.date);
    return date.getMonth() + 1 === parseInt(selectedMonth) && 
           date.getFullYear() === parseInt(selectedYear);
  });

  // Calculer les statistiques par employé
  const employeeStats = paginatedEmployees.map(employee => {
    const heuresEmployee = filteredHeures.filter(h => h.employeeId === employee.id);
    
    const joursComplets = heuresEmployee.filter(h => h.type === 'journée complète').length;
    const demiJournees = heuresEmployee.filter(h => h.type === 'demi-journée').length;
    
    const montantTotal = (joursComplets * 100) + (demiJournees * 50);
    
    return {
      ...employee,
      joursComplets,
      demiJournees,
      montantTotal,
      heuresData: heuresEmployee
    };
  });

  // Calculer les totaux
  const totalHeuresSupplementaires = filteredEmployees.reduce((sum, employee) => {
    const heuresEmployee = filteredHeures.filter(h => h.employeeId === employee.id);
    const joursComplets = heuresEmployee.filter(h => h.type === 'journée complète').length;
    const demiJournees = heuresEmployee.filter(h => h.type === 'demi-journée').length;
    return sum + (joursComplets * 100) + (demiJournees * 50);
  }, 0);
  
  const totalRevenusNuit = filteredRevenus.reduce((sum, rev) => sum + parseFloat(rev.montant || 0), 0);
  const resultatNet = totalRevenusNuit - totalHeuresSupplementaires;

  // CRUD Operations pour Heures Supplémentaires
  const addHeuresSupplementaires = async () => {
    if (!heuresForm.employeeId || !heuresForm.date) {
      alert('Veuillez sélectionner un employé et une date');
      return;
    }

    try {
      const montant = heuresForm.type === 'demi-journée' ? 50 : 100;
      
      await addDoc(collection(db, 'heures_supplementaires'), {
        employeeId: heuresForm.employeeId,
        date: heuresForm.date,
        type: heuresForm.type,
        montant,
        createdAt: serverTimestamp()
      });

      setShowAddHeuresModal(false);
      setHeuresForm({ employeeId: '', date: '', type: 'demi-journée' });
    } catch (error) {
      console.error('Erreur lors de l\'ajout des heures supplémentaires:', error);
      alert('Erreur lors de l\'ajout des heures supplémentaires');
    }
  };

  const updateHeuresSupplementaires = async () => {
    if (!heuresForm.employeeId || !heuresForm.date || !editingItem) {
      alert('Données incomplètes pour la modification');
      return;
    }

    try {
      const montant = heuresForm.type === 'demi-journée' ? 50 : 100;
      
      await updateDoc(doc(db, 'heures_supplementaires', editingItem.id), {
        employeeId: heuresForm.employeeId,
        date: heuresForm.date,
        type: heuresForm.type,
        montant,
        updatedAt: serverTimestamp()
      });

      setShowEditHeuresModal(false);
      setEditingItem(null);
      setHeuresForm({ employeeId: '', date: '', type: 'demi-journée' });
    } catch (error) {
      console.error('Erreur lors de la modification:', error);
      alert('Erreur lors de la modification');
    }
  };

  const deleteHeuresSupplementaires = async (id) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette entrée ?')) return;

    try {
      await deleteDoc(doc(db, 'heures_supplementaires', id));
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      alert('Erreur lors de la suppression');
    }
  };

  // CRUD Operations pour Revenus de Nuit
  const addRevenusNuit = async () => {
    if (!revenusForm.date || !revenusForm.montant) {
      alert('Veuillez saisir une date et un montant');
      return;
    }

    try {
      await addDoc(collection(db, 'revenus_nuit'), {
        date: revenusForm.date,
        montant: parseFloat(revenusForm.montant),
        createdAt: serverTimestamp()
      });

      setShowAddRevenusModal(false);
      setRevenusForm({ date: '', montant: '' });
    } catch (error) {
      console.error('Erreur lors de l\'ajout des revenus de nuit:', error);
      alert('Erreur lors de l\'ajout des revenus de nuit');
    }
  };

  const updateRevenusNuit = async () => {
    if (!revenusForm.date || !revenusForm.montant || !editingItem) {
      alert('Données incomplètes pour la modification');
      return;
    }

    try {
      await updateDoc(doc(db, 'revenus_nuit', editingItem.id), {
        date: revenusForm.date,
        montant: parseFloat(revenusForm.montant),
        updatedAt: serverTimestamp()
      });

      setShowEditRevenusModal(false);
      setEditingItem(null);
      setRevenusForm({ date: '', montant: '' });
    } catch (error) {
      console.error('Erreur lors de la modification:', error);
      alert('Erreur lors de la modification');
    }
  };

  const deleteRevenusNuit = async (id) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette entrée ?')) return;

    try {
      await deleteDoc(doc(db, 'revenus_nuit', id));
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      alert('Erreur lors de la suppression');
    }
  };

  // Fonctions d'édition
  const openEditHeures = (heure) => {
    setEditingItem(heure);
    setHeuresForm({
      employeeId: heure.employeeId,
      date: heure.date,
      type: heure.type
    });
    setShowEditHeuresModal(true);
  };

  const openEditRevenus = (revenu) => {
    setEditingItem(revenu);
    setRevenusForm({
      date: revenu.date,
      montant: revenu.montant.toString()
    });
    setShowEditRevenusModal(true);
  };

  // Génération PDF pour heures supplémentaires seulement
  const generateHeuresPDF = async () => {
    setExportLoading(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const reportContent = `
RAPPORT HEURES SUPPLÉMENTAIRES
===============================

Période: ${new Date(selectedYear, selectedMonth - 1, 1).toLocaleString('fr-FR', { month: 'long' })} ${selectedYear}
Date de génération: ${new Date().toLocaleDateString('fr-FR')}
Généré par: ${userProfile?.nom} (${userProfile?.role})
${userProfile?.entreprise ? `Entreprise: ${userProfile.entreprise}` : ''}

DÉTAILS PAR EMPLOYÉ:
${filteredEmployees.map(employee => {
  const heuresEmployee = filteredHeures.filter(h => h.employeeId === employee.id);
  const joursComplets = heuresEmployee.filter(h => h.type === 'journée complète').length;
  const demiJournees = heuresEmployee.filter(h => h.type === 'demi-journée').length;
  const montantTotal = (joursComplets * 100) + (demiJournees * 50);
  
  return `
${employee.prenom} ${employee.nom} - ${employee.poste}
   • Journées complètes: ${joursComplets} (${joursComplets * 100} DH)
   • Demi-journées: ${demiJournees} (${demiJournees * 50} DH)
   • Total: ${montantTotal} DH`;
}).join('\n')}

===============================
TOTAL GÉNÉRAL: ${totalHeuresSupplementaires.toFixed(2)} DH
===============================
      `;
      
      const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `heures_supplementaires_${selectedMonth}_${selectedYear}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error);
      alert('Erreur lors de la génération du PDF');
    } finally {
      setExportLoading(false);
      setShowExportHeuresModal(false);
    }
  };

  // Génération PDF pour revenus de nuit seulement
  const generateRevenusPDF = async () => {
    setExportLoading(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const reportContent = `
RAPPORT REVENUS DE NUIT
=======================

Période: ${new Date(selectedYear, selectedMonth - 1, 1).toLocaleString('fr-FR', { month: 'long' })} ${selectedYear}
Date de génération: ${new Date().toLocaleDateString('fr-FR')}
Généré par: ${userProfile?.nom} (${userProfile?.role})

DÉTAILS DES REVENUS DE NUIT:
${filteredRevenus.map(revenu => 
  `${formatDate(revenu.date)}: ${parseFloat(revenu.montant).toFixed(2)} DH`
).join('\n')}

=======================
TOTAL REVENUS DE NUIT: ${totalRevenusNuit.toFixed(2)} DH
=======================
      `;
      
      const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `revenus_nuit_${selectedMonth}_${selectedYear}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error);
      alert('Erreur lors de la génération du PDF');
    } finally {
      setExportLoading(false);
      setShowExportRevenusModal(false);
    }
  };

  // Formater la date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Navigation pagination
  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(totalPages, page)));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-6"></div>
            <div className="absolute inset-0 rounded-full h-16 w-16 border-4 border-purple-200 border-t-purple-600 animate-spin mx-auto" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
          </div>
          <p className="text-gray-700 text-lg font-medium">Chargement des données...</p>
          <p className="text-gray-500 text-sm mt-2">Synchronisation avec Firebase</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header avec design premium light */}
        <div className="relative bg-white/90 backdrop-blur-xl border border-gray-200/50 rounded-3xl p-6 md:p-8 mb-8 shadow-xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -skew-x-12 animate-pulse"></div>
          
          <div className="relative z-10">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg">
                  <Clock className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent mb-2">
                    Suivi des Heures Supplémentaires
                  </h1>
                  <p className="text-gray-600 text-lg">
                    Gestion intelligente des heures et revenus
                    {userProfile?.role === 'responsable' && (
                      <span className="ml-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                        {userProfile.entreprise}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-3">
                {/* Filtres avec design moderne */}
                <div className="flex items-center gap-2 bg-white/70 backdrop-blur-sm border border-gray-200 rounded-2xl px-4 py-3 hover:bg-white/90 transition-all duration-300 shadow-sm">
                  <Filter size={18} className="text-gray-500" />
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-transparent border-none focus:ring-0 text-gray-700 text-sm font-medium outline-none"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                      <option key={month} value={month} className="bg-white text-gray-800">
                        {new Date(2000, month - 1, 1).toLocaleString('fr-FR', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="flex items-center gap-2 bg-white/70 backdrop-blur-sm border border-gray-200 rounded-2xl px-4 py-3 hover:bg-white/90 transition-all duration-300 shadow-sm">
                  <Calendar size={18} className="text-gray-500" />
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="bg-transparent border-none focus:ring-0 text-gray-700 text-sm font-medium outline-none"
                  >
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                      <option key={year} value={year} className="bg-white text-gray-800">{year}</option>
                    ))}
                  </select>
                </div>

                {/* Filtre par entreprise */}
                {userProfile?.role === 'super_admin' && (
                  <div className="flex items-center gap-2 bg-white/70 backdrop-blur-sm border border-gray-200 rounded-2xl px-4 py-3 hover:bg-white/90 transition-all duration-300 shadow-sm">
                    <Building2 size={18} className="text-gray-500" />
                    <select
                      value={selectedEntreprise}
                      onChange={(e) => setSelectedEntreprise(e.target.value)}
                      className="bg-transparent border-none focus:ring-0 text-gray-700 text-sm font-medium outline-none"
                    >
                      <option value="" className="bg-white text-gray-800">Toutes les entreprises</option>
                      {entreprises.map(entreprise => (
                        <option key={entreprise.id} value={entreprise.id} className="bg-white text-gray-800">
                          {entreprise.nom}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Filtre par employé */}
                {userProfile?.role !== 'employe' && (
                  <div className="flex items-center gap-2 bg-white/70 backdrop-blur-sm border border-gray-200 rounded-2xl px-4 py-3 hover:bg-white/90 transition-all duration-300 shadow-sm">
                    <User size={18} className="text-gray-500" />
                    <select
                      value={selectedEmployee}
                      onChange={(e) => setSelectedEmployee(e.target.value)}
                      className="bg-transparent border-none focus:ring-0 text-gray-700 text-sm font-medium outline-none"
                    >
                      <option value="" className="bg-white text-gray-800">Tous les employés</option>
                      {filteredEmployees.map(employee => (
                        <option key={employee.id} value={employee.id} className="bg-white text-gray-800">
                          {employee.prenom} {employee.nom}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Boutons Export séparés */}
                <button
                  onClick={() => setShowExportHeuresModal(true)}
                  className="group relative flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-2xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 text-sm font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <Download size={18} className="group-hover:rotate-12 transition-transform duration-300" />
                  Export Heures
                </button>

                <button
                  onClick={() => setShowExportRevenusModal(true)}
                  className="group relative flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white px-6 py-3 rounded-2xl hover:from-purple-600 hover:to-pink-700 transition-all duration-300 text-sm font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <Moon size={18} className="group-hover:rotate-12 transition-transform duration-300" />
                  Export Revenus Nuit
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Cartes de statistiques en light mode */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="group relative bg-white/90 backdrop-blur-xl border border-blue-200/50 p-6 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10 flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Sun className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-gray-600 text-sm font-medium mb-1">Heures supplémentaires</p>
                <p className="text-2xl font-bold text-gray-900">{totalHeuresSupplementaires.toFixed(2)} DH</p>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowUpRight size={14} className="text-blue-500" />
                  <span className="text-blue-500 text-xs font-medium">Ce mois</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="group relative bg-white/90 backdrop-blur-xl border border-purple-200/50 p-6 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10 flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Moon className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-gray-600 text-sm font-medium mb-1">Revenus de nuit</p>
                <p className="text-2xl font-bold text-gray-900">{totalRevenusNuit.toFixed(2)} DH</p>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowUpRight size={14} className="text-purple-500" />
                  <span className="text-purple-500 text-xs font-medium">Ce mois</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className={`group relative backdrop-blur-xl border p-6 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105 overflow-hidden ${
            resultatNet >= 0 
              ? 'bg-emerald-50/90 border-emerald-200/50' 
              : 'bg-red-50/90 border-red-200/50'
          }`}>
            <div className={`absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${
              resultatNet >= 0 ? 'from-emerald-500/5 to-transparent' : 'from-red-500/5 to-transparent'
            }`}></div>
            <div className="relative z-10 flex items-center gap-4">
              <div className={`p-3 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300 ${
                resultatNet >= 0 
                  ? 'bg-gradient-to-br from-emerald-500 to-emerald-600' 
                  : 'bg-gradient-to-br from-red-500 to-red-600'
              }`}>
                <DollarSign className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-gray-600 text-sm font-medium mb-1">Résultat net</p>
                <p className={`text-2xl font-bold ${resultatNet >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {resultatNet >= 0 ? '+' : ''}{resultatNet.toFixed(2)} DH
                </p>
                <div className="flex items-center gap-1 mt-1">
                  {resultatNet >= 0 ? (
                    <ArrowUpRight size={14} className="text-emerald-500" />
                  ) : (
                    <ArrowDownRight size={14} className="text-red-500" />
                  )}
                  <span className={`text-xs font-medium ${resultatNet >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {resultatNet >= 0 ? 'Bénéfice' : 'Déficit'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Section employés avec pagination */}
          <div className="bg-white/90 backdrop-blur-xl border border-gray-200/50 rounded-3xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-6 border-b border-gray-200/50">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
                    <User className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Employés & Heures</h2>
                    <p className="text-sm text-gray-600">
                      Page {currentPage} sur {totalPages} ({filteredEmployees.length} employés)
                    </p>
                  </div>
                </div>
                {userProfile?.role !== 'employe' && (
                  <button
                    onClick={() => setShowAddHeuresModal(true)}
                    className="group flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-5 py-3 rounded-2xl hover:from-blue-600 hover:to-blue-700 transition-all duration-300 text-sm font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    <Plus size={16} className="group-hover:rotate-90 transition-transform duration-300" />
                    Ajouter heures
                  </button>
                )}
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50/80">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Employé</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">J. Complets</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Demi-J.</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Total</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200/50">
                  {employeeStats.map((employee, index) => (
                    <tr key={employee.id} className="hover:bg-gray-50/50 transition-colors duration-200 group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="h-12 w-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                              <User className="h-6 w-6 text-white" />
                            </div>
                            <div className="absolute -top-1 -right-1 h-4 w-4 bg-emerald-400 rounded-full border-2 border-white"></div>
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{employee.prenom} {employee.nom}</div>
                            <div className="text-sm text-gray-600">{employee.poste}</div>
                            {userProfile?.role === 'super_admin' && (
                              <div className="text-xs text-gray-500">CIN: {employee.cin}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                          {employee.joursComplets}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                          {employee.demiJournees}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-emerald-600">{employee.montantTotal.toFixed(2)} DH</span>
                          {employee.montantTotal > 0 && (
                            <Sparkles size={16} className="text-yellow-500 animate-pulse" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {employee.heuresData?.map(heure => (
                            <div key={heure.id} className="flex gap-1">
                              <button
                                onClick={() => openEditHeures(heure)}
                                className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-xl transition-all duration-200"
                                title="Modifier"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                onClick={() => deleteHeuresSupplementaires(heure.id)}
                                className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-xl transition-all duration-200"
                                title="Supprimer"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-200/50 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Affichage de {startIndex + 1} à {Math.min(endIndex, filteredEmployees.length)} sur {filteredEmployees.length} employés
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  
                  <div className="flex gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => goToPage(page)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                          currentPage === page
                            ? 'bg-blue-500 text-white shadow-lg'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                  
                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Section revenus de nuit */}
          <div className="bg-white/90 backdrop-blur-xl border border-gray-200/50 rounded-3xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 p-6 border-b border-gray-200/50">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg">
                    <Moon className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Revenus de Nuit</h2>
                </div>
                {userProfile?.role !== 'employe' && (
                  <button
                    onClick={() => setShowAddRevenusModal(true)}
                    className="group flex items-center gap-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white px-5 py-3 rounded-2xl hover:from-purple-600 hover:to-purple-700 transition-all duration-300 text-sm font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    <Plus size={16} className="group-hover:rotate-90 transition-transform duration-300" />
                    Ajouter revenus
                  </button>
                )}
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50/80">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Montant</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200/50">
                  {filteredRevenus.map((revenu, index) => (
                    <tr key={revenu.id} className="hover:bg-gray-50/50 transition-colors duration-200 group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Calendar size={16} className="text-purple-500" />
                          <span className="text-gray-900 font-medium">{formatDate(revenu.date)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-purple-600">{parseFloat(revenu.montant).toFixed(2)} DH</span>
                          <Sparkles size={14} className="text-yellow-500 animate-pulse" />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditRevenus(revenu)}
                            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-xl transition-all duration-200"
                            title="Modifier"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            onClick={() => deleteRevenusNuit(revenu.id)}
                            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-xl transition-all duration-200"
                            title="Supprimer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gradient-to-r from-purple-500/10 to-pink-500/10">
                  <tr>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900">TOTAL</td>
                    <td className="px-6 py-4">
                      <span className="text-xl font-bold text-purple-600">{totalRevenusNuit.toFixed(2)} DH</span>
                    </td>
                    <td className="px-6 py-4"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* Section graphique */}
        
      </div>

      {/* Modal Ajouter Heures */}
      {showAddHeuresModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl max-w-md w-full p-8 shadow-2xl border border-gray-200/50">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
                  <Plus className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Ajouter Heures</h2>
              </div>
              <button
                onClick={() => setShowAddHeuresModal(false)}
                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-2xl transition-all duration-200"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Employé *</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <select
                    value={heuresForm.employeeId}
                    onChange={(e) => setHeuresForm({ ...heuresForm, employeeId: e.target.value })}
                    className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white outline-none"
                  >
                    <option value="">Sélectionner un employé</option>
                    {filteredEmployees.map(employee => (
                      <option key={employee.id} value={employee.id}>
                        {employee.prenom} {employee.nom} - {employee.poste}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Date *</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="date"
                    value={heuresForm.date}
                    onChange={(e) => setHeuresForm({ ...heuresForm, date: e.target.value })}
                    className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white outline-none"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Type *</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setHeuresForm({ ...heuresForm, type: 'demi-journée' })}
                    className={`p-4 rounded-2xl border-2 transition-all duration-200 ${
                      heuresForm.type === 'demi-journée'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="text-center">
                      <Sun className="h-6 w-6 mx-auto mb-2" />
                      <div className="font-semibold">Demi-journée</div>
                      <div className="text-sm opacity-70">50 DH</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setHeuresForm({ ...heuresForm, type: 'journée complète' })}
                    className={`p-4 rounded-2xl border-2 transition-all duration-200 ${
                      heuresForm.type === 'journée complète'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="text-center">
                      <Clock className="h-6 w-6 mx-auto mb-2" />
                      <div className="font-semibold">Journée complète</div>
                      <div className="text-sm opacity-70">100 DH</div>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-10">
              <button
                onClick={() => setShowAddHeuresModal(false)}
                className="flex-1 px-6 py-4 border-2 border-gray-200 text-gray-700 rounded-2xl hover:bg-gray-50 transition-all duration-200 font-semibold"
              >
                Annuler
              </button>
              <button
                onClick={addHeuresSupplementaires}
                className="flex-1 px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-semibold shadow-xl hover:shadow-2xl transform hover:scale-105"
              >
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Modifier Heures */}
      {showEditHeuresModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl max-w-md w-full p-8 shadow-2xl border border-gray-200/50">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl">
                  <Edit3 className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Modifier Heures</h2>
              </div>
              <button
                onClick={() => setShowEditHeuresModal(false)}
                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-2xl transition-all duration-200"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Employé *</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <select
                    value={heuresForm.employeeId}
                    onChange={(e) => setHeuresForm({ ...heuresForm, employeeId: e.target.value })}
                    className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 transition-all duration-200 bg-white outline-none"
                  >
                    <option value="">Sélectionner un employé</option>
                    {filteredEmployees.map(employee => (
                      <option key={employee.id} value={employee.id}>
                        {employee.prenom} {employee.nom} - {employee.poste}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Date *</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="date"
                    value={heuresForm.date}
                    onChange={(e) => setHeuresForm({ ...heuresForm, date: e.target.value })}
                    className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 transition-all duration-200 bg-white outline-none"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Type *</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setHeuresForm({ ...heuresForm, type: 'demi-journée' })}
                    className={`p-4 rounded-2xl border-2 transition-all duration-200 ${
                      heuresForm.type === 'demi-journée'
                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="text-center">
                      <Sun className="h-6 w-6 mx-auto mb-2" />
                      <div className="font-semibold">Demi-journée</div>
                      <div className="text-sm opacity-70">50 DH</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setHeuresForm({ ...heuresForm, type: 'journée complète' })}
                    className={`p-4 rounded-2xl border-2 transition-all duration-200 ${
                      heuresForm.type === 'journée complète'
                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="text-center">
                      <Clock className="h-6 w-6 mx-auto mb-2" />
                      <div className="font-semibold">Journée complète</div>
                      <div className="text-sm opacity-70">100 DH</div>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-10">
              <button
                onClick={() => setShowEditHeuresModal(false)}
                className="flex-1 px-6 py-4 border-2 border-gray-200 text-gray-700 rounded-2xl hover:bg-gray-50 transition-all duration-200 font-semibold"
              >
                Annuler
              </button>
              <button
                onClick={updateHeuresSupplementaires}
                className="flex-1 px-6 py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-2xl hover:from-orange-700 hover:to-red-700 transition-all duration-200 font-semibold shadow-xl hover:shadow-2xl transform hover:scale-105"
              >
                <div className="flex items-center justify-center gap-2">
                  <Save size={18} />
                  Modifier
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ajouter Revenus */}
      {showAddRevenusModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl max-w-md w-full p-8 shadow-2xl border border-gray-200/50">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl">
                  <Moon className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Revenus de Nuit</h2>
              </div>
              <button
                onClick={() => setShowAddRevenusModal(false)}
                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-2xl transition-all duration-200"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Date *</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="date"
                    value={revenusForm.date}
                    onChange={(e) => setRevenusForm({ ...revenusForm, date: e.target.value })}
                    className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-200 bg-white outline-none"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Montant (DH) *</label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="number"
                    value={revenusForm.montant}
                    onChange={(e) => setRevenusForm({ ...revenusForm, montant: e.target.value })}
                    className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-200 bg-white outline-none"
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-10">
              <button
                onClick={() => setShowAddRevenusModal(false)}
                className="flex-1 px-6 py-4 border-2 border-gray-200 text-gray-700 rounded-2xl hover:bg-gray-50 transition-all duration-200 font-semibold"
              >
                Annuler
              </button>
              <button
                onClick={addRevenusNuit}
                className="flex-1 px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl hover:from-purple-700 hover:to-pink-700 transition-all duration-200 font-semibold shadow-xl hover:shadow-2xl transform hover:scale-105"
              >
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Modifier Revenus */}
      {showEditRevenusModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl max-w-md w-full p-8 shadow-2xl border border-gray-200/50">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl">
                  <Edit3 className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Modifier Revenus</h2>
              </div>
              <button
                onClick={() => setShowEditRevenusModal(false)}
                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-2xl transition-all duration-200"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Date *</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="date"
                    value={revenusForm.date}
                    onChange={(e) => setRevenusForm({ ...revenusForm, date: e.target.value })}
                    className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 transition-all duration-200 bg-white outline-none"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Montant (DH) *</label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="number"
                    value={revenusForm.montant}
                    onChange={(e) => setRevenusForm({ ...revenusForm, montant: e.target.value })}
                    className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 transition-all duration-200 bg-white outline-none"
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-10">
              <button
                onClick={() => setShowEditRevenusModal(false)}
                className="flex-1 px-6 py-4 border-2 border-gray-200 text-gray-700 rounded-2xl hover:bg-gray-50 transition-all duration-200 font-semibold"
              >
                Annuler
              </button>
              <button
                onClick={updateRevenusNuit}
                className="flex-1 px-6 py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-2xl hover:from-orange-700 hover:to-red-700 transition-all duration-200 font-semibold shadow-xl hover:shadow-2xl transform hover:scale-105"
              >
                <div className="flex items-center justify-center gap-2">
                  <Save size={18} />
                  Modifier
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Export Heures Supplémentaires */}
      {showExportHeuresModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl max-w-lg w-full p-8 shadow-2xl border border-gray-200/50">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Export Heures Supplémentaires</h2>
              </div>
              <button
                onClick={() => setShowExportHeuresModal(false)}
                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-2xl transition-all duration-200"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Eye className="h-5 w-5 text-blue-600" />
                  <h3 className="font-bold text-blue-900">Aperçu du rapport - Heures Supplémentaires</h3>
                </div>
                <div className="space-y-3 text-sm text-blue-800">
                  <div className="flex justify-between">
                    <span className="font-medium">Période:</span>
                    <span>{new Date(selectedYear, selectedMonth - 1, 1).toLocaleString('fr-FR', { month: 'long' })} {selectedYear}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Employés inclus:</span>
                    <span className="font-bold">{filteredEmployees.length}</span>
                  </div>
                  <div className="border-t border-blue-200 pt-3 mt-4">
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total heures supplémentaires:</span>
                      <span className="text-blue-600">{totalHeuresSupplementaires.toFixed(2)} DH</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button
                onClick={() => setShowExportHeuresModal(false)}
                className="flex-1 px-6 py-4 border-2 border-gray-200 text-gray-700 rounded-2xl hover:bg-gray-50 transition-all duration-200 font-semibold"
              >
                Annuler
              </button>
              <button
                onClick={generateHeuresPDF}
                disabled={exportLoading}
                className="flex-1 px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-semibold shadow-xl hover:shadow-2xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {exportLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
                    Génération...
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <Download size={18} />
                    Générer PDF
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Export Revenus de Nuit */}
      {showExportRevenusModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl max-w-lg w-full p-8 shadow-2xl border border-gray-200/50">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl">
                  <Moon className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Export Revenus de Nuit</h2>
              </div>
              <button
                onClick={() => setShowExportRevenusModal(false)}
                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-2xl transition-all duration-200"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Eye className="h-5 w-5 text-purple-600" />
                  <h3 className="font-bold text-purple-900">Aperçu du rapport - Revenus de Nuit</h3>
                </div>
                <div className="space-y-3 text-sm text-purple-800">
                  <div className="flex justify-between">
                    <span className="font-medium">Période:</span>
                    <span>{new Date(selectedYear, selectedMonth - 1, 1).toLocaleString('fr-FR', { month: 'long' })} {selectedYear}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Entrées de revenus:</span>
                    <span className="font-bold">{filteredRevenus.length}</span>
                  </div>
                  <div className="border-t border-purple-200 pt-3 mt-4">
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total revenus de nuit:</span>
                      <span className="text-purple-600">{totalRevenusNuit.toFixed(2)} DH</span>
                    </div>
                  </div>
                </div>
              </div>

              {filteredRevenus.length === 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                    <p className="text-yellow-800 font-medium">Aucun revenu de nuit pour cette période</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-4 mt-8">
              <button
                onClick={() => setShowExportRevenusModal(false)}
                className="flex-1 px-6 py-4 border-2 border-gray-200 text-gray-700 rounded-2xl hover:bg-gray-50 transition-all duration-200 font-semibold"
              >
                Annuler
              </button>
              <button
                onClick={generateRevenusPDF}
                disabled={exportLoading || filteredRevenus.length === 0}
                className="flex-1 px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl hover:from-purple-700 hover:to-pink-700 transition-all duration-200 font-semibold shadow-xl hover:shadow-2xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none" >  {exportLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
                    Génération...
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <Download size={18} />
                    Générer PDF
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuiviHeuresSup;
