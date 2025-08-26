import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { collection, query, getDocs, where, addDoc, orderBy, deleteDoc, doc, updateDoc, runTransaction, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatDate, calculateLeaveDays } from '../lib/utils';
import { Plus, Calendar, FileText, Clock, CheckCircle, XCircle, User, Building2, Trash2, Award, ChevronDown, ChevronUp, Info, AlertCircle } from 'lucide-react';

export function RequestLeave() {
  const { userProfile } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(null);
  const [formData, setFormData] = useState({
    type: 'annuel',
    date_debut: '',
    date_fin: '',
    motif: '',
  });
  const [soldeConge, setSoldeConge] = useState(0);
  const [expandedLeave, setExpandedLeave] = useState(null);

  useEffect(() => {
    if (userProfile) {
      fetchMyLeaves();
      fetchSoldeConge();
    }
  }, [userProfile]);

  const fetchMyLeaves = async () => {
    if (!userProfile?.uid) return;
    try {
      const q = query(
        collection(db, 'conges'),
        where('employe_id', '==', userProfile.uid),
        orderBy('created_at', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const leavesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLeaves(leavesData);
    } catch (error) {
      console.error('Error fetching leaves:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSoldeConge = async () => {
    if (!userProfile?.uid) return;
    try {
      const q = query(
        collection(db, 'employes'), 
        where('userId', '==', userProfile.uid)
      );
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const employeDoc = querySnapshot.docs[0];
        const employeData = employeDoc.data();
        setSoldeConge(employeData.solde_conge || 0);
      }
    } catch (error) {
      console.error('Error fetching solde conge:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userProfile) return;
    setSubmitting(true);

    try {
      const leaveDays = calculateLeaveDays(formData.date_debut, formData.date_fin);
      
      const q = query(
        collection(db, 'employes'), 
        where('userId', '==', userProfile.uid)
      );
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const employeDoc = querySnapshot.docs[0];
        const employeData = employeDoc.data();
        const currentBalance = employeData.solde_conge || 0;
        
        if (formData.type === 'annuel' && currentBalance < leaveDays) {
          alert('Solde de congé insuffisant');
          setSubmitting(false);
          return;
        }
      }

      const leaveData = {
        employe_id: userProfile.uid,
        nom_employe: userProfile.nom || '',
        prenom_employe: userProfile.prenom || '',
        entreprise: userProfile.entreprise || '',
        type: formData.type,
        date_debut: formData.date_debut,
        date_fin: formData.date_fin,
        statut: 'en_attente',
        motif: formData.motif,
        duree: leaveDays,
        created_at: new Date().toISOString(),
      };
      await addDoc(collection(db, 'conges'), leaveData);

      setShowForm(false);
      setFormData({ type: 'annuel', date_debut: '', date_fin: '', motif: '' });
      fetchMyLeaves();
      fetchSoldeConge();
    } catch (error) {
      console.error('Error submitting leave:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelRequest = async (leaveId, leaveStatus, leaveDays) => {
    if (!window.confirm('Êtes-vous sûr de vouloir annuler cette demande ?')) return;
    
    setCancelling(leaveId);
    try {
      if (leaveStatus === 'accepte') {
        await runTransaction(db, async (transaction) => {
          const q = query(
            collection(db, 'employes'), 
            where('userId', '==', userProfile.uid)
          );
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const employeDoc = querySnapshot.docs[0];
            const employeRef = doc(db, 'employes', employeDoc.id);
            const employeData = await transaction.get(employeRef);
            
            if (employeData.exists()) {
              const currentBalance = employeData.data().solde_conge || 0;
              transaction.update(employeRef, {
                solde_conge: currentBalance + leaveDays
              });
            }
          }
        });
      }
      
      await deleteDoc(doc(db, 'conges', leaveId));
      setLeaves(leaves.filter(leave => leave.id !== leaveId));
      fetchSoldeConge();
    } catch (error) {
      console.error('Erreur lors de l\'annulation:', error);
      alert('Erreur lors de l\'annulation de la demande');
    } finally {
      setCancelling(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'en_attente':
        return <Badge variant="warning" className="flex items-center gap-1"><Clock className="h-3 w-3" />En attente</Badge>;
      case 'accepte':
        return <Badge variant="success" className="flex items-center gap-1"><CheckCircle className="h-3 w-3" />Accepté</Badge>;
      case 'refuse':
        return <Badge variant="destructive" className="flex items-center gap-1"><XCircle className="h-3 w-3" />Refusé</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case 'annuel': return <Badge variant="default" className="bg-blue-100 text-blue-800 hover:bg-blue-200">Congé annuel</Badge>;
      case 'maladie': return <Badge variant="destructive" className="bg-red-100 text-red-800 hover:bg-red-200">Congé maladie</Badge>;
      case 'exceptionnel': return <Badge variant="secondary" className="bg-purple-100 text-purple-800 hover:bg-purple-200">Congé exceptionnel</Badge>;
      default: return <Badge variant="secondary">{type}</Badge>;
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header avec solde de congé amélioré */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Demande de Congé</h1>
          <div className="flex items-center mt-2">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100 shadow-sm">
              <div className="flex items-center">
                <div className="bg-blue-100 p-2 rounded-full mr-3">
                  <Award className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Solde disponible</p>
                  <div className="flex items-baseline">
                    <span className="text-2xl font-bold text-blue-700 mr-1">{soldeConge}</span>
                    <span className="text-gray-500">jours</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <Button 
          onClick={() => setShowForm(true)} 
          disabled={showForm}
          className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-xl shadow-sm hover:shadow-md transition-all"
        >
          <Plus className="h-5 w-5 mr-2" />Nouvelle demande
        </Button>
      </div>

      {/* Formulaire */}
      {showForm && (
        <Card className="border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-blue-900 flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Nouvelle demande de congé
            </CardTitle>
            <div className="flex items-center text-sm text-blue-700 bg-blue-100 px-3 py-2 rounded-lg">
              <Award className="h-4 w-4 mr-1" />
              Solde disponible: <span className="font-semibold ml-1">{soldeConge} jours</span>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type de congé *</label>
                  <select 
                    className="w-full h-12 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    required
                  >
                    <option value="annuel">Congé annuel</option>
                    <option value="maladie">Congé maladie</option>
                    <option value="exceptionnel">Congé exceptionnel</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date de début *</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input 
                      type="date" 
                      required 
                      className="h-12 pl-10" 
                      value={formData.date_debut} 
                      onChange={(e) => setFormData({ ...formData, date_debut: e.target.value })} 
                      min={new Date().toISOString().split('T')[0]} 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date de fin *</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input 
                      type="date" 
                      required 
                      className="h-12 pl-10" 
                      value={formData.date_fin} 
                      onChange={(e) => setFormData({ ...formData, date_fin: e.target.value })} 
                      min={formData.date_debut || new Date().toISOString().split('T')[0]} 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Durée calculée</label>
                  <div className="h-12 px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                    <span className="font-medium text-gray-900">
                      {formData.date_debut && formData.date_fin ? `${calculateLeaveDays(formData.date_debut, formData.date_fin)} jour(s)` : 'Sélectionnez les dates'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Avertissement solde insuffisant */}
              {formData.type === 'annuel' && formData.date_debut && formData.date_fin && 
               calculateLeaveDays(formData.date_debut, formData.date_fin) > soldeConge && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start">
                  <AlertCircle className="h-5 w-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-red-800">Solde insuffisant</div>
                    <p className="text-red-600 text-sm mt-1">
                      Vous demandez {calculateLeaveDays(formData.date_debut, formData.date_fin)} jours 
                      mais votre solde est seulement de {soldeConge} jours.
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Motif de la demande *</label>
                <textarea 
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-colors"
                  rows={4} 
                  required 
                  placeholder="Décrivez le motif de votre demande de congé..." 
                  value={formData.motif} 
                  onChange={(e) => setFormData({ ...formData, motif: e.target.value })} 
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button 
                  type="submit" 
                  disabled={submitting || (formData.type === 'annuel' && formData.date_debut && formData.date_fin && calculateLeaveDays(formData.date_debut, formData.date_fin) > soldeConge)} 
                  className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Soumettre la demande
                    </>
                  )}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => { setShowForm(false); setFormData({ type: 'annuel', date_debut: '', date_fin: '', motif: '' }); }} 
                  className="h-12 px-8 rounded-xl"
                >
                  Annuler
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Mes demandes */}
      <Card className="shadow-sm border-gray-200">
        <CardHeader className="bg-gray-50 rounded-t-lg py-4">
          <CardTitle className="flex items-center gap-2 text-gray-800">
            <FileText className="h-5 w-5" />
            Mes demandes de congé ({leaves.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {leaves.length > 0 ? (
            <div className="space-y-4">
              {leaves.map((leave) => (
                <div key={leave.id} className="border border-gray-200 rounded-xl p-5 hover:shadow-md transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center space-x-3">
                      {getTypeBadge(leave.type)}
                      {getStatusBadge(leave.statut)}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-sm text-gray-500">Demandé le {formatDate(leave.created_at)}</div>
                      {leave.statut === 'en_attente' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancelRequest(leave.id, leave.statut, leave.duree)}
                          disabled={cancelling === leave.id}
                          className="text-red-600 border-red-200 hover:bg-red-50 rounded-lg"
                        >
                          {cancelling === leave.id ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600 mr-1"></div>
                          ) : (
                            <Trash2 className="h-3 w-3 mr-1" />
                          )}
                          Annuler
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-center text-gray-600 mb-1">
                        <User className="h-4 w-4 mr-2" />
                        <span className="text-sm font-medium">Employé</span>
                      </div>
                      <div className="text-md font-semibold text-gray-900">{leave.prenom_employe} {leave.nom_employe}</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-center text-gray-600 mb-1">
                        <Building2 className="h-4 w-4 mr-2" />
                        <span className="text-sm font-medium">Entreprise</span>
                      </div>
                      <div className="text-md font-semibold text-gray-900">{leave.entreprise}</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-center text-gray-600 mb-1">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span className="text-sm font-medium">Période</span>
                      </div>
                      <div className="text-md font-semibold text-gray-900">
                        {formatDate(leave.date_debut)} - {formatDate(leave.date_fin)}
                      </div>
                      <div className="text-sm text-gray-500">{leave.duree} jour(s)</div>
                    </div>
                  </div>

                  <div className="mt-2">
                    <button 
                      onClick={() => setExpandedLeave(expandedLeave === leave.id ? null : leave.id)}
                      className="flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      {expandedLeave === leave.id ? (
                        <>
                          <ChevronUp className="h-4 w-4 mr-1" /> Voir moins de détails
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4 mr-1" /> Voir plus de détails
                        </>
                      )}
                    </button>
                    
                    {expandedLeave === leave.id && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="flex items-start text-gray-600 mb-1">
                          <FileText className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                          <span className="text-sm font-medium">Motif</span>
                        </div>
                        <div className="text-gray-900 pl-6">{leave.motif}</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-xl">
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune demande de congé</h3>
              <p className="text-gray-600 mb-6">Vous n'avez pas encore fait de demande de congé.</p>
              <Button 
                onClick={() => setShowForm(true)} 
                className="bg-blue-600 hover:bg-blue-700 rounded-xl"
              >
                <Plus className="h-4 w-4 mr-2" />
                Faire une demande
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
