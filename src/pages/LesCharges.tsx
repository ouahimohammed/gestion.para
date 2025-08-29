import React, { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  Plus, 
  Trash2, FileText ,
  Edit3, 
  Filter, 
  Bell,
  CheckCircle,
  XCircle,
  Zap,
  Droplets,
  Smartphone,
  Calendar,
  DollarSign,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  BarChart3,
  Eye,
  Building,
  User
} from 'lucide-react';

const LesCharges = () => {
  // États pour les données
  const [charges, setCharges] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // États pour les formulaires
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCharge, setEditingCharge] = useState(null);
  const [filterType, setFilterType] = useState('Tous');
  const [filterMonth, setFilterMonth] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [predefinedFilter, setPredefinedFilter] = useState('Tous'); // Filtre pour les charges prédéfinies

  const formatDateToMonthYear = (date) => {
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
  };

  // Formulaires
  const [chargeForm, setChargeForm] = useState({
    nom: '',
    contrat: '',
    fournisseur: '',
    type: 'Électricité',
    montant: '',
    dateLimite: '',
    statut: 'Non payé',
    mois: formatDateToMonthYear(new Date())
  });

  // Types de charges
  const chargeTypes = [
    { value: 'Eau', label: 'Eau', icon: <Droplets size={18} />, color: 'blue' },
    { value: 'Électricité', label: 'Électricité', icon: <Zap size={18} />, color: 'yellow' },
    { value: 'Mobile', label: 'Mobile', icon: <Smartphone size={18} />, color: 'purple' }
  ];

  // Données pré-remplies basées sur l'image fournie
  const predefinedCharges = [
    { nom: 'APP HOLDING', contrat: '859575', fournisseur: 'App Holding', type: 'Électricité' },
    { nom: 'BOUHISINI ELHABIB', contrat: '618140', fournisseur: 'Bouhsini', type: 'Électricité' },
    { nom: 'APP N°05 RES 27', contrat: '1090827', fournisseur: 'Semlali', type: 'Eau' },
    { nom: 'APP N°07 RES 27', contrat: '1092642', fournisseur: 'Semlali', type: 'Électricité' },
    { nom: 'BELKORCHI NAJIB', contrat: '239693', fournisseur: 'Najib Belko', type: 'Électricité' },
    { nom: 'BELKORCHI NAJIB', contrat: '264607', fournisseur: 'Najib Belko', type: 'Eau' },
    { nom: 'APP N°01 RES 18', contrat: '981667', fournisseur: 'Semlali', type: 'Électricité' },
    { nom: 'APP N°01 RES 18', contrat: '981668', fournisseur: 'Semlali', type: 'Eau' },
    { nom: 'MAGASIN N°14', contrat: '264323', fournisseur: 'Bouhsini', type: 'Eau' },
    { nom: 'MAGASIN N°14', contrat: '239665', fournisseur: 'Bouhsini', type: 'Électricité' },
    { nom: 'FERME/BENGRIR', contrat: '9018910', fournisseur: 'Semlali', type: 'Électricité' },
    { nom: 'FERME/BENGRIR', contrat: '8852656', fournisseur: 'Semlali', type: 'Électricité' },
    { nom: 'FERME/BENGRIR', contrat: '8852643', fournisseur: 'Trombati', type: 'Électricité' },
    { nom: 'TELEPHONE', contrat: '0696924962', fournisseur: 'Opérateur Mobile', type: 'Mobile' },
    { nom: 'TELEPHONE', contrat: '666967737', fournisseur: 'Opérateur Mobile', type: 'Mobile' },
    { nom: 'TELEPHONE', contrat: '0764405270', fournisseur: 'Opérateur Mobile', type: 'Mobile' },
    { nom: 'TELEPHONE', contrat: '066950457', fournisseur: 'Opérateur Mobile', type: 'Mobile' }
  ];

  // Filtrer les charges prédéfinies selon le type sélectionné
  const filteredPredefinedCharges = predefinedFilter === 'Tous' 
    ? predefinedCharges 
    : predefinedCharges.filter(charge => charge.type === predefinedFilter);

  // Récupérer les données depuis Firestore
  useEffect(() => {
    setLoading(true);
    let chargesQuery;
    
    if (filterType === 'Tous' && !filterMonth) {
      chargesQuery = query(collection(db, 'charges'), orderBy('dateLimite', 'desc'));
    } else if (filterType !== 'Tous' && !filterMonth) {
      chargesQuery = query(
        collection(db, 'charges'), 
        where('type', '==', filterType),
        orderBy('dateLimite', 'desc')
      );
    } else if (filterType === 'Tous' && filterMonth) {
      chargesQuery = query(
        collection(db, 'charges'), 
        where('mois', '==', filterMonth),
        orderBy('dateLimite', 'desc')
      );
    } else {
      chargesQuery = query(
        collection(db, 'charges'), 
        where('type', '==', filterType),
        where('mois', '==', filterMonth),
        orderBy('dateLimite', 'desc')
      );
    }

    const unsubscribe = onSnapshot(chargesQuery, (snapshot) => {
      const chargesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCharges(chargesData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [filterType, filterMonth]);

  // Vérifier les paiements proches de la date limite
  useEffect(() => {
    const today = new Date();
    charges.forEach(charge => {
      if (charge.statut === 'Non payé') {
        const dateLimite = new Date(charge.dateLimite);
        const diffTime = Math.abs(dateLimite - today);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays <= 3) {
          console.log(`ALERTE: La charge ${charge.nom} (${charge.type}) doit être payée dans ${diffDays} jour(s)`);
        }
      }
    });
  }, [charges]);

  // Fonctions utilitaires
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const generateMonthOptions = () => {
    const months = [];
    const currentDate = new Date();
    
    for (let i = 0; i < 12; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const value = formatDateToMonthYear(date);
      const label = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      months.push({ value, label });
    }
    
    return months;
  };

  // Filtrer les charges selon le terme de recherche
  const filteredCharges = charges.filter(charge => 
    charge.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    charge.contrat.includes(searchTerm) ||
    charge.fournisseur.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Gestionnaires d'événements
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingCharge) {
        await updateDoc(doc(db, 'charges', editingCharge.id), chargeForm);
      } else {
        await addDoc(collection(db, 'charges'), {
          ...chargeForm,
          createdAt: new Date()
        });
      }
      
      setShowAddModal(false);
      setEditingCharge(null);
      resetForm();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
    }
  };

  const handleEdit = (charge) => {
    setEditingCharge(charge);
    setChargeForm({
      nom: charge.nom,
      contrat: charge.contrat,
      fournisseur: charge.fournisseur,
      type: charge.type,
      montant: charge.montant,
      dateLimite: charge.dateLimite,
      statut: charge.statut,
      mois: charge.mois
    });
    setShowAddModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette charge ?')) {
      try {
        await deleteDoc(doc(db, 'charges', id));
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
      }
    }
  };

  const toggleStatut = async (charge) => {
    try {
      await updateDoc(doc(db, 'charges', charge.id), {
        statut: charge.statut === 'Payé' ? 'Non payé' : 'Payé'
      });
    } catch (error) {
      console.error('Erreur lors du changement de statut:', error);
    }
  };

  const resetForm = () => {
    setChargeForm({
      nom: '',
      contrat: '',
      fournisseur: '',
      type: 'Électricité',
      montant: '',
      dateLimite: '',
      statut: 'Non payé',
      mois: formatDateToMonthYear(new Date())
    });
  };

  const fillWithPredefined = (charge) => {
    setChargeForm({
      ...chargeForm,
      nom: charge.nom,
      contrat: charge.contrat,
      fournisseur: charge.fournisseur,
      type: charge.type
    });
  };

  // Calculer le total des charges
  const totalCharges = filteredCharges
    .filter(charge => charge.statut === 'Non payé')
    .reduce((total, charge) => total + parseFloat(charge.montant || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* En-tête avec design premium */}
        <div className="relative bg-white/90 backdrop-blur-xl border border-gray-200/50 rounded-3xl p-6 md:p-8 mb-8 shadow-xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -skew-x-12 animate-pulse"></div>
          
          <div className="relative z-10">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg">
                  <DollarSign className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent mb-2">
                    Gestion des Charges
                  </h1>
                  <p className="text-gray-600 text-lg">
                    Suivez vos dépenses régulières en Dirhams Marocains (DH)
                  </p>
                </div>
              </div>
              
              <button
                onClick={() => setShowAddModal(true)}
                className="group flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-5 py-3 rounded-2xl hover:from-blue-600 hover:to-blue-700 transition-all duration-300 text-sm font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <Plus size={16} className="group-hover:rotate-90 transition-transform duration-300" />
                Nouvelle charge
              </button>
            </div>
          </div>
        </div>

        {/* Résumé avec design premium */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="group relative bg-white/90 backdrop-blur-xl border border-blue-200/50 p-6 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10 flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-gray-600 text-sm font-medium mb-1">Total à payer</p>
                <p className="text-2xl font-bold text-gray-900">{totalCharges.toFixed(2)} DH</p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-blue-500 text-xs font-medium">Ce mois</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="group relative bg-white/90 backdrop-blur-xl border border-amber-200/50 p-6 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10 flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Bell className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-gray-600 text-sm font-medium mb-1">Charges en attente</p>
                <p className="text-2xl font-bold text-gray-900">
                  {filteredCharges.filter(c => c.statut === 'Non payé').length}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-amber-500 text-xs font-medium">À traiter</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="group relative bg-white/90 backdrop-blur-xl border border-emerald-200/50 p-6 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10 flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-gray-600 text-sm font-medium mb-1">Charges payées</p>
                <p className="text-2xl font-bold text-gray-900">
                  {filteredCharges.filter(c => c.statut === 'Payé').length}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-emerald-500 text-xs font-medium">Réglées</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="group relative bg-white/90 backdrop-blur-xl border border-purple-200/50 p-6 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10 flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-gray-600 text-sm font-medium mb-1">Total charges</p>
                <p className="text-2xl font-bold text-gray-900">{filteredCharges.length}</p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-purple-500 text-xs font-medium">Toutes périodes</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filtres et recherche avec design premium */}
        <div className="relative bg-white/90 backdrop-blur-xl border border-gray-200/50 rounded-3xl p-6 mb-8 shadow-xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 hover:opacity-100 transition-opacity duration-500"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
                <Filter className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Filtres Avancés</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white/70 backdrop-blur-sm border border-gray-200 rounded-2xl p-4 hover:bg-white/90 transition-all duration-300">
                <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <Search className="h-4 w-4 mr-2 text-gray-500" />
                  Rechercher
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Nom, contrat ou fournisseur..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white outline-none"
                  />
                </div>
              </div>
              
              <div className="bg-white/70 backdrop-blur-sm border border-gray-200 rounded-2xl p-4 hover:bg-white/90 transition-all duration-300">
                <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <Zap className="h-4 w-4 mr-2 text-gray-500" />
                  Type de charge
                </label>
                <div className="relative">
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white outline-none appearance-none"
                  >
                    <option value="Tous">Tous les types</option>
                    {chargeTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                  <Zap className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                </div>
              </div>
              
              <div className="bg-white/70 backdrop-blur-sm border border-gray-200 rounded-2xl p-4 hover:bg-white/90 transition-all duration-300">
                <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                  Mois concerné
                </label>
                <div className="relative">
                  <select
                    value={filterMonth}
                    onChange={(e) => setFilterMonth(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white outline-none appearance-none"
                  >
                    <option value="">Tous les mois</option>
                    {generateMonthOptions().map(month => (
                      <option key={month.value} value={month.value}>{month.label}</option>
                    ))}
                  </select>
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                </div>
              </div>
              
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setFilterType('Tous');
                    setFilterMonth('');
                    setSearchTerm('');
                  }}
                  className="w-full bg-gradient-to-r from-gray-200 to-gray-300 text-gray-800 px-4 py-3.5 rounded-2xl hover:from-gray-300 hover:to-gray-400 transition-all duration-200 font-semibold shadow-md hover:shadow-lg"
                >
                  Réinitialiser
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Liste des charges avec design premium */}
        <div className="bg-white/90 backdrop-blur-xl border border-gray-200/50 rounded-3xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-6 border-b border-gray-200/50">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
                  <DollarSign className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Liste des Charges</h2>
              </div>
              <div className="text-sm text-gray-600">
                {filteredCharges.length} charge(s) trouvée(s)
              </div>
            </div>
          </div>
          
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-6"></div>
                    <div className="absolute inset-0 rounded-full h-16 w-16 border-4 border-purple-200 border-t-purple-600 animate-spin mx-auto" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
                  </div>
                  <p className="text-gray-700 text-lg font-medium">Chargement des données...</p>
                </div>
              </div>
            ) : filteredCharges.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-3xl flex items-center justify-center mb-6">
                  <DollarSign className="h-10 w-10 text-blue-500" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">Aucune charge</h3>
                <p className="text-gray-500">
                  {searchTerm || filterType !== 'Tous' || filterMonth 
                    ? 'Aucune charge ne correspond à vos critères de recherche' 
                    : 'Commencez par ajouter votre première charge'}
                </p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="mt-4 group flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-5 py-3 rounded-2xl hover:from-blue-600 hover:to-blue-700 transition-all duration-300 text-sm font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 mx-auto"
                >
                  <Plus size={16} className="group-hover:rotate-90 transition-transform duration-300" />
                  Ajouter une charge
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50/80">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Nom</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Contrat</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Fournisseur</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Montant</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date limite</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Statut</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200/50">
                    {filteredCharges.map((charge) => {
                      const isDueSoon = () => {
                        if (charge.statut === 'Payé') return false;
                        const today = new Date();
                        const dueDate = new Date(charge.dateLimite);
                        const diffTime = dueDate - today;
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        return diffDays <= 3 && diffDays >= 0;
                      };
                      
                      const typeConfig = chargeTypes.find(t => t.value === charge.type);
                      
                      return (
                        <tr key={charge.id} className={`hover:bg-gray-50/50 transition-colors duration-200 group ${isDueSoon() ? 'bg-orange-50' : ''}`}>
                          <td className="px-6 py-4">
                            <div className="text-sm font-semibold text-gray-900">{charge.nom}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">{charge.contrat}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">{charge.fournisseur}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div className={`h-10 w-10 rounded-2xl flex items-center justify-center shadow-lg ${
                                typeConfig?.color === 'blue' ? 'bg-blue-100' :
                                typeConfig?.color === 'yellow' ? 'bg-amber-100' :
                                'bg-purple-100'
                              }`}>
                                {typeConfig?.icon}
                              </div>
                              <div className="ml-3">
                                <div className="text-sm font-medium text-gray-900">{charge.type}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-bold text-gray-900">{charge.montant} DH</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">{formatDate(charge.dateLimite)}</div>
                            {isDueSoon() && (
                              <div className="text-xs text-orange-600 flex items-center mt-1">
                                <Bell size={12} className="mr-1" />
                                Bientôt dû
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => toggleStatut(charge)}
                              className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                                charge.statut === 'Payé' 
                                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' 
                                  : 'bg-red-100 text-red-800 hover:bg-red-200'
                              }`}
                            >
                              {charge.statut === 'Payé' ? (
                                <>
                                  <CheckCircle size={14} className="mr-1" />
                                  Payé
                                </>
                              ) : (
                                <>
                                  <XCircle size={14} className="mr-1" />
                                  Non payé
                                </>
                              )}
                            </button>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleEdit(charge)}
                                className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-xl transition-all duration-200"
                                title="Modifier"
                              >
                                <Edit3 size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(charge.id)}
                                className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-xl transition-all duration-200"
                                title="Supprimer"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Modal d'ajout/modification avec design premium */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white/95 backdrop-blur-xl rounded-3xl max-w-4xl w-full p-8 shadow-2xl border border-gray-200/50 max-h-screen overflow-y-auto">
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
                    <Plus className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {editingCharge ? 'Modifier la charge' : 'Ajouter une charge'}
                  </h2>
                </div>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingCharge(null);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-2xl transition-all duration-200"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Filtre pour les charges prédéfinies */}
              <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/50 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                  <h3 className="font-bold text-blue-900">Charges prédéfinies</h3>
                </div>
                
                <div className="flex items-center gap-4 mb-3">
                  <span className="text-sm font-medium text-blue-800">Filtrer par type:</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPredefinedFilter('Tous')}
                      className={`px-3 py-1 rounded-xl text-xs font-medium transition-all duration-200 ${
                        predefinedFilter === 'Tous'
                          ? 'bg-blue-500 text-white shadow-lg'
                          : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      Tous
                    </button>
                    {chargeTypes.map(type => (
                      <button
                        key={type.value}
                        onClick={() => setPredefinedFilter(type.value)}
                        className={`px-3 py-1 rounded-xl text-xs font-medium transition-all duration-200 flex items-center gap-1 ${
                          predefinedFilter === type.value
                            ? `bg-${type.color === 'blue' ? 'blue' : type.color === 'yellow' ? 'amber' : 'purple'}-500 text-white shadow-lg`
                            : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                        }`}
                      >
                        {type.icon}
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2">
                  {filteredPredefinedCharges.map((charge, index) => {
                    const typeConfig = chargeTypes.find(t => t.value === charge.type);
                    return (
                      <button
                        key={index}
                        onClick={() => fillWithPredefined(charge)}
                        className="text-left p-3 text-sm rounded-xl hover:bg-white transition-all duration-200 border border-blue-100 bg-white/50 backdrop-blur-sm"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`p-1 rounded-lg ${
                            typeConfig?.color === 'blue' ? 'bg-blue-100' :
                            typeConfig?.color === 'yellow' ? 'bg-amber-100' :
                            'bg-purple-100'
                          }`}>
                            {typeConfig?.icon}
                          </div>
                          <div className="font-medium text-gray-900">{charge.nom}</div>
                        </div>
                        <div className="text-xs text-gray-500 ml-7">
                          {charge.contrat} - {charge.fournisseur}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">Nom de la charge*</label>
                    <div className="relative">
                      <Building className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        value={chargeForm.nom}
                        onChange={(e) => setChargeForm({ ...chargeForm, nom: e.target.value })}
                        className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">N° de contrat*</label>
                    <div className="relative">
                      <FileText className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        value={chargeForm.contrat}
                        onChange={(e) => setChargeForm({ ...chargeForm, contrat: e.target.value })}
                        className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white outline-none"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">Fournisseur*</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        value={chargeForm.fournisseur}
                        onChange={(e) => setChargeForm({ ...chargeForm, fournisseur: e.target.value })}
                        className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">Type de charge*</label>
                    <div className="relative">
                      <Zap className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <select
                        value={chargeForm.type}
                        onChange={(e) => setChargeForm({ ...chargeForm, type: e.target.value })}
                        className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white outline-none appearance-none"
                        required
                      >
                        {chargeTypes.map(type => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">Montant (DH)*</label>
                    <div className="relative">
                      <DollarSign className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="number"
                        step="0.01"
                        value={chargeForm.montant}
                        onChange={(e) => setChargeForm({ ...chargeForm, montant: e.target.value })}
                        className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white outline-none"
                        placeholder="0.00"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">Mois concerné*</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="month"
                        value={chargeForm.mois}
                        onChange={(e) => setChargeForm({ ...chargeForm, mois: e.target.value })}
                        className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white outline-none"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">Date limite de paiement*</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="date"
                        value={chargeForm.dateLimite}
                        onChange={(e) => setChargeForm({ ...chargeForm, dateLimite: e.target.value })}
                        className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">Statut</label>
                    <div className="relative">
                      <CheckCircle className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <select
                        value={chargeForm.statut}
                        onChange={(e) => setChargeForm({ ...chargeForm, statut: e.target.value })}
                        className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white outline-none appearance-none"
                      >
                        <option value="Non payé">Non payé</option>
                        <option value="Payé">Payé</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 mt-8">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingCharge(null);
                      resetForm();
                    }}
                    className="flex-1 px-6 py-4 border-2 border-gray-200 text-gray-700 rounded-2xl hover:bg-gray-50 transition-all duration-200 font-semibold"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-semibold shadow-xl hover:shadow-2xl transform hover:scale-105"
                  >
                    {editingCharge ? 'Modifier' : 'Ajouter'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LesCharges;
