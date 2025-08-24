import React, { useState, useEffect } from 'react';
import { 
  Plus, Edit, Trash2, Search, Save, X, BarChart3, ShoppingCart, 
  Filter, Download, Building2, Loader2, AlertTriangle, CheckCircle,
  Tag, Calendar, TrendingUp, Package2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { 
  collection, query, where, getDocs, doc, getDoc, addDoc, 
  updateDoc, deleteDoc, orderBy, onSnapshot 
} from 'firebase/firestore';
import toast, { Toaster } from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

// Types selon le cahier de charges
interface Company {
  id: string;
  nom: string;
  createdAt: string;
  responsableId?: string;
  ville?: string;
}

interface Category {
  id: string;
  companyId: string;
  name: string;
  createdAt: string;
  global?: boolean;
  createdBy?: string;
}

interface Purchase {
  id: string;
  companyId: string;
  itemName: string;
  categoryId: string;
  quantity?: number;
  unit?: string;
  total: number;
  supplier?: string;
  date: string;
  note?: string;
  createdAt: string;
  updatedAt?: string;
  categoryName?: string;
  companyName?: string;
}

const KitchenManagement: React.FC = () => {
  const { userProfile } = useAuth();

  // États de chargement et d'erreurs
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  // États pour les onglets
  const [activeTab, setActiveTab] = useState<'purchases' | 'categories' | 'reports'>('purchases');

  // États pour les données
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);

  // États pour les filtres et recherche
  const [purchaseSearch, setPurchaseSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Tous');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedCompany, setSelectedCompany] = useState<string>('');

  // États pour les modals
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Purchase | Category | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');

  // États pour les formulaires
  const [purchaseForm, setPurchaseForm] = useState<Omit<Purchase, 'id' | 'createdAt' | 'categoryName' | 'companyName'>>({
    companyId: userProfile?.entreprise || '',
    itemName: '',
    categoryId: '',
    quantity: undefined,
    unit: '',
    total: 0,
    supplier: '',
    date: new Date().toISOString().split('T')[0],
    note: ''
  });

  // Effet pour charger les données
  useEffect(() => {
    if (!userProfile) return;
    
    const initializeData = async () => {
      setLoading(true);
      try {
        if (userProfile.role === 'super_admin') {
          await fetchCompanies();
        }
        await Promise.all([
          fetchCategories(),
          fetchPurchases()
        ]);
        setError(null);
      } catch (err) {
        console.error('Erreur lors de l\'initialisation:', err);
        setError('Erreur lors du chargement des données');
        toast.error('Erreur lors du chargement des données');
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, [userProfile, selectedCompany]);

  // Charger les entreprises
  const fetchCompanies = async () => {
    try {
      const q = query(collection(db, 'entreprises'), orderBy('nom'));
      const querySnapshot = await getDocs(q);
      const companiesData: Company[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        companiesData.push({ 
          id: doc.id, 
          nom: data.nom,
          createdAt: data.createdAt,
          responsableId: data.responsableId,
          ville: data.ville
        } as Company);
      });
      
      setCompanies(companiesData);
    } catch (error) {
      console.error('Erreur lors du chargement des entreprises:', error);
      throw error;
    }
  };

  // Charger les catégories
  const fetchCategories = async () => {
    try {
      let categoriesQuery = collection(db, 'categories');
      
      if (userProfile?.role === 'super_admin') {
        const q = query(categoriesQuery, orderBy('name'));
        const querySnapshot = await getDocs(q);
        const categoriesData: Category[] = [];
        querySnapshot.forEach((doc) => {
          categoriesData.push({ id: doc.id, ...doc.data() } as Category);
        });
        setCategories(categoriesData);
      } else if (userProfile?.role === 'responsable' && userProfile.entreprise) {
        const globalCategoriesQuery = query(
          categoriesQuery, 
          where('global', '==', true),
          orderBy('name')
        );
        
        const companyCategoriesQuery = query(
          categoriesQuery,
          where('companyId', '==', userProfile.entreprise),
          where('global', '!=', true),
          orderBy('name')
        );
        
        const [globalSnapshot, companySnapshot] = await Promise.all([
          getDocs(globalCategoriesQuery),
          getDocs(companyCategoriesQuery)
        ]);
        
        const categoriesData: Category[] = [];
        
        globalSnapshot.forEach((doc) => {
          categoriesData.push({ id: doc.id, ...doc.data() } as Category);
        });
        
        companySnapshot.forEach((doc) => {
          categoriesData.push({ id: doc.id, ...doc.data() } as Category);
        });
        
        setCategories(categoriesData);
      } else {
        setCategories([]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des catégories:', error);
      toast.error('Erreur lors du chargement des catégories');
    }
  };

  // Charger les achats
  const fetchPurchases = async () => {
    try {
      let q;
      let purchasesQuery = collection(db, 'purchases');
      
      if (userProfile?.role === 'super_admin') {
        if (selectedCompany) {
          // CORRECTION: Filtrer par nom d'entreprise au lieu de l'ID
          const selectedCompanyObj = companies.find(c => c.id === selectedCompany);
          if (selectedCompanyObj) {
            q = query(purchasesQuery, 
              where('companyId', '==', selectedCompanyObj.nom), // Utiliser le nom de l'entreprise
              orderBy('date', 'desc')
            );
          } else {
            setPurchases([]);
            return;
          }
        } else {
          q = query(purchasesQuery, orderBy('date', 'desc'));
        }
      } else if (userProfile?.role === 'responsable' && userProfile.entreprise) {
        // Pour les responsables, utiliser le nom de leur entreprise
        const userCompany = companies.find(c => c.id === userProfile.entreprise);
        if (userCompany) {
          q = query(purchasesQuery, 
            where('companyId', '==', userCompany.nom), // Utiliser le nom de l'entreprise
            orderBy('date', 'desc')
          );
        } else {
          setPurchases([]);
          return;
        }
      } else {
        setPurchases([]);
        return;
      }

      const querySnapshot = await getDocs(q);
      const purchasesData: Purchase[] = [];
      
      for (const docSnap of querySnapshot.docs) {
        const purchase = { id: docSnap.id, ...docSnap.data() } as Purchase;
        
        // Récupérer le nom de la catégorie
        if (purchase.categoryId) {
          try {
            const categoryDoc = await getDoc(doc(db, 'categories', purchase.categoryId));
            if (categoryDoc.exists()) {
              purchase.categoryName = categoryDoc.data().name;
            }
          } catch (err) {
            console.warn('Impossible de récupérer le nom de la catégorie:', err);
          }
        }

        // Pour le super admin, récupérer le nom de l'entreprise
        if (userProfile?.role === 'super_admin') {
          // CORRECTION: companyId contient déjà le nom de l'entreprise
          purchase.companyName = purchase.companyId;
        }
        
        purchasesData.push(purchase);
      }
      
      setPurchases(purchasesData);
    } catch (error) {
      console.error('Erreur lors du chargement des achats:', error);
      toast.error('Erreur lors du chargement des achats');
      throw error;
    }
  };

  // Ajouter une nouvelle catégorie
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error('Veuillez saisir un nom de catégorie');
      return;
    }

    setSaving(true);
    try {
      const categoryData: any = {
        name: newCategoryName.trim(),
        createdAt: new Date().toISOString(),
        createdBy: userProfile?.userId || ''
      };

      if (userProfile?.role === 'super_admin') {
        categoryData.global = true;
        categoryData.companyId = '';
      } else {
        categoryData.global = false;
        categoryData.companyId = userProfile?.entreprise || '';
      }

      await addDoc(collection(db, 'categories'), categoryData);
      setNewCategoryName('');
      setShowCategoryModal(false);
      await fetchCategories();
      toast.success('Catégorie ajoutée avec succès');
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la catégorie:', error);
      toast.error('Erreur lors de l\'ajout de la catégorie');
    } finally {
      setSaving(false);
    }
  };

  // Supprimer une catégorie
  const handleDeleteCategory = async (id: string) => {
    const categoryUsed = purchases.some(purchase => purchase.categoryId === id);
    if (categoryUsed) {
      toast.error('Impossible de supprimer cette catégorie car elle est utilisée dans des achats');
      return;
    }

    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette catégorie ?')) return;

    setSaving(true);
    try {
      await deleteDoc(doc(db, 'categories', id));
      setCategories(categories.filter(category => category.id !== id));
      toast.success('Catégorie supprimée avec succès');
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast.error('Erreur lors de la suppression de la catégorie');
    } finally {
      setSaving(false);
    }
  };

  // Gestion des achats
  const handleAddPurchase = () => {
    setEditingItem(null);
    setPurchaseForm({
      companyId: userProfile?.role === 'super_admin' && selectedCompany 
        ? selectedCompany 
        : userProfile?.entreprise || '',
      itemName: '',
      categoryId: '',
      quantity: undefined,
      unit: '',
      total: 0,
      supplier: '',
      date: new Date().toISOString().split('T')[0],
      note: ''
    });
    setShowPurchaseModal(true);
  };

  const handleEditPurchase = (purchase: Purchase) => {
    setEditingItem(purchase);
    setPurchaseForm({
      companyId: purchase.companyId,
      itemName: purchase.itemName,
      categoryId: purchase.categoryId,
      quantity: purchase.quantity,
      unit: purchase.unit || '',
      total: purchase.total,
      supplier: purchase.supplier || '',
      date: purchase.date,
      note: purchase.note || ''
    });
    setShowPurchaseModal(true);
  };

  const handleDeletePurchase = async (id: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet achat ?')) return;

    setSaving(true);
    try {
      await deleteDoc(doc(db, 'purchases', id));
      setPurchases(purchases.filter(purchase => purchase.id !== id));
      toast.success('Achat supprimé avec succès');
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast.error('Erreur lors de la suppression de l\'achat');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePurchase = async () => {
    if (!purchaseForm.itemName.trim() || !purchaseForm.categoryId || purchaseForm.total <= 0) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setSaving(true);

    try {
      // CORRECTION: Utiliser le nom de l'entreprise au lieu de l'ID
      let companyNameForPurchase = '';
      if (userProfile?.role === 'super_admin' && purchaseForm.companyId) {
        const selectedCompanyObj = companies.find(c => c.id === purchaseForm.companyId);
        companyNameForPurchase = selectedCompanyObj ? selectedCompanyObj.nom : '';
      } else if (userProfile?.role === 'responsable' && userProfile.entreprise) {
        const userCompany = companies.find(c => c.id === userProfile.entreprise);
        companyNameForPurchase = userCompany ? userCompany.nom : '';
      }

      const purchaseData = {
        ...purchaseForm,
        companyId: companyNameForPurchase, // Stocker le nom de l'entreprise
        itemName: purchaseForm.itemName.trim(),
        supplier: purchaseForm.supplier?.trim() || '',
        note: purchaseForm.note?.trim() || '',
        updatedAt: new Date().toISOString()
      };

      if (editingItem) {
        await updateDoc(doc(db, 'purchases', (editingItem as Purchase).id), purchaseData);
        toast.success('Achat modifié avec succès');
      } else {
        const newPurchaseData = {
          ...purchaseData,
          createdAt: new Date().toISOString()
        };
        await addDoc(collection(db, 'purchases'), newPurchaseData);
        toast.success('Achat ajouté avec succès');
      }
      
      setShowPurchaseModal(false);
      await fetchPurchases();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast.error('Erreur lors de la sauvegarde de l\'achat');
    } finally {
      setSaving(false);
    }
  };

  // Générer un rapport PDF
  const generatePDFReport = async () => {
    setGeneratingPDF(true);
    try {
      const doc = new jsPDF();
      doc.setFont('helvetica');
      doc.setFontSize(20);
      doc.setTextColor(51, 51, 51);
      doc.text('Rapport de Suivi des Achats et Dépenses', 14, 22);

      doc.setFontSize(12);
      doc.setTextColor(102, 102, 102);
      
      let yPosition = 35;
      if (selectedCompany && companies.length > 0) {
        const company = companies.find(c => c.id === selectedCompany);
        doc.text(`Entreprise: ${company?.nom || 'Non spécifiée'}`, 14, yPosition);
      } else if (userProfile?.role === 'responsable') {
        const company = companies.find(c => c.id === userProfile.entreprise);
        doc.text(`Entreprise: ${company?.nom || userProfile.entreprise || 'Non spécifiée'}`, 14, yPosition);
      } else {
        doc.text('Entreprise: Toutes les entreprises', 14, yPosition);
      }
      
      yPosition += 10;
      doc.text(`Période: ${getSelectedPeriodLabel()}`, 14, yPosition);
      doc.text(`Date du rapport: ${new Date().toLocaleDateString('fr-FR')}`, 14, yPosition + 10);
      doc.text(`Généré par: ${userProfile?.nom || 'Utilisateur'}`, 14, yPosition + 20);

      yPosition += 35;
      doc.setLineWidth(0.5);
      doc.setDrawColor(200, 200, 200);
      doc.line(14, yPosition, 196, yPosition);

      yPosition += 15;
      doc.setFontSize(16);
      doc.setTextColor(51, 51, 51);
      doc.text('Historique des Achats', 14, yPosition);

      const purchasesHeaders = [
        'Date', 'Article', 'Catégorie', 'Quantité', 'Total', 'Fournisseur'
      ];
      
      if (userProfile?.role === 'super_admin') {
        purchasesHeaders.push('Entreprise');
      }

      const purchasesData = filteredPurchases.map(p => {
        const row = [
          new Date(p.date).toLocaleDateString('fr-FR'),
          p.itemName,
          p.categoryName || 'N/A',
          p.quantity ? `${p.quantity} ${p.unit || ''}`.trim() : 'N/A',
          `${p.total.toFixed(2)} DH`,
          p.supplier || 'N/A'
        ];
        
        if (userProfile?.role === 'super_admin') {
          row.push(p.companyName || p.companyId || 'N/A');
        }
        
        return row;
      });

      autoTable(doc, {
        startY: yPosition + 5,
        head: [purchasesHeaders],
        body: purchasesData,
        theme: 'grid',
        headStyles: { 
          fillColor: [59, 130, 246],
          textColor: [255, 255, 255],
          fontSize: 10,
          fontStyle: 'bold'
        },
        bodyStyles: { 
          fontSize: 9,
          textColor: [51, 51, 51]
        },
        alternateRowStyles: { 
          fillColor: [248, 250, 252] 
        },
        margin: { left: 14, right: 14 }
      });

      const finalY = doc.lastAutoTable.finalY + 20;
      doc.setFontSize(16);
      doc.setTextColor(51, 51, 51);
      doc.text('Résumé Statistique', 14, finalY);

      const totalExpenses = filteredPurchases.reduce((total, purchase) => 
        total + purchase.total, 0
      );

      const categoryStats = getCategoryStats();

      const statsData = [
        ['Nombre d\'achats', filteredPurchases.length.toString()],
        ['Total des dépenses', `${totalExpenses.toFixed(2)} DH`],
        ['Dépense moyenne par achat', filteredPurchases.length > 0 ? `${(totalExpenses / filteredPurchases.length).toFixed(2)} DH` : '0 DH'],
        ['Nombre de catégories utilisées', categoryStats.length.toString()],
        ['Nombre de fournisseurs différents', Array.from(new Set(filteredPurchases.map(p => p.supplier).filter(Boolean))).length.toString()]
      ];

      autoTable(doc, {
        startY: finalY + 5,
        head: [['Indicateur', 'Valeur']],
        body: statsData,
        theme: 'grid',
        headStyles: { 
          fillColor: [16, 185, 129],
          textColor: [255, 255, 255],
          fontSize: 11,
          fontStyle: 'bold'
        },
        bodyStyles: { 
          fontSize: 10,
          textColor: [51, 51, 51]
        },
        columnStyles: {
          0: { fontStyle: 'bold' }
        },
        alternateRowStyles: { 
          fillColor: [248, 250, 252] 
        },
        margin: { left: 14, right: 14 }
      });

      if (categoryStats.length > 0) {
        const categoryY = doc.lastAutoTable.finalY + 20;
        doc.setFontSize(16);
        doc.setTextColor(51, 51, 51);
        doc.text('Répartition par Catégorie', 14, categoryY);

        const categoryHeaders = ['Catégorie', 'Nombre d\'achats', 'Total dépenses', 'Pourcentage'];
        const categoryTableData = categoryStats.map(stat => [
          stat.name,
          stat.count.toString(),
          `${stat.total.toFixed(2)} DH`,
          `${stat.percentage.toFixed(1)}%`
        ]);

        autoTable(doc, {
          startY: categoryY + 5,
          head: [categoryHeaders],
          body: categoryTableData,
          theme: 'grid',
          headStyles: { 
            fillColor: [168, 85, 247],
            textColor: [255, 255, 255],
            fontSize: 10,
            fontStyle: 'bold'
          },
          bodyStyles: { 
            fontSize: 9,
            textColor: [51, 51, 51]
          },
          alternateRowStyles: { 
            fillColor: [248, 250, 252] 
          },
          margin: { left: 14, right: 14 }
        });
      }

      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(
          `Page ${i} sur ${pageCount} - Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`,
          14,
          doc.internal.pageSize.height - 10
        );
      }

      const companyName = selectedCompany ? 
        companies.find(c => c.id === selectedCompany)?.nom || 'entreprise' : 
        'global';
      const fileName = `rapport-achats-${companyName}-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      toast.success('Rapport PDF généré avec succès');
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error);
      toast.error('Erreur lors de la génération du rapport PDF');
    } finally {
      setGeneratingPDF(false);
    }
  };

  // Fonctions utilitaires pour les filtres
  const getDateFilteredPurchases = (purchases: Purchase[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (dateFilter) {
      case 'today':
        return purchases.filter(p => {
          const purchaseDate = new Date(p.date);
          return purchaseDate >= today;
        });
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return purchases.filter(p => {
          const purchaseDate = new Date(p.date);
          return purchaseDate >= weekAgo;
        });
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return purchases.filter(p => {
          const purchaseDate = new Date(p.date);
          return purchaseDate >= monthAgo;
        });
      default:
        return purchases;
    }
  };

  const getSelectedPeriodLabel = () => {
    switch (dateFilter) {
      case 'today': return "Aujourd'hui";
      case 'week': return '7 derniers jours';
      case 'month': return '30 derniers jours';
      default: return 'Toute la période';
    }
  };

  // Filtrage des achats
  const filteredPurchases = getDateFilteredPurchases(
    purchases.filter(purchase => {
      const matchesSearch =
        (purchase.itemName || '').toLowerCase().includes(purchaseSearch.toLowerCase()) ||
        (purchase.supplier || '').toLowerCase().includes(purchaseSearch.toLowerCase()) ||
        (purchase.categoryName || '').toLowerCase().includes(purchaseSearch.toLowerCase());

      const matchesCategory =
        categoryFilter === 'Tous' || purchase.categoryId === categoryFilter;

      return matchesSearch && matchesCategory;
    })
  );

  // Fonction pour générer des couleurs différentes pour chaque entreprise
  const getCompanyColor = (companyId: string | undefined): string => {
    if (!companyId) return '#9CA3AF';
    
    const colors = [
      '#EF4444', '#F59E0B', '#10B981', '#3B82F6', 
      '#6366F1', '#8B5CF6', '#EC4899', '#6B7280',
      '#84CC16', '#06B6D4', '#F97316', '#A855F7'
    ];
    
    let hash = 0;
    for (let i = 0; i < companyId.length; i++) {
      hash = companyId.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  };

  // Calculer les statistiques par catégorie
  const getCategoryStats = () => {
    const categoryMap = new Map();
    const totalExpenses = filteredPurchases.reduce((sum, p) => sum + p.total, 0);
    
    filteredPurchases.forEach(purchase => {
      const categoryName = purchase.categoryName || 'Non catégorisé';
      if (!categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, { count: 0, total: 0 });
      }
      const current = categoryMap.get(categoryName);
      current.count += 1;
      current.total += purchase.total;
    });

    return Array.from(categoryMap.entries()).map(([name, data]) => ({
      name,
      count: data.count,
      total: data.total,
      percentage: totalExpenses > 0 ? (data.total / totalExpenses) * 100 : 0
    })).sort((a, b) => b.total - a.total);
  };

  // Vérifier les autorisations
  if (!['super_admin', 'responsable'].includes(userProfile?.role || '')) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-md p-8 text-center max-w-md w-full">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Accès refusé</h2>
          <p className="text-gray-600">
            Vous n'avez pas les autorisations nécessaires pour accéder à ce module.
          </p>
        </div>
      </div>
    );
  }

  // Écran de chargement
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Chargement des données...</p>
        </div>
      </div>
    );
  }

  // Écran d'erreur
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-md p-8 text-center max-w-md w-full">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Erreur</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Recharger la page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10B981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#EF4444',
              secondary: '#fff',
            },
          },
        }}
      />

      {/* Navbar */}
      <nav className="bg-white shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between h-auto md:h-16 py-3 md:py-0">
            <div className="flex items-center mb-3 md:mb-0">
              <div className="flex-shrink-0 flex items-center">
                <ShoppingCart className="h-8 w-8 text-blue-600" />
                <span className="ml-2 text-xl font-bold text-gray-900">Suivi Achats & Dépenses</span>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-start md:items-center space-y-2 md:space-y-0 md:space-x-4">
              {/* Onglets de navigation */}
              <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
                {[
                  { key: 'purchases', label: 'Achats', icon: ShoppingCart },
                  { key: 'categories', label: 'Catégories', icon: Tag },
                  { key: 'reports', label: 'Rapports', icon: BarChart3 }
                ].map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === key
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                    onClick={() => setActiveTab(key as any)}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                ))}
              </div>

              {/* Contrôles */}
              <div className="flex items-center space-x-2">
                {userProfile?.role === 'super_admin' && (
                  <div className="flex items-center">
                    <Filter className="mr-2 h-4 w-4 text-gray-500" />
                    <select
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                      value={selectedCompany}
                      onChange={(e) => setSelectedCompany(e.target.value)}
                    >
                      <option value="">Toutes les sociétés</option>
                      {companies.map(company => (
                        <option key={company.id} value={company.id}>
                          {company.nom}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <button
                  className="flex items-center gap-2 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={generatePDFReport}
                  disabled={generatingPDF}
                >
                  {generatingPDF ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Download size={16} />
                  )}
                  <span className="hidden sm:inline">
                    {generatingPDF ? 'Génération...' : 'Exporter PDF'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Contenu principal */}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Section Achats */}
        {activeTab === 'purchases' && (
          <div className="px-4 py-6 sm:px-0">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
              <h2 className="text-3xl font-bold text-gray-800">Gestion des Achats</h2>
              
              <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Rechercher un achat..."
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                    value={purchaseSearch}
                    onChange={(e) => setPurchaseSearch(e.target.value)}
                  />
                </div>

                <div className="flex gap-2">
                  <select
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto bg-white"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                  >
                    <option value="Tous">Toutes catégories</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>

                  <select
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto bg-white"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                  >
                    <option value="all">Toute période</option>
                    <option value="today">Aujourd'hui</option>
                    <option value="week">7 derniers jours</option>
                    <option value="month">30 derniers jours</option>
                  </select>

                  <button
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    onClick={handleAddPurchase}
                  >
                    <Plus size={16} />
                    <span className="hidden sm:inline">Nouvel achat</span>
                    <span className="sm:hidden">Nouveau</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Cartes de résumé */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
                <div className="flex items-center">
                  <ShoppingCart className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-2xl font-bold text-gray-900">{filteredPurchases.length}</p>
                    <p className="text-sm text-gray-600">Achats ({getSelectedPeriodLabel()})</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
                <div className="flex items-center">
                  <TrendingUp className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-2xl font-bold text-gray-900">
                      {filteredPurchases.reduce((sum, p) => sum + p.total, 0).toFixed(0)} DH
                    </p>
                    <p className="text-sm text-gray-600">Total dépenses</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-purple-500">
                <div className="flex items-center">
                  <Tag className="h-8 w-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-2xl font-bold text-gray-900">
                      {Array.from(new Set(filteredPurchases.map(p => p.categoryId))).length}
                    </p>
                    <p className="text-sm text-gray-600">Catégories utilisées</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-amber-500">
                <div className="flex items-center">
                  <Package2 className="h-8 w-8 text-amber-600" />
                  <div className="ml-4">
                    <p className="text-2xl font-bold text-gray-900">
                      {filteredPurchases.length > 0 ? (filteredPurchases.reduce((sum, p) => sum + p.total, 0) / filteredPurchases.length).toFixed(0) : 0} DH
                    </p>
                    <p className="text-sm text-gray-600">Dépense moyenne</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tableau des achats */}
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
              {filteredPurchases.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {userProfile?.role === 'super_admin' && (
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Société
                          </th>
                        )}
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Article
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Catégorie
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quantité
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Fournisseur
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredPurchases.map((purchase, index) => (
                        <tr key={purchase.id} className={`hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}>
                          {userProfile?.role === 'super_admin' && (
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {/* CORRECTION: Utiliser des couleurs différentes pour chaque entreprise */}
                              <span 
                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                                style={{ 
                                  backgroundColor: getCompanyColor(purchase.companyId),
                                  color: 'white'
                                }}
                              >
                                <Building2 className="mr-1 h-3 w-3" />
                                {purchase.companyName || purchase.companyId || '—'}
                              </span>
                            </td>
                          )}
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(purchase.date).toLocaleDateString('fr-FR')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{purchase.itemName}</div>
                            {purchase.note && (
                              <div className="text-xs text-gray-500 truncate max-w-xs">{purchase.note}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {purchase.categoryName || 'Non catégorisé'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {purchase.quantity ? `${purchase.quantity} ${purchase.unit || ''}`.trim() : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                            {purchase.total.toFixed(2)} DH
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {purchase.supplier || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center space-x-2">
                              <button
                                className="text-blue-600 hover:text-blue-900 transition-colors"
                                onClick={() => handleEditPurchase(purchase)}
                                title="Modifier"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                className="text-red-600 hover:text-red-900 transition-colors"
                                onClick={() => handleDeletePurchase(purchase.id)}
                                title="Supprimer"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td 
                          colSpan={userProfile?.role === 'super_admin' ? 7 : 6} 
                          className="px-6 py-3 text-right text-sm font-medium text-gray-900"
                        >
                          Total ({getSelectedPeriodLabel()}):
                        </td>
                        <td className="px-6 py-3 text-sm font-bold text-green-600">
                          {filteredPurchases.reduce((sum, p) => sum + p.total, 0).toFixed(2)} DH
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <ShoppingCart className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun achat trouvé</h3>
                  <p className="text-gray-500 mb-4">Commencez par enregistrer vos premiers achats.</p>
                  <button
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    onClick={handleAddPurchase}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Ajouter votre premier achat
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Section Catégories */}
        {activeTab === 'categories' && (
          <div className="px-4 py-6 sm:px-0">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
              <h2 className="text-3xl font-bold text-gray-800">Gestion des Catégories</h2>
              
              <button
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                onClick={() => setShowCategoryModal(true)}
              >
                <Plus size={16} />
                Nouvelle catégorie
              </button>
            </div>

            {/* Liste des catégories */}
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
              {categories.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Nom
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Nombre d'achats
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total dépenses
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date création
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {categories.map((category, index) => {
                        const categoryPurchases = purchases.filter(p => p.categoryId === category.id);
                        const totalSpent = categoryPurchases.reduce((sum, p) => sum + p.total, 0);
                        
                        return (
                          <tr key={category.id} className={`hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <Tag className="h-5 w-5 text-blue-500 mr-3" />
                                <div className="text-sm font-medium text-gray-900">
                                  {category.name}
                                  {category.global && (
                                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                      Globale
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {categoryPurchases.length}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                              {totalSpent.toFixed(2)} DH
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(category.createdAt).toLocaleDateString('fr-FR')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              {(userProfile?.role === 'super_admin' || !category.global) && (
                                <button
                                  className="text-red-600 hover:text-red-900 transition-colors"
                                  onClick={() => handleDeleteCategory(category.id)}
                                  title="Supprimer"
                                  disabled={categoryPurchases.length > 0}
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Tag className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune catégorie trouvée</h3>
                  <p className="text-gray-500 mb-4">Créez des catégories pour organiser vos achats.</p>
                  <button
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    onClick={() => setShowCategoryModal(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Créer votre première catégorie
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Section Rapports */}
        {activeTab === 'reports' && (
          <div className="px-4 py-6 sm:px-0">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <h2 className="text-3xl font-bold text-gray-800">Rapports et Statistiques</h2>
              
              <div className="flex items-center gap-2">
                <select
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                >
                  <option value="all">Toute période</option>
                  <option value="today">Aujourd'hui</option>
                  <option value="week">7 derniers jours</option>
                  <option value="month">30 derniers jours</option>
                </select>
                
                <button
                  className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={generatePDFReport}
                  disabled={generatingPDF}
                >
                  {generatingPDF ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Download size={16} />
                  )}
                  {generatingPDF ? 'Génération...' : 'Exporter PDF'}
                </button>
              </div>
            </div>

            {/* Cartes de statistiques */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
                <div className="flex items-center">
                  <ShoppingCart className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-2xl font-bold text-gray-900">{filteredPurchases.length}</p>
                    <p className="text-sm text-gray-600">Achats totaux</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
                <div className="flex items-center">
                  <TrendingUp className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-2xl font-bold text-gray-900">
                      {filteredPurchases.reduce((sum, p) => sum + p.total, 0).toFixed(0)} DH
                    </p>
                    <p className="text-sm text-gray-600">Total dépenses</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-purple-500">
                <div className="flex items-center">
                  <BarChart3 className="h-8 w-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-2xl font-bold text-gray-900">
                      {filteredPurchases.length > 0 ? (filteredPurchases.reduce((sum, p) => sum + p.total, 0) / filteredPurchases.length).toFixed(0) : 0} DH
                    </p>
                    <p className="text-sm text-gray-600">Dépense moyenne</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-amber-500">
                <div className="flex items-center">
                  <Calendar className="h-8 w-8 text-amber-600" />
                  <div className="ml-4">
                    <p className="text-2xl font-bold text-gray-900">{getSelectedPeriodLabel()}</p>
                    <p className="text-sm text-gray-600">Période analysée</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Graphiques et analyses */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Répartition par catégorie */}
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Répartition par Catégorie</h3>
                <div className="space-y-3">
                  {getCategoryStats().map((stat) => (
                    <div key={stat.name} className="flex items-center">
                      <div className="w-24 text-sm text-gray-700 truncate">{stat.name}</div>
                      <div className="flex-1 mx-3 h-4 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
                          style={{ width: `${stat.percentage}%` }}
                        ></div>
                      </div>
                      <div className="w-20 text-right text-sm font-medium text-gray-900">
                        {stat.total.toFixed(0)} DH
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Articles les plus achetés */}
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Articles les Plus Achetés</h3>
                <div className="space-y-3">
                  {Array.from(
                    filteredPurchases.reduce((acc, purchase) => {
                      const key = purchase.itemName;
                      if (!acc.has(key)) {
                        acc.set(key, { count: 0, total: 0 });
                      }
                      const current = acc.get(key)!;
                      current.count += 1;
                      current.total += purchase.total;
                      return acc;
                    }, new Map())
                  )
                    .sort(([, a], [, b]) => b.count - a.count)
                    .slice(0, 10)
                    .map(([itemName, data]) => (
                      <div key={itemName} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                        <div className="flex-1 truncate">
                          <div className="text-sm font-medium text-gray-900 truncate">{itemName}</div>
                          <div className="text-xs text-gray-500">{data.count} achat{data.count > 1 ? 's' : ''}</div>
                        </div>
                        <div className="text-sm font-medium text-gray-900">
                          {data.total.toFixed(0)} DH
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* Résumé détaillé */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Résumé Détaillé</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Achats</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Total achats: {filteredPurchases.length}</li>
                    <li>• Montant total: {filteredPurchases.reduce((sum, p) => sum + p.total, 0).toFixed(2)} DH</li>
                    <li>• Achat moyen: {filteredPurchases.length > 0 ? (filteredPurchases.reduce((sum, p) => sum + p.total, 0) / filteredPurchases.length).toFixed(2) : 0} DH</li>
                    <li>• Articles différents: {Array.from(new Set(filteredPurchases.map(p => p.itemName))).length}</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Fournisseurs</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Fournisseurs différents: {Array.from(new Set(filteredPurchases.map(p => p.supplier).filter(Boolean))).length}</li>
                    <li>• Avec fournisseur: {filteredPurchases.filter(p => p.supplier).length}</li>
                    <li>• Sans fournisseur: {filteredPurchases.filter(p => !p.supplier).length}</li>
                    <li>• Principal fournisseur: {
                      (() => {
                        const suppliers = filteredPurchases.filter(p => p.supplier).map(p => p.supplier!);
                        const counts = suppliers.reduce((acc, supplier) => {
                          acc[supplier] = (acc[supplier] || 0) + 1;
                          return acc;
                        }, {} as Record<string, number>);
                        const top = Object.entries(counts).sort(([, a], [, b]) => b - a)[0];
                        return top ? `${top[0]} (${top[1]})` : 'N/A';
                      })()
                    }</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Catégories</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Catégories totales: {categories.length}</li>
                    <li>• Catégories utilisées: {Array.from(new Set(filteredPurchases.map(p => p.categoryId))).length}</li>
                    <li>• Catégorie principale: {
                      (() => {
                        const categoryStats = getCategoryStats();
                        return categoryStats[0]?.name || 'N/A';
                      })()
                    }</li>
                    <li>• Achats non catégorisés: {filteredPurchases.filter(p => !p.categoryId).length}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal pour les achats */}
      {showPurchaseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                {editingItem ? "Modifier l'achat" : "Nouvel achat"}
              </h3>
              <button
                onClick={() => setShowPurchaseModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSavePurchase(); }} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom de l'article *
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={purchaseForm.itemName}
                    onChange={(e) => setPurchaseForm({...purchaseForm, itemName: e.target.value})}
                    placeholder="Ex: Pommes de terre, Viande hachée..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Catégorie *
                  </label>
                  <select
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    value={purchaseForm.categoryId}
                    onChange={(e) => setPurchaseForm({...purchaseForm, categoryId: e.target.value})}
                  >
                    <option value="">Sélectionner une catégorie</option>
                    <optgroup label="Catégories globales">
                      {categories
                        .filter(cat => cat.global)
                        .map(category => (
                          <option key={category.id} value={category.id}>{category.name}</option>
                        ))
                      }
                    </optgroup>
                    {userProfile?.role === 'responsable' && (
                      <optgroup label="Mes catégories">
                        {categories
                          .filter(cat => !cat.global && cat.companyId === userProfile.entreprise)
                          .map(category => (
                            <option key={category.id} value={category.id}>{category.name}</option>
                          ))
                        }
                      </optgroup>
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantité (optionnelle)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={purchaseForm.quantity || ''}
                    onChange={(e) => setPurchaseForm({...purchaseForm, quantity: e.target.value ? Number(e.target.value) : undefined})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Unité (optionnelle)
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    value={purchaseForm.unit || ''}
                    onChange={(e) => setPurchaseForm({...purchaseForm, unit: e.target.value})}
                  >
                    <option value="">Sélectionner</option>
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="L">L</option>
                    <option value="ml">ml</option>
                    <option value="pièce">pièce</option>
                    <option value="paquet">paquet</option>
                    <option value="boîte">boîte</option>
                    <option value="sac">sac</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prix total (DH) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={purchaseForm.total}
                    onChange={(e) => setPurchaseForm({...purchaseForm, total: Number(e.target.value)})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fournisseur (optionnel)
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={purchaseForm.supplier || ''}
                    onChange={(e) => setPurchaseForm({...purchaseForm, supplier: e.target.value})}
                    placeholder="Ex: Marché Central, Carrefour..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date d'achat *
                  </label>
                  <input
                                       type="date"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={purchaseForm.date}
                    onChange={(e) => setPurchaseForm({...purchaseForm, date: e.target.value})}
                  />
                </div>
              </div>

              {userProfile?.role === 'super_admin' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Société *
                  </label>
                  <select
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    value={purchaseForm.companyId}
                    onChange={(e) => setPurchaseForm({...purchaseForm, companyId: e.target.value})}
                  >
                    <option value="">Sélectionner une société</option>
                    {companies.map(company => (
                      <option key={company.id} value={company.id}>{company.nom}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Remarque (optionnelle)
                </label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={purchaseForm.note || ''}
                  onChange={(e) => setPurchaseForm({...purchaseForm, note: e.target.value})}
                  placeholder="Notes complémentaires..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t">
                <button
                  type="button"
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  onClick={() => setShowPurchaseModal(false)}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Save size={16} />
                  )}
                  {saving ? 'Sauvegarde...' : (editingItem ? 'Modifier' : 'Ajouter')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal pour ajouter une catégorie */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Nouvelle catégorie</h3>
              <button
                onClick={() => setShowCategoryModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleAddCategory(); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom de la catégorie *
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Ex: Légumes, Fruits, Viandes..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t">
                <button
                  type="button"
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  onClick={() => setShowCategoryModal(false)}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Save size={16} />
                  )}
                  {saving ? 'Sauvegarde...' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default KitchenManagement;