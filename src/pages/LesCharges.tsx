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
  Trash2, 
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
  Search
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
    { value: 'Eau', label: 'Eau', icon: <Droplets size={18} /> },
    { value: 'Électricité', label: 'Électricité', icon: <Zap size={18} /> },
    { value: 'Mobile', label: 'Mobile', icon: <Smartphone size={18} /> }
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
          // Vous pouvez implémenter une notification système ici
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
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* En-tête */}
        <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gestion des Charges Mensuelles</h1>
              <p className="text-gray-600">Suivez vos dépenses régulières en Dirhams Marocains (DH)</p>
            </div>
            
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Plus size={20} />
              Nouvelle charge
            </button>
          </div>
        </div>

        {/* Résumé */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-500">Total à payer</h3>
              <DollarSign size={20} className="text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{totalCharges.toFixed(2)} DH</p>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-500">Charges en attente</h3>
              <Bell size={20} className="text-orange-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {filteredCharges.filter(c => c.statut === 'Non payé').length}
            </p>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-500">Charges payées</h3>
              <CheckCircle size={20} className="text-green-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {filteredCharges.filter(c => c.statut === 'Payé').length}
            </p>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-500">Total charges</h3>
              <Calendar size={20} className="text-purple-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{filteredCharges.length}</p>
          </div>
        </div>

        {/* Filtres et recherche */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Rechercher</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Nom, contrat ou fournisseur..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Filtrer par type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="Tous">Tous les types</option>
                {chargeTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Filtrer par mois</label>
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tous les mois</option>
                {generateMonthOptions().map(month => (
                  <option key={month.value} value={month.value}>{month.label}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilterType('Tous');
                  setFilterMonth('');
                  setSearchTerm('');
                }}
                className="flex items-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md transition-colors"
              >
                <Filter size={16} />
                Réinitialiser
              </button>
            </div>
          </div>
        </div>

        {/* Liste des charges */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Chargement des données...</p>
            </div>
          ) : filteredCharges.length === 0 ? (
            <div className="p-8 text-center">
              <div className="mx-auto h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <DollarSign size={24} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Aucune charge</h3>
              <p className="text-gray-500">Commencez par ajouter votre première charge</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Ajouter une charge
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contrat</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fournisseur</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Montant</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date limite</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCharges.map((charge) => {
                    const isDueSoon = () => {
                      if (charge.statut === 'Payé') return false;
                      const today = new Date();
                      const dueDate = new Date(charge.dateLimite);
                      const diffTime = dueDate - today;
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      return diffDays <= 3 && diffDays >= 0;
                    };
                    
                    return (
                      <tr key={charge.id} className={isDueSoon() ? 'bg-orange-50' : ''}>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{charge.nom}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{charge.contrat}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{charge.fournisseur}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
                              {chargeTypes.find(t => t.value === charge.type)?.icon}
                            </div>
                            <div className="ml-2">
                              <div className="text-sm font-medium text-gray-900">{charge.type}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{charge.montant} DH</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatDate(charge.dateLimite)}</div>
                          {isDueSoon() && (
                            <div className="text-xs text-orange-600 flex items-center mt-1">
                              <Bell size={12} className="mr-1" />
                              Bientôt dû
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <button
                            onClick={() => toggleStatut(charge)}
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                              charge.statut === 'Payé' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
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
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleEdit(charge)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <Edit3 size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(charge.id)}
                              className="text-red-600 hover:text-red-900"
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

        {/* Modal d'ajout/modification */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-screen overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingCharge ? 'Modifier la charge' : 'Ajouter une charge'}
                </h2>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingCharge(null);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="mb-4">
                <h3 className="text-md font-medium text-gray-700 mb-2">Charges prédéfinies</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border border-gray-200 rounded-md">
                  {predefinedCharges.map((charge, index) => (
                    <button
                      key={index}
                      onClick={() => fillWithPredefined(charge)}
                      className="text-left p-2 text-sm rounded-md hover:bg-gray-100 border border-gray-200"
                    >
                      <div className="font-medium">{charge.nom}</div>
                      <div className="text-xs text-gray-500">{charge.contrat} - {charge.fournisseur}</div>
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la charge*</label>
                    <input
                      type="text"
                      value={chargeForm.nom}
                      onChange={(e) => setChargeForm({ ...chargeForm, nom: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">N° de contrat*</label>
                    <input
                      type="text"
                      value={chargeForm.contrat}
                      onChange={(e) => setChargeForm({ ...chargeForm, contrat: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fournisseur*</label>
                    <input
                      type="text"
                      value={chargeForm.fournisseur}
                      onChange={(e) => setChargeForm({ ...chargeForm, fournisseur: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type de charge*</label>
                    <select
                      value={chargeForm.type}
                      onChange={(e) => setChargeForm({ ...chargeForm, type: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      {chargeTypes.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Montant (DH)*</label>
                    <input
                      type="number"
                      step="0.01"
                      value={chargeForm.montant}
                      onChange={(e) => setChargeForm({ ...chargeForm, montant: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mois concerné*</label>
                    <input
                      type="month"
                      value={chargeForm.mois}
                      onChange={(e) => setChargeForm({ ...chargeForm, mois: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date limite de paiement*</label>
                    <input
                      type="date"
                      value={chargeForm.dateLimite}
                      onChange={(e) => setChargeForm({ ...chargeForm, dateLimite: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                    <select
                      value={chargeForm.statut}
                      onChange={(e) => setChargeForm({ ...chargeForm, statut: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Non payé">Non payé</option>
                      <option value="Payé">Payé</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingCharge(null);
                      resetForm();
                    }}
                    className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
