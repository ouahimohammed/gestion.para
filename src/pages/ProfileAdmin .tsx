import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Alert, AlertDescription } from '../components/ui/Alert';
import { Eye, EyeOff, User, Mail, Building, Shield, Key, Save, Calendar, Clock, Hash, RefreshCw, ShieldCheck, Lock, UserCheck } from 'lucide-react';
import { updatePassword, updateEmail, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { auth } from '../lib/firebase';

export function ProfileAdmin() {
  const { user, userProfile, reloadUserProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // États pour les informations personnelles
  const [personalInfo, setPersonalInfo] = useState({
    nom: '',
    prenom: '',
    email: '',
    entreprise: ''
  });

  // États pour le changement de mot de passe
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Charger les données de l'utilisateur
  useEffect(() => {
    if (userProfile) {
      setPersonalInfo({
        nom: userProfile.nom || '',
        prenom: userProfile.prenom || '',
        email: user?.email || '',
        entreprise: userProfile.entreprise || ''
      });
    }
  }, [userProfile, user]);

  const handlePersonalInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPersonalInfo(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    // Validation
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'Les mots de passe ne correspondent pas.' });
      setLoading(false);
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Le mot de passe doit contenir au moins 6 caractères.' });
      setLoading(false);
      return;
    }

    try {
      // Réauthentifier l'utilisateur avant de changer le mot de passe
      if (user && user.email) {
        const credential = EmailAuthProvider.credential(
          user.email,
          passwordData.currentPassword
        );
        
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, passwordData.newPassword);
        
        setMessage({ type: 'success', text: 'Mot de passe mis à jour avec succès.' });
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (error: any) {
      console.error('Error updating password:', error);
      
      if (error.code === 'auth/wrong-password') {
        setMessage({ type: 'error', text: 'Le mot de passe actuel est incorrect.' });
      } else if (error.code === 'auth/requires-recent-login') {
        setMessage({ type: 'error', text: 'Veuillez vous reconnecter avant de changer votre mot de passe.' });
      } else {
        setMessage({ type: 'error', text: 'Une erreur est survenue lors de la mise à jour du mot de passe.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEmail = async () => {
    if (!user || !personalInfo.email) return;

    setEmailLoading(true);
    setMessage({ type: '', text: '' });

    try {
      await updateEmail(user, personalInfo.email);
      setMessage({ type: 'success', text: 'Email mis à jour avec succès.' });
    } catch (error: any) {
      console.error('Error updating email:', error);
      setMessage({ type: 'error', text: 'Une erreur est survenue lors de la mise à jour de l\'email.' });
    } finally {
      setEmailLoading(false);
    }
  };

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-6">
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-gradient-to-r from-blue-500 to-purple-500 border-t-transparent mx-auto"></div>
          <p className="text-gray-600 mt-4 text-center">Chargement du profil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header with premium styling */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Profil Administrateur
            </h1>
            <p className="text-gray-600 mt-2">Gérez vos informations personnelles et la sécurité de votre compte</p>
          </div>
          <div className="flex items-center space-x-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-2xl shadow-lg">
            <ShieldCheck className="h-6 w-6" />
            <span className="font-semibold">Super Administrateur</span>
          </div>
        </div>

        {message.text && (
          <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className="rounded-2xl border-l-4 border-blue-500">
            <AlertDescription className="flex items-center">
              {message.type === 'success' ? (
                <svg className="w-5 h-5 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5 mr-2 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              )}
              {message.text}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Informations personnelles */}
          <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-3 rounded-2xl shadow-lg">
                  <User className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                    Informations Personnelles
                  </h3>
                  <p className="text-gray-600">Vos informations de profil administrateur</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="prenom" className="text-sm font-semibold text-gray-700">Prénom</Label>
                    <Input
                      id="prenom"
                      name="prenom"
                      value={personalInfo.prenom}
                      onChange={handlePersonalInfoChange}
                      disabled
                      className="rounded-2xl border-gray-200/60 bg-white/80 backdrop-blur-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nom" className="text-sm font-semibold text-gray-700">Nom</Label>
                    <Input
                      id="nom"
                      name="nom"
                      value={personalInfo.nom}
                      onChange={handlePersonalInfoChange}
                      disabled
                      className="rounded-2xl border-gray-200/60 bg-white/80 backdrop-blur-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all h-12"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Mail className="h-4 w-4 text-blue-500" />
                    Email
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={personalInfo.email}
                    onChange={handlePersonalInfoChange}
                    className="rounded-2xl border-gray-200/60 bg-white/80 backdrop-blur-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="entreprise" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Building className="h-4 w-4 text-purple-500" />
                    Entreprise
                  </Label>
                  <Input
                    id="entreprise"
                    name="entreprise"
                    value={personalInfo.entreprise}
                    onChange={handlePersonalInfoChange}
                    disabled
                    className="rounded-2xl border-gray-200/60 bg-white/80 backdrop-blur-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all h-12"
                  />
                </div>

                <Button 
                  onClick={handleUpdateEmail}
                  disabled={emailLoading || personalInfo.email === user?.email}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 border-0 rounded-2xl px-6 py-3 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 h-12"
                >
                  {emailLoading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Save className="h-5 w-5 mr-2" />
                  )}
                  Mettre à jour l'email
                </Button>
              </div>
            </div>
          </div>

          {/* Changement de mot de passe */}
          <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-3 rounded-2xl shadow-lg">
                  <Lock className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                    Sécurité du Compte
                  </h3>
                  <p className="text-gray-600">Mettez à jour votre mot de passe pour sécuriser votre compte</p>
                </div>
              </div>

              <form onSubmit={handleUpdatePassword} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword" className="text-sm font-semibold text-gray-700">Mot de passe actuel</Label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                      <Key className="h-4 w-4 text-gray-500" />
                    </div>
                    <Input
                      id="currentPassword"
                      name="currentPassword"
                      type={showCurrentPassword ? "text" : "password"}
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                      required
                      className="pl-12 rounded-2xl border-gray-200/60 bg-white/80 backdrop-blur-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all h-12"
                      placeholder="Entrez votre mot de passe actuel"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 text-gray-500 hover:text-gray-700"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-sm font-semibold text-gray-700">Nouveau mot de passe</Label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                      <Lock className="h-4 w-4 text-gray-500" />
                    </div>
                    <Input
                      id="newPassword"
                      name="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      required
                      className="pl-12 rounded-2xl border-gray-200/60 bg-white/80 backdrop-blur-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all h-12"
                      placeholder="Entrez votre nouveau mot de passe"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 text-gray-500 hover:text-gray-700"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-semibold text-gray-700">Confirmer le mot de passe</Label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                      <Shield className="h-4 w-4 text-gray-500" />
                    </div>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      required
                      className="pl-12 rounded-2xl border-gray-200/60 bg-white/80 backdrop-blur-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all h-12"
                      placeholder="Confirmez votre nouveau mot de passe"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 text-gray-500 hover:text-gray-700"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 border-0 rounded-2xl px-6 py-3 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 h-12"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Lock className="h-5 w-5 mr-2" />
                  )}
                  Mettre à jour le mot de passe
                </Button>
              </form>
            </div>
          </div>
        </div>

        {/* Informations de compte */}
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-3 rounded-2xl shadow-lg">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                  Informations du Compte
                </h3>
                <p className="text-gray-600">Détails techniques de votre compte administrateur</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-2xl border border-blue-200/50">
                <div className="flex items-center mb-2">
                  <Hash className="h-5 w-5 text-blue-600 mr-2" />
                  <span className="text-sm font-semibold text-blue-700">ID Utilisateur</span>
                </div>
                <p className="text-xs font-mono text-blue-900 bg-blue-200/30 p-2 rounded-lg truncate">{user?.uid}</p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-2xl border border-green-200/50">
                <div className="flex items-center mb-2">
                  <Calendar className="h-5 w-5 text-green-600 mr-2" />
                  <span className="text-sm font-semibold text-green-700">Date de création</span>
                </div>
                <p className="text-sm text-green-900">
                  {user?.metadata.creationTime 
                    ? new Date(user.metadata.creationTime).toLocaleDateString('fr-FR')
                    : 'Non disponible'
                  }
                </p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-2xl border border-purple-200/50">
                <div className="flex items-center mb-2">
                  <Clock className="h-5 w-5 text-purple-600 mr-2" />
                  <span className="text-sm font-semibold text-purple-700">Dernière connexion</span>
                </div>
                <p className="text-sm text-purple-900">
                  {user?.metadata.lastSignInTime 
                    ? new Date(user.metadata.lastSignInTime).toLocaleString('fr-FR')
                    : 'Non disponible'
                  }
                </p>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-2xl border border-orange-200/50">
                <div className="flex items-center mb-2">
                  <UserCheck className="h-5 w-5 text-orange-600 mr-2" />
                  <span className="text-sm font-semibold text-orange-700">Authentification</span>
                </div>
                <p className="text-sm text-orange-900">
                  {user?.providerData[0]?.providerId === 'password' ? 'Email/Mot de passe' : user?.providerData[0]?.providerId}
                </p>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <RefreshCw className="h-4 w-4" />
                  <span>Dernière mise à jour: {new Date().toLocaleString('fr-FR')}</span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.location.reload()}
                  className="rounded-xl border-gray-200/60 bg-white/80 backdrop-blur-sm hover:bg-white transition-all"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Actualiser
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
