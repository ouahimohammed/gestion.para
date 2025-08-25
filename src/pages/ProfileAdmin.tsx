import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Alert, AlertDescription } from '../components/ui/Alert';
import { Eye, EyeOff, User, Mail, Building, Shield, Key, Save } from 'lucide-react';
import { updatePassword, updateEmail, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { auth } from '../lib/firebase';

export function ProfileAdmin() {
  const { user, userProfile, reloadUserProfile } = useAuth();
  const [loading, setLoading] = useState(false);
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

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      await updateEmail(user, personalInfo.email);
      setMessage({ type: 'success', text: 'Email mis à jour avec succès.' });
    } catch (error: any) {
      console.error('Error updating email:', error);
      setMessage({ type: 'error', text: 'Une erreur est survenue lors de la mise à jour de l\'email.' });
    } finally {
      setLoading(false);
    }
  };

  if (!userProfile) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Profil Administrateur</h1>
        <div className="flex items-center space-x-2 text-blue-600">
          <Shield className="h-6 w-6" />
          <span className="font-medium">Super Administrateur</span>
        </div>
      </div>

      {message.text && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Informations personnelles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informations Personnelles
            </CardTitle>
            <CardDescription>
              Vos informations de profil administrateur
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prenom">Prénom</Label>
                <Input
                  id="prenom"
                  name="prenom"
                  value={personalInfo.prenom}
                  onChange={handlePersonalInfoChange}
                  disabled
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nom">Nom</Label>
                <Input
                  id="nom"
                  name="nom"
                  value={personalInfo.nom}
                  onChange={handlePersonalInfoChange}
                  disabled
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={personalInfo.email}
                onChange={handlePersonalInfoChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="entreprise" className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                Entreprise
              </Label>
              <Input
                id="entreprise"
                name="entreprise"
                value={personalInfo.entreprise}
                onChange={handlePersonalInfoChange}
                disabled
              />
            </div>

            <Button 
              onClick={handleUpdateEmail}
              disabled={loading || personalInfo.email === user?.email}
              className="w-full"
            >
              <Save className="h-4 w-4 mr-2" />
              Mettre à jour l'email
            </Button>
          </CardContent>
        </Card>

        {/* Changement de mot de passe */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Changer le Mot de Passe
            </CardTitle>
            <CardDescription>
              Mettez à jour votre mot de passe pour sécuriser votre compte
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Mot de passe actuel</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    name="currentPassword"
                    type={showCurrentPassword ? "text" : "password"}
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    name="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmer le nouveau mot de passe</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={loading} 
                className="w-full"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Key className="h-4 w-4 mr-2" />
                )}
                Mettre à jour le mot de passe
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Informations de compte */}
      <Card>
        <CardHeader>
          <CardTitle>Informations du Compte</CardTitle>
          <CardDescription>
            Détails techniques de votre compte administrateur
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-gray-500">ID Utilisateur</Label>
              <p className="text-sm font-mono bg-gray-100 p-2 rounded-md">{user?.uid}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-500">Dernière connexion</Label>
              <p className="text-sm">
                {user?.metadata.lastSignInTime 
                  ? new Date(user.metadata.lastSignInTime).toLocaleString('fr-FR')
                  : 'Non disponible'
                }
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-500">Date de création du compte</Label>
              <p className="text-sm">
                {user?.metadata.creationTime 
                  ? new Date(user.metadata.creationTime).toLocaleString('fr-FR')
                  : 'Non disponible'
                }
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-500">Fournisseur d'authentification</Label>
              <p className="text-sm">
                {user?.providerData[0]?.providerId === 'password' ? 'Email/Mot de passe' : user?.providerData[0]?.providerId}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
