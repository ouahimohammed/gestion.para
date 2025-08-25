import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { collection, query, getDocs, where, addDoc, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatDate, calculateLeaveDays } from '../lib/utils';
import { Plus, Calendar, FileText, Clock, CheckCircle, XCircle, User, Building2, Trash2 } from 'lucide-react';

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

  useEffect(() => {
    if (userProfile) fetchMyLeaves();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;
    setSubmitting(true);

    try {
      // 1️⃣ Add leave to Firestore
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
        created_at: new Date().toISOString(),
      };
      await addDoc(collection(db, 'conges'), leaveData);

      // 2️⃣ Send email via Express backend
      // await fetch('http://localhost:5000/send-leave-email', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     prenom: userProfile.prenom,
      //     nom: userProfile.nom,
      //     type: formData.type,
      //     date_debut: formData.date_debut,
      //     date_fin: formData.date_fin,
      //     motif: formData.motif,
      //   }),
      // });

      // 3️⃣ Reset form & refresh leaves
      setShowForm(false);
      setFormData({ type: 'annuel', date_debut: '', date_fin: '', motif: '' });
      fetchMyLeaves();
    } catch (error) {
      console.error('Error submitting leave:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // Fonction pour annuler une demande
  const handleCancelRequest = async (leaveId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir annuler cette demande ?')) return;
    
    setCancelling(leaveId);
    try {
      // Supprimer la demande de Firebase
      await deleteDoc(doc(db, 'conges', leaveId));
      
      // Mettre à jour l'état local
      setLeaves(leaves.filter(leave => leave.id !== leaveId));
      
      console.log('Demande annulée avec succès');
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
      case 'annuel': return <Badge variant="default">Congé annuel</Badge>;
      case 'maladie': return <Badge variant="destructive">Congé maladie</Badge>;
      case 'exceptionnel': return <Badge variant="secondary">Congé exceptionnel</Badge>;
      default: return <Badge variant="secondary">{type}</Badge>;
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Demande de Congé</h1>
        <Button onClick={() => setShowForm(true)} disabled={showForm}><Plus className="h-4 w-4 mr-2" />Nouvelle demande</Button>
      </div>

      {/* Formulaire */}
      {showForm && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader><CardTitle className="text-blue-900">Nouvelle demande de congé</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type de congé *</label>
                  <select className="w-full h-12 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    required>
                    <option value="annuel">Congé annuel</option>
                    <option value="maladie">Congé maladie</option>
                    <option value="exceptionnel">Congé exceptionnel</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date de début *</label>
                  <Input type="date" required className="h-12" value={formData.date_debut} onChange={(e) => setFormData({ ...formData, date_debut: e.target.value })} min={new Date().toISOString().split('T')[0]} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date de fin *</label>
                  <Input type="date" required className="h-12" value={formData.date_fin} onChange={(e) => setFormData({ ...formData, date_fin: e.target.value })} min={formData.date_debut || new Date().toISOString().split('T')[0]} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Durée calculée</label>
                  <div className="h-12 px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                    <span className="font-medium text-gray-900">
                      {formData.date_debut && formData.date_fin ? `${calculateLeaveDays(formData.date_debut, formData.date_fin)} jour(s)` : 'Sélectionnez les dates'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Motif de la demande *</label>
                <textarea className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  rows={4} required placeholder="Décrivez le motif..." value={formData.motif} onChange={(e) => setFormData({ ...formData, motif: e.target.value })} />
              </div>

              <div className="flex space-x-4 pt-4">
                <Button type="submit" disabled={submitting} className="flex-1 h-12">
                  {submitting ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>Envoi en cours...</> : <> <FileText className="h-4 w-4 mr-2" />Soumettre la demande</>}
                </Button>
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setFormData({ type: 'annuel', date_debut: '', date_fin: '', motif: '' }); }} className="h-12 px-8">Annuler</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Mes demandes */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Mes demandes de congé ({leaves.length})</CardTitle></CardHeader>
        <CardContent>
          {leaves.length > 0 ? (
            <div className="space-y-4">
              {leaves.map((leave) => (
                <div key={leave.id} className="border rounded-lg p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center space-x-3">
                      {getTypeBadge(leave.type)}
                      {getStatusBadge(leave.statut)}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-sm text-gray-500">Demandé le {formatDate(leave.created_at)}</div>
                      {/* Bouton d'annulation */}
                      {leave.statut === 'en_attente' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancelRequest(leave.id)}
                          disabled={cancelling === leave.id}
                          className="text-red-600 border-red-300 hover:bg-red-50"
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

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <div className="flex items-center text-gray-600 mb-1"><User className="h-4 w-4 mr-2" /><span className="text-sm font-medium">Employé</span></div>
                      <div className="text-lg font-semibold text-gray-900">{leave.prenom_employe} {leave.nom_employe}</div>
                    </div>
                    <div>
                      <div className="flex items-center text-gray-600 mb-1"><Building2 className="h-4 w-4 mr-2" /><span className="text-sm font-medium">Entreprise</span></div>
                      <div className="text-lg font-semibold text-gray-900">{leave.entreprise}</div>
                    </div>
                    <div>
                      <div className="flex items-center text-gray-600 mb-1"><Calendar className="h-4 w-4 mr-2" /><span className="text-sm font-medium">Période demandée</span></div>
                      <div className="text-lg font-semibold text-gray-900">{formatDate(leave.date_debut)} - {formatDate(leave.date_fin)}</div>
                      <div className="text-sm text-gray-500">{calculateLeaveDays(leave.date_debut, leave.date_fin)} jour(s)</div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center text-gray-600 mb-1"><FileText className="h-4 w-4 mr-2" /><span className="text-sm font-medium">Motif</span></div>
                    <div className="text-gray-900">{leave.motif}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune demande de congé</h3>
              <p className="text-gray-600 mb-6">Vous n'avez pas encore fait de demande de congé.</p>
              <Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-2" />Faire une demande</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
