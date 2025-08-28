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
  TrendingUp
} from 'lucide-react';
import NotificationBell from './NotificationBell';

const SuiviVoiture = () => {
  // États pour les données - utilisation d'un mock local pour la démo
  const [cars, setCars] = useState([
    {
      id: '1',
      brand: 'BMW',
      model: 'X3',
      year: '2020',
      registration: 'MA-123-AB',
      currentMileage: 85000,
      insurances: [
        {
          id: '1',
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          paymentStatus: 'Payé',
          company: 'AXA',
          amount: '1200'
        }
      ],
      oilChanges: [
        {
          id: '1',
          lastChangeDate: '2024-06-01',
          mileage: 75000,
          status: 'Fait',
          nextDueDate: '2024-12-01',
          nextDueMileage: 85000,
          notes: 'Huile moteur changée'
        }
      ],
      technicalInspections: [
        {
          id: '1',
          inspectionDate: '2024-03-15',
          expiryDate: '2025-03-15',
          status: 'Valide',
          center: 'Centre Norisko',
          cost: '300',
          notes: 'Visite sans problème'
        }
      ]
    }
  ]);
  
  const [loading, setLoading] = useState(false);
  
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

  // Fonctions utilitaires pour les dates
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getDaysUntilDate = (dateString) => {
    const today = new Date();
    const targetDate = new Date(dateString);
    const diffTime = targetDate - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Logique de vidange - calcul automatique basé sur 10 000 km
  const calculateNextOilChange = (currentMileage, lastChangeMileage) => {
    const nextMileage = lastChangeMileage + 10000;
    const remainingKm = nextMileage - currentMileage;
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
    return remainingKm <= 1000; // Alerte à 1000km près
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
      if (car.insurances && car.insurances.length > 0) {
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
      }
      
      // Vérifier les vidanges
      if (car.oilChanges && car.oilChanges.length > 0 && car.currentMileage) {
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
      if (car.technicalInspections && car.technicalInspections.length > 0) {
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
      }
    });
    
    setNotifications(newNotifications);
  };

  useEffect(() => {
    checkAllDueDates();
  }, [cars]);

  // CRUD Operations
  const addCar = async () => {
    if (!carForm.brand || !carForm.model || !carForm.year || !carForm.registration) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const newCar = {
      id: Date.now().toString(),
      ...carForm,
      currentMileage: parseInt(carForm.currentMileage) || 0,
      insurances: [],
      oilChanges: [],
      technicalInspections: [],
      createdAt: new Date()
    };

    setCars(prev => [...prev, newCar]);
    setShowAddCarModal(false);
    resetCarForm();
  };

  const addInsurance = async () => {
    if (!insuranceForm.company || !insuranceForm.startDate || !insuranceForm.endDate) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const newInsurance = {
      id: Date.now().toString(),
      ...insuranceForm,
      createdAt: new Date()
    };

    setCars(prev => prev.map(car => {
      if (car.id === selectedCarId) {
        return {
          ...car,
          insurances: [...(car.insurances || []), newInsurance]
        };
      }
      return car;
    }));

    setShowAddItemModal(false);
    resetInsuranceForm();
  };

  const addOilChange = async () => {
    if (!oilChangeForm.lastChangeDate || !oilChangeForm.mileage) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const mileage = parseInt(oilChangeForm.mileage);
    const { nextMileage } = calculateNextOilChange(mileage, mileage);
    
    const newOilChange = {
      id: Date.now().toString(),
      ...oilChangeForm,
      mileage,
      nextDueMileage: nextMileage,
      createdAt: new Date()
    };

    setCars(prev => prev.map(car => {
      if (car.id === selectedCarId) {
        return {
          ...car,
          oilChanges: [...(car.oilChanges || []), newOilChange]
        };
      }
      return car;
    }));

    setShowAddItemModal(false);
    resetOilChangeForm();
  };

  const addTechnicalInspection = async () => {
    if (!technicalInspectionForm.inspectionDate || !technicalInspectionForm.expiryDate) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const newInspection = {
      id: Date.now().toString(),
      ...technicalInspectionForm,
      createdAt: new Date()
    };

    setCars(prev => prev.map(car => {
      if (car.id === selectedCarId) {
        return {
          ...car,
          technicalInspections: [...(car.technicalInspections || []), newInspection]
        };
      }
      return car;
    }));

    setShowAddItemModal(false);
    resetTechnicalInspectionForm();
  };

  const deleteCar = async (carId) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette voiture ?')) {
      setCars(prev => prev.filter(car => car.id !== carId));
    }
  };

  const updateCarMileage = (carId, newMileage) => {
    setCars(prev => prev.map(car => {
      if (car.id === carId) {
        return { ...car, currentMileage: parseInt(newMileage) };
      }
      return car;
    }));
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header moderne */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/60 sticky top-0 z-40">
        <div className="flex items-center justify-between max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
              <Car className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Suivi des Voitures</h1>
              <p className="text-sm text-gray-600">Gérez vos véhicules, assurances et entretiens</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <NotificationBell notifications={notifications} />
            
            <button
              onClick={() => setShowAddCarModal(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-5 py-2.5 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <Plus size={20} />
              Nouvelle voiture
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Barre de recherche et filtres améliorée */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher par marque, modèle ou immatriculation..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
              />
            </div>
            
            <div className="flex gap-3">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
              >
                <option value="all">Tous les véhicules</option>
                <option value="alerts">Avec alertes</option>
              </select>
              
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
              >
                <option value="name">Trier par nom</option>
                <option value="year">Trier par année</option>
                <option value="mileage">Trier par kilométrage</option>
              </select>
            </div>
          </div>
        </div>

        {/* Statistiques rapides */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Car className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total véhicules</p>
                <p className="text-2xl font-bold text-gray-900">{cars.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Alertes actives</p>
                <p className="text-2xl font-bold text-gray-900">{notifications.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">À jour</p>
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
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Kilométrage total</p>
                <p className="text-2xl font-bold text-gray-900">
                  {cars.reduce((total, car) => total + (car.currentMileage || 0), 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Liste des voitures avec design amélioré */}
        <div className="space-y-6">
          {filteredCars.map((car) => (
            <div key={car.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden">
              {/* En-tête de la voiture */}
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="p-4 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl">
                      <Car className="h-8 w-8 text-gray-600" />
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

              {/* Détails expandables avec design amélioré */}
              {expandedCar === car.id && (
                <div className="border-t border-gray-100 bg-gradient-to-r from-gray-50/50 to-blue-50/30">
                  <div className="p-6">
                    <div className="flex gap-2 mb-6 overflow-x-auto">
                      <button
                        onClick={() => setActiveSection('insurance')}
                        className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all duration-200 whitespace-nowrap ${
                          activeSection === 'insurance'
                            ? 'bg-blue-100 text-blue-700 shadow-sm'
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
                            ? 'bg-blue-100 text-blue-700 shadow-sm'
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
                            ? 'bg-blue-100 text-blue-700 shadow-sm'
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
                            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md"
                          >
                            <Plus size={16} />
                            Ajouter une assurance
                          </button>
                        </div>

                        {car.insurances && car.insurances.length > 0 ? (
                          <div className="grid gap-4">
                            {car.insurances.map((insurance) => (
                              <div key={insurance.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200">
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
                            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md"
                          >
                            <Plus size={16} />
                            Ajouter une vidange
                          </button>
                        </div>

                        {car.oilChanges && car.oilChanges.length > 0 ? (
                          <div className="grid gap-4">
                            {car.oilChanges.map((oilChange) => {
                              const { nextMileage, remainingKm } = calculateNextOilChange(car.currentMileage || 0, oilChange.mileage);
                              
                              return (
                                <div key={oilChange.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200">
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
                            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md"
                          >
                            <Plus size={16} />
                            Ajouter une visite
                          </button>
                        </div>

                        {car.technicalInspections && car.technicalInspections.length > 0 ? (
                          <div className="grid gap-4">
                            {car.technicalInspections.map((inspection) => (
                              <div key={inspection.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200">
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
            <div className="bg-white rounded-2xl p-12 border border-gray-200 shadow-sm">
              <Car className="mx-auto h-20 w-20 text-gray-300 mb-6" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucune voiture trouvée</h3>
              <p className="text-gray-600 mb-8">
                {searchTerm ? 'Aucun véhicule ne correspond à votre recherche' : 'Commencez par ajouter votre première voiture'}
              </p>
              <button
                onClick={() => setShowAddCarModal(true)}
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Ajouter une voiture
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Ajouter Voiture */}
      {showAddCarModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Ajouter une voiture</h2>
              <button
                onClick={() => setShowAddCarModal(false)}
                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-xl transition-all duration-200"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Marque *</label>
                <input
                  type="text"
                  value={carForm.brand}
                  onChange={(e) => setCarForm({ ...carForm, brand: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="BMW, Mercedes, Toyota..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Modèle *</label>
                <input
                  type="text"
                  value={carForm.model}
                  onChange={(e) => setCarForm({ ...carForm, model: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="X3, C-Class, Corolla..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Année *</label>
                <input
                  type="number"
                  value={carForm.year}
                  onChange={(e) => setCarForm({ ...carForm, year: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="2020"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Immatriculation *</label>
                <input
                  type="text"
                  value={carForm.registration}
                  onChange={(e) => setCarForm({ ...carForm, registration: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="MA-123-AB"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Kilométrage actuel</label>
                <input
                  type="number"
                  value={carForm.currentMileage}
                  onChange={(e) => setCarForm({ ...carForm, currentMileage: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="75000"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setShowAddCarModal(false)}
                className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-medium"
              >
                Annuler
              </button>
              <button
                onClick={addCar}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-medium shadow-lg"
              >
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ajouter Assurance/Vidange/Visite Technique */}
      {showAddItemModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                {modalType === 'insurance' && 'Ajouter une assurance'}
                {modalType === 'oilChange' && 'Ajouter une vidange'}
                {modalType === 'technicalInspection' && 'Ajouter une visite technique'}
              </h2>
              <button
                onClick={() => setShowAddItemModal(false)}
                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-xl transition-all duration-200"
              >
                <X size={20} />
              </button>
            </div>

            {modalType === 'insurance' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Compagnie d'assurance *</label>
                  <input
                    type="text"
                    value={insuranceForm.company}
                    onChange={(e) => setInsuranceForm({ ...insuranceForm, company: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="AXA, Wafa, Atlanta..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date de début *</label>
                  <input
                    type="date"
                    value={insuranceForm.startDate}
                    onChange={(e) => setInsuranceForm({ ...insuranceForm, startDate: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date de fin *</label>
                  <input
                    type="date"
                    value={insuranceForm.endDate}
                    onChange={(e) => setInsuranceForm({ ...insuranceForm, endDate: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Montant (DH)</label>
                  <input
                    type="number"
                    value={insuranceForm.amount}
                    onChange={(e) => setInsuranceForm({ ...insuranceForm, amount: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="1200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Statut de paiement</label>
                  <select
                    value={insuranceForm.paymentStatus}
                    onChange={(e) => setInsuranceForm({ ...insuranceForm, paymentStatus: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  >
                    <option value="Non payé">Non payé</option>
                    <option value="Payé">Payé</option>
                  </select>
                </div>
              </div>
            )}

            {modalType === 'oilChange' && (
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-xl mb-4">
                  <p className="text-sm text-blue-700">
                    ℹ️ La vidange est recommandée tous les 10 000 km
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date de la vidange *</label>
                  <input
                    type="date"
                    value={oilChangeForm.lastChangeDate}
                    onChange={(e) => setOilChangeForm({ ...oilChangeForm, lastChangeDate: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Kilométrage lors de la vidange *</label>
                  <input
                    type="number"
                    value={oilChangeForm.mileage}
                    onChange={(e) => setOilChangeForm({ ...oilChangeForm, mileage: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="75000"
                  />
                  {oilChangeForm.mileage && (
                    <p className="text-sm text-gray-600 mt-1">
                      Prochaine vidange à {(parseInt(oilChangeForm.mileage) + 10000).toLocaleString()} km
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
                  <select
                    value={oilChangeForm.status}
                    onChange={(e) => setOilChangeForm({ ...oilChangeForm, status: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  >
                    <option value="Fait">Fait</option>
                    <option value="Pas fait">Pas fait</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes (optionnel)</label>
                  <textarea
                    value={oilChangeForm.notes}
                    onChange={(e) => setOilChangeForm({ ...oilChangeForm, notes: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    rows={3}
                    placeholder="Type d'huile, observations..."
                  />
                </div>
              </div>
            )}

            {modalType === 'technicalInspection' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Centre de contrôle *</label>
                  <input
                    type="text"
                    value={technicalInspectionForm.center}
                    onChange={(e) => setTechnicalInspectionForm({ ...technicalInspectionForm, center: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Centre Norisko, DEKRA..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date de la visite *</label>
                  <input
                    type="date"
                    value={technicalInspectionForm.inspectionDate}
                    onChange={(e) => setTechnicalInspectionForm({ ...technicalInspectionForm, inspectionDate: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date d'expiration *</label>
                  <input
                    type="date"
                    value={technicalInspectionForm.expiryDate}
                    onChange={(e) => setTechnicalInspectionForm({ ...technicalInspectionForm, expiryDate: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Coût (DH)</label>
                  <input
                    type="number"
                    value={technicalInspectionForm.cost}
                    onChange={(e) => setTechnicalInspectionForm({ ...technicalInspectionForm, cost: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
                  <select
                    value={technicalInspectionForm.status}
                    onChange={(e) => setTechnicalInspectionForm({ ...technicalInspectionForm, status: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  >
                    <option value="Valide">Valide</option>
                    <option value="Non valide">Non valide</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes (optionnel)</label>
                  <textarea
                    value={technicalInspectionForm.notes}
                    onChange={(e) => setTechnicalInspectionForm({ ...technicalInspectionForm, notes: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    rows={3}
                    placeholder="Observations, défauts détectés..."
                  />
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setShowAddItemModal(false)}
                className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-medium"
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
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-medium shadow-lg"
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
