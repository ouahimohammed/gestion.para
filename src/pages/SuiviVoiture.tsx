import React, { useState, useEffect } from 'react';
import { 
  Car, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Shield, 
  Wrench,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  X,
  ChevronDown,
  ChevronRight,
  DollarSign,
  MapPin,
  Settings,
  ClipboardCheck,
  Bell,
  Filter,
  SortAsc,
  Eye,
  TrendingUp,
  Sparkles,
  BarChart3,
  Users,
  Building,
  FileText
} from 'lucide-react';
import NotificationBell from './NotificationBell';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';

const SuiviVoiture = () => {
  // États pour les données
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // États pour l'interface
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCar, setExpandedCar] = useState(null);
  const [activeSection, setActiveSection] = useState('insurance');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  
  // États pour les modales
  const [showAddCarModal, setShowAddCarModal] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [modalType, setModalType] = useState('');
  const [selectedCarId, setSelectedCarId] = useState(null);
  
  // Formulaires
  const [carForm, setCarForm] = useState({
    brand: '',
    model: '',
    year: '',
    registration: '',
    currentMileage: ''
  });
  
  const [insuranceForm, setInsuranceForm] = useState({
    startDate: '',
    endDate: '',
    paymentStatus: 'Non payé',
    company: '',
    amount: ''
  });
  
  const [oilChangeForm, setOilChangeForm] = useState({
    lastChangeDate: '',
    mileage: '',
    status: 'Fait',
    notes: ''
  });

  const [technicalInspectionForm, setTechnicalInspectionForm] = useState({
    inspectionDate: '',
    expiryDate: '',
    status: 'Valide',
    center: '',
    cost: '',
    notes: ''
  });

  // Notifications
  const [notifications, setNotifications] = useState([]);

  // Charger les données depuis Firebase
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'cars'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const carsData = [];
      querySnapshot.forEach((doc) => {
        carsData.push({ 
          id: doc.id, 
          ...doc.data(),
          // Assurer que les tableaux existent
          insurances: doc.data().insurances || [],
          oilChanges: doc.data().oilChanges || [],
          technicalInspections: doc.data().technicalInspections || []
        });
      });
      setCars(carsData);
      setLoading(false);
    }, (error) => {
      console.error('Erreur lors du chargement des données:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Fonctions utilitaires pour les dates
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getDaysUntilDate = (dateString) => {
    if (!dateString) return Infinity;
    const today = new Date();
    const targetDate = new Date(dateString);
    const diffTime = targetDate - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Logique de vidange - calcul automatique basé sur 10 000 km
  const calculateNextOilChange = (currentMileage, lastChangeMileage) => {
    const nextMileage = parseInt(lastChangeMileage) + 10000;
    const remainingKm = nextMileage - parseInt(currentMileage || 0);
    return { nextMileage, remainingKm };
  };

  const checkInsuranceExpiry = (endDate) => {
    const daysUntil = getDaysUntilDate(endDate);
    return daysUntil <= 30 && daysUntil >= 0;
  };

  const isInsuranceExpired = (endDate) => {
    return getDaysUntilDate(endDate) < 0;
  };

  const checkOilChangeDue = (currentMileage, lastChangeMileage) => {
    const { remainingKm } = calculateNextOilChange(currentMileage, lastChangeMileage);
    return remainingKm <= 1000;
  };

  const checkTechnicalInspectionExpiry = (expiryDate) => {
    const daysUntil = getDaysUntilDate(expiryDate);
    return daysUntil <= 60 && daysUntil >= 0;
  };

  const isTechnicalInspectionExpired = (expiryDate) => {
    return getDaysUntilDate(expiryDate) < 0;
  };

  // Vérification des notifications
  const checkAllDueDates = () => {
    const newNotifications = [];
    
    cars.forEach(car => {
      // Vérifier les assurances
      car.insurances.forEach(insurance => {
        const daysUntilExpiry = getDaysUntilDate(insurance.endDate);
        
        if (daysUntilExpiry <= 15 && daysUntilExpiry >= 0) {
          newNotifications.push({
            type: 'insurance',
            message: `L'assurance de ${car.brand} ${car.model} expire dans ${daysUntilExpiry} jours`,
            carId: car.id,
            itemId: insurance.id,
            date: insurance.endDate,
            priority: daysUntilExpiry <= 7 ? 'high' : 'medium'
          });
        }
      });
      
      // Vérifier les vidanges
      if (car.currentMileage) {
        car.oilChanges.forEach(oilChange => {
          const { remainingKm } = calculateNextOilChange(car.currentMileage, oilChange.mileage);
          
          if (remainingKm <= 1000 && remainingKm >= 0) {
            newNotifications.push({
              type: 'oil',
              message: `Vidange de ${car.brand} ${car.model} dans ${remainingKm} km`,
              carId: car.id,
              itemId: oilChange.id,
              remainingKm,
              priority: remainingKm <= 500 ? 'high' : 'medium'
            });
          }
        });
      }
      
      // Vérifier les visites techniques
      car.technicalInspections.forEach(inspection => {
        const daysUntilExpiry = getDaysUntilDate(inspection.expiryDate);
        
        if (daysUntilExpiry <= 30 && daysUntilExpiry >= 0) {
          newNotifications.push({
            type: 'technical',
            message: `Visite technique de ${car.brand} ${car.model} dans ${daysUntilExpiry} jours`,
            carId: car.id,
            itemId: inspection.id,
            date: inspection.expiryDate,
            priority: daysUntilExpiry <= 15 ? 'high' : 'medium'
          });
        }
      });
    });
    
    setNotifications(newNotifications);
  };

  useEffect(() => {
    checkAllDueDates();
  }, [cars]);

  // CRUD Operations avec Firebase
  const addCar = async () => {
    if (!carForm.brand || !carForm.model || !carForm.year || !carForm.registration) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      const newCar = {
        brand: carForm.brand,
        model: carForm.model,
        year: carForm.year,
        registration: carForm.registration,
        currentMileage: parseInt(carForm.currentMileage) || 0,
        insurances: [],
        oilChanges: [],
        technicalInspections: [],
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'cars'), newCar);
      setShowAddCarModal(false);
      resetCarForm();
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la voiture:', error);
      alert('Erreur lors de l\'ajout de la voiture');
    }
  };

  const addInsurance = async () => {
    if (!insuranceForm.company || !insuranceForm.startDate || !insuranceForm.endDate) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      const newInsurance = {
        id: Date.now().toString(),
        ...insuranceForm,
        amount: insuranceForm.amount || '',
        createdAt: new Date().toISOString()
      };

      const carRef = doc(db, 'cars', selectedCarId);
      const car = cars.find(c => c.id === selectedCarId);
      
      await updateDoc(carRef, {
        insurances: [...car.insurances, newInsurance]
      });

      setShowAddItemModal(false);
      resetInsuranceForm();
    } catch (error) {
      console.error('Erreur lors de l\'ajout de l\'assurance:', error);
      alert('Erreur lors de l\'ajout de l\'assurance');
    }
  };

  const addOilChange = async () => {
    if (!oilChangeForm.lastChangeDate || !oilChangeForm.mileage) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      const mileage = parseInt(oilChangeForm.mileage);
      const { nextMileage } = calculateNextOilChange(mileage, mileage);
      
      const newOilChange = {
        id: Date.now().toString(),
        lastChangeDate: oilChangeForm.lastChangeDate,
        mileage: mileage,
        status: oilChangeForm.status,
        notes: oilChangeForm.notes || '',
        nextDueMileage: nextMileage,
        createdAt: new Date().toISOString()
      };

      const carRef = doc(db, 'cars', selectedCarId);
      const car = cars.find(c => c.id === selectedCarId);
      
      await updateDoc(carRef, {
        oilChanges: [...car.oilChanges, newOilChange]
      });

      setShowAddItemModal(false);
      resetOilChangeForm();
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la vidange:', error);
      alert('Erreur lors de l\'ajout de la vidange');
    }
  };

  const addTechnicalInspection = async () => {
    if (!technicalInspectionForm.inspectionDate || !technicalInspectionForm.expiryDate) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      const newInspection = {
        id: Date.now().toString(),
        inspectionDate: technicalInspectionForm.inspectionDate,
        expiryDate: technicalInspectionForm.expiryDate,
        status: technicalInspectionForm.status,
        center: technicalInspectionForm.center || '',
        cost: technicalInspectionForm.cost || '',
        notes: technicalInspectionForm.notes || '',
        createdAt: new Date().toISOString()
      };

      const carRef = doc(db, 'cars', selectedCarId);
      const car = cars.find(c => c.id === selectedCarId);
      
      await updateDoc(carRef, {
        technicalInspections: [...car.technicalInspections, newInspection]
      });

      setShowAddItemModal(false);
      resetTechnicalInspectionForm();
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la visite technique:', error);
      alert('Erreur lors de l\'ajout de la visite technique');
    }
  };

  const deleteCar = async (carId) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette voiture ?')) {
      try {
        await deleteDoc(doc(db, 'cars', carId));
      } catch (error) {
        console.error('Erreur lors de la suppression de la voiture:', error);
        alert('Erreur lors de la suppression de la voiture');
      }
    }
  };

  const updateCarMileage = async (carId, newMileage) => {
    try {
      const carRef = doc(db, 'cars', carId);
      await updateDoc(carRef, {
        currentMileage: parseInt(newMileage) || 0
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour du kilométrage:', error);
      alert('Erreur lors de la mise à jour du kilométrage');
    }
  };

  // Reset forms
  const resetCarForm = () => {
    setCarForm({ brand: '', model: '', year: '', registration: '', currentMileage: '' });
  };

  const resetInsuranceForm = () => {
    setInsuranceForm({ startDate: '', endDate: '', paymentStatus: 'Non payé', company: '', amount: '' });
  };

  const resetOilChangeForm = () => {
    setOilChangeForm({ lastChangeDate: '', mileage: '', status: 'Fait', notes: '' });
  };

  const resetTechnicalInspectionForm = () => {
    setTechnicalInspectionForm({ 
      inspectionDate: '', 
      expiryDate: '', 
      status: 'Valide', 
      center: '', 
      cost: '', 
      notes: '' 
    });
  };

  // Filtrer et trier les voitures
  const getFilteredAndSortedCars = () => {
    let filtered = cars.filter(car => 
      car.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      car.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      car.registration?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (filterStatus !== 'all') {
      filtered = filtered.filter(car => {
        if (filterStatus === 'alerts') {
          const hasInsuranceAlert = car.insurances?.some(ins => 
            checkInsuranceExpiry(ins.endDate) || isInsuranceExpired(ins.endDate)
          );
          const hasOilAlert = car.oilChanges?.some(oil => 
            checkOilChangeDue(car.currentMileage, oil.mileage)
          );
          const hasTechnicalAlert = car.technicalInspections?.some(tech => 
            checkTechnicalInspectionExpiry(tech.expiryDate) || isTechnicalInspectionExpired(tech.expiryDate)
          );
          return hasInsuranceAlert || hasOilAlert || hasTechnicalAlert;
        }
        return true;
      });
    }

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return `${a.brand} ${a.model}`.localeCompare(`${b.brand} ${b.model}`);
        case 'year':
          return parseInt(b.year) - parseInt(a.year);
        case 'mileage':
          return (b.currentMileage || 0) - (a.currentMileage || 0);
        default:
          return 0;
      }
    });
  };

  const filteredCars = getFilteredAndSortedCars();

  // Composants UI
  const StatusBadge = ({ status, type, date, car, oilChange }) => {
    let icon, text, colorClass;
    
    if (type === 'insurance') {
      if (isInsuranceExpired(date)) {
        icon = <X size={12} />;
        text = 'Expiré';
        colorClass = 'text-red-700 bg-red-50 border-red-200 ring-1 ring-red-200';
      } else if (checkInsuranceExpiry(date)) {
        const days = getDaysUntilDate(date);
        icon = <AlertTriangle size={12} />;
        text = `${days}j restants`;
        colorClass = 'text-orange-700 bg-orange-50 border-orange-200 ring-1 ring-orange-200';
      } else if (status === 'Payé') {
        icon = <CheckCircle size={12} />;
        text = 'À jour';
        colorClass = 'text-green-700 bg-green-50 border-green-200 ring-1 ring-green-200';
      } else {
        icon = <Clock size={12} />;
        text = 'Non payé';
        colorClass = 'text-red-700 bg-red-50 border-red-200 ring-1 ring-red-200';
      }
    } else if (type === 'oil') {
      if (car && oilChange && checkOilChangeDue(car.currentMileage, oilChange.mileage)) {
        const { remainingKm } = calculateNextOilChange(car.currentMileage, oilChange.mileage);
        icon = <AlertTriangle size={12} />;
        text = remainingKm <= 0 ? 'En retard' : `${remainingKm}km`;
        colorClass = remainingKm <= 0 
          ? 'text-red-700 bg-red-50 border-red-200 ring-1 ring-red-200'
          : 'text-orange-700 bg-orange-50 border-orange-200 ring-1 ring-orange-200';
      } else if (status === 'Fait') {
        icon = <CheckCircle size={12} />;
        text = 'À jour';
        colorClass = 'text-green-700 bg-green-50 border-green-200 ring-1 ring-green-200';
      } else {
        icon = <X size={12} />;
        text = 'À faire';
        colorClass = 'text-red-700 bg-red-50 border-red-200 ring-1 ring-red-200';
      }
    } else if (type === 'technical') {
      if (isTechnicalInspectionExpired(date)) {
        icon = <X size={12} />;
        text = 'Expiré';
        colorClass = 'text-red-700 bg-red-50 border-red-200 ring-1 ring-red-200';
      } else if (checkTechnicalInspectionExpiry(date)) {
        const days = getDaysUntilDate(date);
        icon = <AlertTriangle size={12} />;
        text = `${days}j restants`;
        colorClass = 'text-orange-700 bg-orange-50 border-orange-200 ring-1 ring-orange-200';
      } else if (status === 'Valide') {
        icon = <CheckCircle size={12} />;
        text = 'Valide';
        colorClass = 'text-green-700 bg-green-50 border-green-200 ring-1 ring-green-200';
      } else {
        icon = <X size={12} />;
        text = 'Non valide';
        colorClass = 'text-red-700 bg-red-50 border-red-200 ring-1 ring-red-200';
      }
    }
    
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${colorClass}`}>
        {icon}
        {text}
      </span>
    );
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
                  <Car className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent mb-2">
                    Suivi des Voitures
                  </h1>
                  <p className="text-gray-600 text-lg">
                    Gérez vos véhicules, assurances et entretiens
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <NotificationBell notifications={notifications} />
                
                <button
                  onClick={() => setShowAddCarModal(true)}
                  className="group flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-5 py-3 rounded-2xl hover:from-blue-600 hover:to-blue-700 transition-all duration-300 text-sm font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <Plus size={16} className="group-hover:rotate-90 transition-transform duration-300" />
                  Nouvelle voiture
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Barre de recherche et filtres améliorée */}
        <div className="relative bg-white/90 backdrop-blur-xl border border-gray-200/50 rounded-3xl p-6 mb-8 shadow-xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 hover:opacity-100 transition-opacity duration-500"></div>
          
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <Search className="h-4 w-4 mr-2 text-gray-500" />
                  Rechercher
                </label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Marque, modèle ou immatriculation..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white outline-none"
                  />
                </div>
              </div>
              
              <div className="flex gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                    <Filter className="h-4 w-4 mr-2 text-gray-500" />
                    Filtre
                  </label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white outline-none appearance-none"
                  >
                    <option value="all">Tous les véhicules</option>
                    <option value="alerts">Avec alertes</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                    <SortAsc className="h-4 w-4 mr-2 text-gray-500" />
                    Trier par
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white outline-none appearance-none"
                  >
                    <option value="name">Nom</option>
                    <option value="year">Année</option>
                    <option value="mileage">Kilométrage</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Statistiques rapides avec design premium */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="group relative bg-white/90 backdrop-blur-xl border border-blue-200/50 p-6 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10 flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Car className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-gray-600 text-sm font-medium mb-1">Total véhicules</p>
                <p className="text-2xl font-bold text-gray-900">{cars.length}</p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-blue-500 text-xs font-medium">Enregistrés</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="group relative bg-white/90 backdrop-blur-xl border border-red-200/50 p-6 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10 flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-gray-600 text-sm font-medium mb-1">Alertes actives</p>
                <p className="text-2xl font-bold text-gray-900">{notifications.length}</p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-red-500 text-xs font-medium">À traiter</span>
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
                <p className="text-gray-600 text-sm font-medium mb-1">À jour</p>
                <p className="text-2xl font-bold text-gray-900">
                  {cars.filter(car => {
                    const hasValidInsurance = car.insurances?.some(ins => 
                      !isInsuranceExpired(ins.endDate) && !checkInsuranceExpiry(ins.endDate)
                    );
                    const hasValidOil = car.oilChanges?.some(oil => 
                      !checkOilChangeDue(car.currentMileage, oil.mileage)
                    );
                    return hasValidInsurance && hasValidOil;
                  }).length}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-emerald-500 text-xs font-medium">En règle</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="group relative bg-white/90 backdrop-blur-xl border border-purple-200/50 p-6 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10 flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-gray-600 text-sm font-medium mb-1">Kilométrage total</p>
                <p className="text-2xl font-bold text-gray-900">
                  {cars.reduce((total, car) => total + (car.currentMileage || 0), 0).toLocaleString()}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-purple-500 text-xs font-medium">Cumulé</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Liste des voitures avec design premium */}
        <div className="space-y-6">
          {filteredCars.map((car) => (
            <div key={car.id} className="bg-white/90 backdrop-blur-xl border border-gray-200/50 rounded-3xl shadow-2xl hover:shadow-2xl transition-all duration-500 overflow-hidden">
              {/* En-tête de la voiture */}
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="p-4 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <Car className="h-8 w-8 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-1">
                        {car.brand} {car.model}
                      </h3>
                      <div className="flex items-center gap-6 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} />
                          <span>{car.year}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono bg-gray-100 px-2 py-1 rounded">{car.registration}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin size={14} />
                          <input
                            type="number"
                            value={car.currentMileage || ''}
                            onChange={(e) => updateCarMileage(car.id, e.target.value)}
                            className="w-20 text-sm border-0 bg-transparent font-medium text-gray-900 focus:ring-2 focus:ring-blue-500 rounded px-1"
                            placeholder="0"
                          />
                          <span>km</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Statuts rapides avec design amélioré */}
                    <div className="flex gap-3">
                      {car.insurances && car.insurances.length > 0 && (
                        <StatusBadge 
                          status={car.insurances[0].paymentStatus} 
                          type="insurance" 
                          date={car.insurances[0].endDate} 
                        />
                      )}
                      {car.oilChanges && car.oilChanges.length > 0 && (
                        <StatusBadge 
                          status={car.oilChanges[0].status} 
                          type="oil"
                          car={car}
                          oilChange={car.oilChanges[0]}
                        />
                      )}
                      {car.technicalInspections && car.technicalInspections.length > 0 && (
                        <StatusBadge 
                          status={car.technicalInspections[0].status} 
                          type="technical" 
                          date={car.technicalInspections[0].expiryDate} 
                        />
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setExpandedCar(expandedCar === car.id ? null : car.id)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all duration-200"
                      >
                        {expandedCar === car.id ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                      </button>
                      <button
                        onClick={() => deleteCar(car.id)}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Détails expandables avec design premium */}
              {expandedCar === car.id && (
                <div className="border-t border-gray-100 bg-gradient-to-r from-blue-50/50 to-purple-50/30">
                  <div className="p-6">
                    <div className="flex gap-2 mb-6 overflow-x-auto">
                      <button
                        onClick={() => setActiveSection('insurance')}
                        className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all duration-200 whitespace-nowrap ${
                          activeSection === 'insurance'
                            ? 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700 shadow-sm'
                            : 'text-gray-600 hover:bg-white hover:shadow-sm'
                        }`}
                      >
                        <Shield size={16} />
                        Assurances
                      </button>
                      <button
                        onClick={() => setActiveSection('oilChange')}
                        className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all duration-200 whitespace-nowrap ${
                          activeSection === 'oilChange'
                            ? 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700 shadow-sm'
                            : 'text-gray-600 hover:bg-white hover:shadow-sm'
                        }`}
                      >
                        <Wrench size={16} />
                        Vidanges
                      </button>
                      <button
                        onClick={() => setActiveSection('technicalInspection')}
                        className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all duration-200 whitespace-nowrap ${
                          activeSection === 'technicalInspection'
                            ? 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700 shadow-sm'
                            : 'text-gray-600 hover:bg-white hover:shadow-sm'
                        }`}
                      >
                        <ClipboardCheck size={16} />
                        Visite Technique
                      </button>
                    </div>

                    {/* Section Assurances */}
                    {activeSection === 'insurance' && (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h4 className="text-lg font-semibold text-gray-900">Assurances</h4>
                          <button
                            onClick={() => {
                              setSelectedCarId(car.id);
                              setModalType('insurance');
                              setShowAddItemModal(true);
                            }}
                            className="group flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2.5 rounded-2xl hover:from-blue-600 hover:to-blue-700 transition-all duration-300 text-sm font-semibold shadow-md hover:shadow-lg"
                          >
                            <Plus size={16} className="group-hover:rotate-90 transition-transform duration-300" />
                            Ajouter une assurance
                          </button>
                        </div>

                        {car.insurances && car.insurances.length > 0 ? (
                          <div className="grid gap-4">
                            {car.insurances.map((insurance) => (
                              <div key={insurance.id} className="bg-white/80 backdrop-blur-sm p-5 rounded-2xl border border-gray-200/50 shadow-sm hover:shadow-md transition-all duration-200">
                                <div className="flex justify-between items-start">
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                      <StatusBadge 
                                        status={insurance.paymentStatus} 
                                        type="insurance" 
                                        date={insurance.endDate} 
                                      />
                                      <span className="text-base font-semibold text-gray-900">{insurance.company}</span>
                                    </div>
                                    <div className="space-y-2 text-sm text-gray-600">
                                      <div className="flex items-center gap-2">
                                        <Calendar size={14} className="text-blue-500" />
                                        <span>
                                          {formatDate(insurance.startDate)} - {formatDate(insurance.endDate)}
                                        </span>
                                      </div>
                                      {insurance.amount && (
                                        <div className="flex items-center gap-2">
                                          <DollarSign size={14} className="text-green-500" />
                                          <span className="font-medium">{insurance.amount} DH</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200">
                                    <Edit3 size={16} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-12 text-gray-500">
                            <Shield className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                            <p className="text-lg font-medium">Aucune assurance enregistrée</p>
                            <p className="text-sm">Ajoutez votre première assurance</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Section Vidanges améliorée */}
                    {activeSection === 'oilChange' && (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="text-lg font-semibold text-gray-900">Vidanges</h4>
                            <p className="text-sm text-gray-600">Entretien tous les 10 000 km</p>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedCarId(car.id);
                              setModalType('oilChange');
                              setOilChangeForm({
                                ...oilChangeForm,
                                mileage: car.currentMileage?.toString() || ''
                              });
                              setShowAddItemModal(true);
                            }}
                            className="group flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2.5 rounded-2xl hover:from-blue-600 hover:to-blue-700 transition-all duration-300 text-sm font-semibold shadow-md hover:shadow-lg"
                          >
                            <Plus size={16} className="group-hover:rotate-90 transition-transform duration-300" />
                            Ajouter une vidange
                          </button>
                        </div>

                        {car.oilChanges && car.oilChanges.length > 0 ? (
                          <div className="grid gap-4">
                            {car.oilChanges.map((oilChange) => {
                              const { nextMileage, remainingKm } = calculateNextOilChange(car.currentMileage || 0, oilChange.mileage);
                              
                              return (
                                <div key={oilChange.id} className="bg-white/80 backdrop-blur-sm p-5 rounded-2xl border border-gray-200/50 shadow-sm hover:shadow-md transition-all duration-200">
                                  <div className="flex justify-between items-start">
                                    <div className="space-y-3">
                                      <div className="flex items-center gap-3">
                                        <StatusBadge 
                                          status={oilChange.status} 
                                          type="oil"
                                          car={car}
                                          oilChange={oilChange}
                                        />
                                        <span className="text-sm text-gray-600">
                                          Prochaine à {nextMileage.toLocaleString()} km
                                        </span>
                                      </div>
                                      <div className="space-y-2 text-sm text-gray-600">
                                        <div className="flex items-center gap-2">
                                          <Calendar size={14} className="text-blue-500" />
                                          <span>Dernière: {formatDate(oilChange.lastChangeDate)}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <MapPin size={14} className="text-green-500" />
                                          <span>{oilChange.mileage.toLocaleString()} km</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Wrench size={14} className="text-orange-500" />
                                          <span className={`font-medium ${remainingKm <= 0 ? 'text-red-600' : remainingKm <= 1000 ? 'text-orange-600' : 'text-green-600'}`}>
                                            {remainingKm <= 0 
                                              ? `En retard de ${Math.abs(remainingKm)} km` 
                                              : `Plus que ${remainingKm.toLocaleString()} km`
                                            }
                                          </span>
                                        </div>
                                        {oilChange.notes && (
                                          <div className="mt-2 p-2 bg-gray-50 rounded-lg">
                                            <p className="text-xs text-gray-600">{oilChange.notes}</p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200">
                                      <Edit3 size={16} />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-center py-12 text-gray-500">
                            <Wrench className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                            <p className="text-lg font-medium">Aucune vidange enregistrée</p>
                            <p className="text-sm">Commencez le suivi des vidanges</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Section Visite Technique */}
                    {activeSection === 'technicalInspection' && (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h4 className="text-lg font-semibold text-gray-900">Visites Techniques</h4>
                          <button
                            onClick={() => {
                              setSelectedCarId(car.id);
                              setModalType('technicalInspection');
                              setShowAddItemModal(true);
                            }}
                            className="group flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2.5 rounded-2xl hover:from-blue-600 hover:to-blue-700 transition-all duration-300 text-sm font-semibold shadow-md hover:shadow-lg"
                          >
                            <Plus size={16} className="group-hover:rotate-90 transition-transform duration-300" />
                            Ajouter une visite
                          </button>
                        </div>

                        {car.technicalInspections && car.technicalInspections.length > 0 ? (
                          <div className="grid gap-4">
                            {car.technicalInspections.map((inspection) => (
                              <div key={inspection.id} className="bg-white/80 backdrop-blur-sm p-5 rounded-2xl border border-gray-200/50 shadow-sm hover:shadow-md transition-all duration-200">
                                <div className="flex justify-between items-start">
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                      <StatusBadge 
                                        status={inspection.status} 
                                        type="technical" 
                                        date={inspection.expiryDate} 
                                      />
                                      <span className="text-base font-semibold text-gray-900">{inspection.center}</span>
                                    </div>
                                    <div className="space-y-2 text-sm text-gray-600">
                                      <div className="flex items-center gap-2">
                                        <Calendar size={14} className="text-blue-500" />
                                        <span>Visite: {formatDate(inspection.inspectionDate)}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Clock size={14} className="text-orange-500" />
                                        <span>Expire: {formatDate(inspection.expiryDate)}</span>
                                      </div>
                                      {inspection.cost && (
                                        <div className="flex items-center gap-2">
                                          <DollarSign size={14} className="text-green-500" />
                                          <span className="font-medium">{inspection.cost} DH</span>
                                        </div>
                                      )}
                                      {inspection.notes && (
                                        <div className="mt-2 p-2 bg-gray-50 rounded-lg">
                                          <p className="text-xs text-gray-600">{inspection.notes}</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200">
                                    <Edit3 size={16} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-12 text-gray-500">
                            <ClipboardCheck className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                            <p className="text-lg font-medium">Aucune visite technique enregistrée</p>
                            <p className="text-sm">Ajoutez votre première visite technique</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredCars.length === 0 && !loading && (
          <div className="text-center py-16">
            <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-12 border border-gray-200/50 shadow-2xl">
              <Car className="mx-auto h-20 w-20 text-gray-300 mb-6" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucune voiture trouvée</h3>
              <p className="text-gray-600 mb-8">
                {searchTerm ? 'Aucun véhicule ne correspond à votre recherche' : 'Commencez par ajouter votre première voiture'}
              </p>
              <button
                onClick={() => setShowAddCarModal(true)}
                className="group flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-5 py-3 rounded-2xl hover:from-blue-600 hover:to-blue-700 transition-all duration-300 text-sm font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 mx-auto"
              >
                <Plus size={16} className="group-hover:rotate-90 transition-transform duration-300" />
                Ajouter une voiture
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Ajouter Voiture avec design premium */}
      {showAddCarModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl max-w-md w-full p-8 shadow-2xl border border-gray-200/50">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
                  <Plus className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Ajouter une voiture</h2>
              </div>
              <button
                onClick={() => setShowAddCarModal(false)}
                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-2xl transition-all duration-200"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Marque *</label>
                <div className="relative">
                  <Car className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={carForm.brand}
                    onChange={(e) => setCarForm({ ...carForm, brand: e.target.value })}
                    className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white outline-none"
                    placeholder="BMW, Mercedes, Toyota..."
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Modèle *</label>
                <div className="relative">
                  <Settings className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={carForm.model}
                    onChange={(e) => setCarForm({ ...carForm, model: e.target.value })}
                    className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white outline-none"
                    placeholder="X3, C-Class, Corolla..."
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Année *</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="number"
                    value={carForm.year}
                    onChange={(e) => setCarForm({ ...carForm, year: e.target.value })}
                    className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white outline-none"
                    placeholder="2020"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Immatriculation *</label>
                <div className="relative">
                  <FileText className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={carForm.registration}
                    onChange={(e) => setCarForm({ ...carForm, registration: e.target.value })}
                    className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white outline-none"
                    placeholder="MA-123-AB"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Kilométrage actuel</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="number"
                    value={carForm.currentMileage}
                    onChange={(e) => setCarForm({ ...carForm, currentMileage: e.target.value })}
                    className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white outline-none"
                    placeholder="75000"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button
                onClick={() => setShowAddCarModal(false)}
                className="flex-1 px-6 py-4 border-2 border-gray-200 text-gray-700 rounded-2xl hover:bg-gray-50 transition-all duration-200 font-semibold"
              >
                Annuler
              </button>
              <button
                onClick={addCar}
                className="flex-1 px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-semibold shadow-xl hover:shadow-2xl transform hover:scale-105"
              >
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ajouter Assurance/Vidange/Visite Technique avec design premium */}
      {showAddItemModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl max-w-md w-full p-8 shadow-2xl border border-gray-200/50 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
                  <Plus className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {modalType === 'insurance' && 'Ajouter une assurance'}
                  {modalType === 'oilChange' && 'Ajouter une vidange'}
                  {modalType === 'technicalInspection' && 'Ajouter une visite technique'}
                </h2>
              </div>
              <button
                onClick={() => setShowAddItemModal(false)}
                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-2xl transition-all duration-200"
              >
                <X size={24} />
              </button>
            </div>

            {modalType === 'insurance' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Compagnie d'assurance *</label>
                  <div className="relative">
                    <Building className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      value={insuranceForm.company}
                      onChange={(e) => setInsuranceForm({ ...insuranceForm, company: e.target.value })}
                      className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white outline-none"
                      placeholder="AXA, Wafa, Atlanta..."
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Date de début *</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="date"
                      value={insuranceForm.startDate}
                      onChange={(e) => setInsuranceForm({ ...insuranceForm, startDate: e.target.value })}
                      className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Date de fin *</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="date"
                      value={insuranceForm.endDate}
                      onChange={(e) => setInsuranceForm({ ...insuranceForm, endDate: e.target.value })}
                      className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Montant (DH)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="number"
                      value={insuranceForm.amount}
                      onChange={(e) => setInsuranceForm({ ...insuranceForm, amount: e.target.value })}
                      className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white outline-none"
                      placeholder="1200"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Statut de paiement</label>
                  <div className="relative">
                    <CheckCircle className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <select
                      value={insuranceForm.paymentStatus}
                      onChange={(e) => setInsuranceForm({ ...insuranceForm, paymentStatus: e.target.value })}
                      className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white outline-none appearance-none"
                    >
                      <option value="Non payé">Non payé</option>
                      <option value="Payé">Payé</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {modalType === 'oilChange' && (
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/50 rounded-2xl p-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-blue-600" />
                    <p className="text-sm text-blue-700">
                      La vidange est recommandée tous les 10 000 km
                    </p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Date de la vidange *</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="date"
                      value={oilChangeForm.lastChangeDate}
                      onChange={(e) => setOilChangeForm({ ...oilChangeForm, lastChangeDate: e.target.value })}
                      className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Kilométrage lors de la vidange *</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="number"
                      value={oilChangeForm.mileage}
                      onChange={(e) => setOilChangeForm({ ...oilChangeForm, mileage: e.target.value })}
                      className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white outline-none"
                      placeholder="75000"
                    />
                  </div>
                  {oilChangeForm.mileage && (
                    <p className="text-sm text-gray-600 mt-2 ml-12">
                      Prochaine vidange à {(parseInt(oilChangeForm.mileage) + 10000).toLocaleString()} km
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Statut</label>
                  <div className="relative">
                    <CheckCircle className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <select
                      value={oilChangeForm.status}
                      onChange={(e) => setOilChangeForm({ ...oilChangeForm, status: e.target.value })}
                      className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white outline-none appearance-none"
                    >
                      <option value="Fait">Fait</option>
                      <option value="Pas fait">Pas fait</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Notes (optionnel)</label>
                  <textarea
                    value={oilChangeForm.notes}
                    onChange={(e) => setOilChangeForm({ ...oilChangeForm, notes: e.target.value })}
                    className="w-full px-4 py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white outline-none"
                    rows={3}
                    placeholder="Type d'huile, observations..."
                  />
                </div>
              </div>
            )}

            {modalType === 'technicalInspection' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Centre de contrôle *</label>
                  <div className="relative">
                    <Building className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      value={technicalInspectionForm.center}
                      onChange={(e) => setTechnicalInspectionForm({ ...technicalInspectionForm, center: e.target.value })}
                      className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white outline-none"
                      placeholder="Centre Norisko, DEKRA..."
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Date de la visite *</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="date"
                      value={technicalInspectionForm.inspectionDate}
                      onChange={(e) => setTechnicalInspectionForm({ ...technicalInspectionForm, inspectionDate: e.target.value })}
                      className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Date d'expiration *</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="date"
                      value={technicalInspectionForm.expiryDate}
                      onChange={(e) => setTechnicalInspectionForm({ ...technicalInspectionForm, expiryDate: e.target.value })}
                      className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Coût (DH)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="number"
                      value={technicalInspectionForm.cost}
                      onChange={(e) => setTechnicalInspectionForm({ ...technicalInspectionForm, cost: e.target.value })}
                      className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white outline-none"
                      placeholder="300"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Statut</label>
                  <div className="relative">
                    <CheckCircle className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <select
                      value={technicalInspectionForm.status}
                      onChange={(e) => setTechnicalInspectionForm({ ...technicalInspectionForm, status: e.target.value })}
                      className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white outline-none appearance-none"
                    >
                      <option value="Valide">Valide</option>
                      <option value="Non valide">Non valide</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Notes (optionnel)</label>
                  <textarea
                    value={technicalInspectionForm.notes}
                    onChange={(e) => setTechnicalInspectionForm({ ...technicalInspectionForm, notes: e.target.value })}
                    className="w-full px-4 py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white outline-none"
                    rows={3}
                    placeholder="Observations, défauts détectés..."
                  />
                </div>
              </div>
            )}

            <div className="flex gap-4 mt-8">
              <button
                onClick={() => setShowAddItemModal(false)}
                className="flex-1 px-6 py-4 border-2 border-gray-200 text-gray-700 rounded-2xl hover:bg-gray-50 transition-all duration-200 font-semibold"
              >
                Annuler
              </button>
              <button
                onClick={
                  modalType === 'insurance' 
                    ? addInsurance 
                    : modalType === 'oilChange' 
                      ? addOilChange 
                      : addTechnicalInspection
                }
                className="flex-1 px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-semibold shadow-xl hover:shadow-2xl transform hover:scale-105"
              >
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuiviVoiture;
