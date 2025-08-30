import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { collection, query, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Plus, Edit, Trash2, Building2, X, Search, Filter, Download, Upload } from 'lucide-react';

interface Company {
  id: string;
  nom: string;
  ville: string;
  adresse?: string;
  telephone?: string;
  email?: string;
}

export function Companies() {
  const { userProfile } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    nom: '',
    ville: '',
    adresse: '',
    telephone: '',
    email: '',
  });

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    const filtered = companies.filter(company =>
      company.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.ville.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (company.adresse && company.adresse.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (company.telephone && company.telephone.includes(searchTerm)) ||
      (company.email && company.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredCompanies(filtered);
  }, [searchTerm, companies]);

  const fetchCompanies = async () => {
    try {
      const q = query(collection(db, 'entreprises'));
      const querySnapshot = await getDocs(q);
      const companiesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Company));

      setCompanies(companiesData);
      setFilteredCompanies(companiesData);
    } catch (error) {
      console.error('Error fetching companies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCompany) {
        await updateDoc(doc(db, 'entreprises', editingCompany.id), formData);
      } else {
        await addDoc(collection(db, 'entreprises'), formData);
      }
      
      setShowForm(false);
      setEditingCompany(null);
      setFormData({
        nom: '',
        ville: '',
        adresse: '',
        telephone: '',
        email: '',
      });
      
      fetchCompanies();
    } catch (error) {
      console.error('Error saving company:', error);
    }
  };

  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    setFormData({
      nom: company.nom,
      ville: company.ville,
      adresse: company.adresse || '',
      telephone: company.telephone || '',
      email: company.email || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette entreprise ?')) {
      try {
        await deleteDoc(doc(db, 'entreprises', id));
        fetchCompanies();
      } catch (error) {
        console.error('Error deleting company:', error);
      }
    }
  };

  const exportToCSV = () => {
    const headers = ['Nom', 'Ville', 'Adresse', 'Téléphone', 'Email'];
    const csvData = filteredCompanies.map(company => [
      company.nom,
      company.ville,
      company.adresse || '',
      company.telephone || '',
      company.email || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `entreprises-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-6">
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-gradient-to-r from-blue-500 to-purple-500 border-t-transparent mx-auto"></div>
          <p className="text-gray-600 mt-4 text-center">Chargement des entreprises...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header with premium styling */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Gestion des Entreprises
            </h1>
            <p className="text-gray-600 mt-2">Administrez le répertoire de vos entreprises partenaires</p>
          </div>
          <Button 
            onClick={() => setShowForm(true)} 
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 border-0 rounded-2xl px-6 py-3 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
          >
            <Plus className="h-5 w-5 mr-2" />
            Nouvelle Entreprise
          </Button>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300 p-6">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1">
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-gradient-to-br from-blue-500 to-indigo-600 p-2 rounded-xl">
                <Search className="h-4 w-4 text-white" />
              </div>
              <Input
                placeholder="Rechercher une entreprise..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-16 h-12 rounded-2xl border-gray-200/60 bg-white/80 backdrop-blur-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all"
              />
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="rounded-2xl border-gray-200/60 bg-white/80 backdrop-blur-sm hover:bg-white transition-all"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtres
              </Button>
              
              <Button 
                onClick={exportToCSV}
                variant="outline" 
                className="rounded-2xl border-gray-200/60 bg-white/80 backdrop-blur-sm hover:bg-white transition-all"
              >
                <Download className="h-4 w-4 mr-2" />
                Exporter
              </Button>
            </div>
          </div>
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-3 rounded-2xl shadow-lg">
                    <Building2 className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                    {editingCompany ? 'Modifier l\'entreprise' : 'Nouvelle entreprise'}
                  </h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowForm(false);
                    setEditingCompany(null);
                    setFormData({ nom: '', ville: '', adresse: '', telephone: '', email: '' });
                  }}
                  className="rounded-xl hover:bg-gray-100/80 backdrop-blur-sm"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold mb-3 text-gray-700">Nom de l'entreprise *</label>
                    <Input
                      required
                      value={formData.nom}
                      onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                      className="rounded-2xl border-gray-200/60 bg-white/80 backdrop-blur-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all h-12"
                      placeholder="Entrez le nom de l'entreprise"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold mb-3 text-gray-700">Ville *</label>
                    <Input
                      required
                      value={formData.ville}
                      onChange={(e) => setFormData({ ...formData, ville: e.target.value })}
                      className="rounded-2xl border-gray-200/60 bg-white/80 backdrop-blur-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all h-12"
                      placeholder="Entrez la ville"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-3 text-gray-700">Adresse</label>
                    <Input
                      value={formData.adresse}
                      onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                      className="rounded-2xl border-gray-200/60 bg-white/80 backdrop-blur-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all h-12"
                      placeholder="Entrez l'adresse complète"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-3 text-gray-700">Téléphone</label>
                    <Input
                      value={formData.telephone}
                      onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                      className="rounded-2xl border-gray-200/60 bg-white/80 backdrop-blur-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all h-12"
                      placeholder="Entrez le numéro de téléphone"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold mb-3 text-gray-700">Email</label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="rounded-2xl border-gray-200/60 bg-white/80 backdrop-blur-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all h-12"
                      placeholder="Entrez l'adresse email"
                    />
                  </div>
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <Button 
                    type="submit"
                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 border-0 rounded-2xl px-6 py-3 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                  >
                    {editingCompany ? 'Modifier l\'entreprise' : 'Ajouter l\'entreprise'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowForm(false);
                      setEditingCompany(null);
                      setFormData({ nom: '', ville: '', adresse: '', telephone: '', email: '' });
                    }}
                    className="rounded-2xl border-gray-200/60 bg-white/80 backdrop-blur-sm hover:bg-white transition-all"
                  >
                    Annuler
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Companies List */}
        {filteredCompanies.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCompanies.map((company) => (
              <div 
                key={company.id} 
                className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/20 shadow-xl hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-300 overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-3 rounded-2xl shadow-lg">
                      <Building2 className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex space-x-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(company)}
                        className="rounded-xl hover:bg-blue-50/50 text-blue-600 transition-all"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(company.id)}
                        className="rounded-xl hover:bg-red-50/50 text-red-600 transition-all"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-1">{company.nom}</h3>
                      <div className="flex items-center gap-2 text-gray-600">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-sm">{company.ville}</span>
                      </div>
                    </div>
                    
                    {(company.adresse || company.telephone || company.email) && (
                      <div className="pt-4 border-t border-gray-100/50 space-y-3">
                        {company.adresse && (
                          <div className="flex items-start gap-2 text-sm text-gray-600">
                            <svg className="h-4 w-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                            <span className="flex-1">{company.adresse}</span>
                          </div>
                        )}
                        
                        {company.telephone && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            <span>{company.telephone}</span>
                          </div>
                        )}
                        
                        {company.email && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <span>{company.email}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden">
            <div className="text-center py-16 px-6">
              <div className="bg-gradient-to-br from-blue-100 to-purple-100 p-6 rounded-3xl inline-block mb-6">
                <Building2 className="h-16 w-16 text-blue-600 mx-auto" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Aucune entreprise trouvée</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                {searchTerm ? 
                  `Aucune entreprise ne correspond à votre recherche "${searchTerm}"` : 
                  "Commencez par ajouter votre première entreprise à votre répertoire."
                }
              </p>
              {!searchTerm && (
                <Button 
                  onClick={() => setShowForm(true)}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 border-0 rounded-2xl px-6 py-3 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Ajouter une entreprise
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Statistics Card */}
        {companies.length > 0 && (
          <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300 p-6">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-3 rounded-2xl shadow-lg">
                  <Building2 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Votre répertoire d'entreprises</h3>
                  <p className="text-gray-600">{companies.length} entreprise(s) au total</p>
                </div>
              </div>
              
              <Button 
                onClick={exportToCSV}
                variant="outline" 
                className="rounded-2xl border-gray-200/60 bg-white/80 backdrop-blur-sm hover:bg-white transition-all mt-4 md:mt-0"
              >
                <Download className="h-4 w-4 mr-2" />
                Exporter en CSV
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
