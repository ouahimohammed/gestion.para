import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Eye, EyeOff, Mail, Lock, Shield, User, Building, Loader2, ArrowRight, Sparkles, CheckCircle, Users, BarChart3, Calendar, Rocket, Crown, Target, Zap, Globe, Cloud, FileText, Bell, TrendingUp } from 'lucide-react';
import { useToast } from '../components/ui/use-toast';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [error, setError] = useState('');
  const [isHovered, setIsHovered] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [showPresentation, setShowPresentation] = useState(true);

  const { user, userProfile, loading, signIn } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (userProfile) {
      console.log("UserProfile détecté, redirection vers /dashboard");
    }
  }, [userProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingSubmit(true);
    setError('');

    // Validation basique
    if (!email || !password) {
      setError('Veuillez remplir tous les champs');
      setLoadingSubmit(false);
      return;
    }

    try {
      await signIn(email, password);
      toast({
        title: "Connexion réussie",
        description: `Bienvenue dans SGRH-Holding !`,
      });
    } catch (err: any) {
      console.error("Erreur de connexion:", err);
      const errorMessage = err.message || 'Email ou mot de passe incorrect';
      setError(errorMessage);
      toast({
        title: "Erreur de connexion",
        description: errorMessage,
        variant: "destructive",
      });
      setLoadingSubmit(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin h-16 w-16 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto mb-4"></div>
            <div className="absolute inset-0 h-16 w-16 border-4 border-transparent border-t-indigo-400 rounded-full mx-auto animate-ping"></div>
          </div>
          <p className="text-slate-600 font-medium">Chargement de votre espace...</p>
        </div>
      </div>
    );
  }

  if (user && userProfile) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-indigo-600/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-purple-400/20 to-pink-600/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-cyan-400/10 to-blue-600/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-screen py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-6xl flex flex-col lg:flex-row gap-12 items-center">
          {/* Left side - Enhanced Welcome Section */}
          <div className="w-full lg:w-1/2 text-center lg:text-left space-y-8">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full border border-blue-200/50 shadow-sm">
                <Rocket className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">SGRH-Holding • Plateforme RH nouvelle génération</span>
              </div>
              
              <h1 className="text-4xl lg:text-6xl font-bold text-slate-900 leading-tight">
                Bienvenue sur{' '}
                <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  SGRH-Holding
                </span>
              </h1>
              
              <p className="text-xl lg:text-2xl text-slate-600 leading-relaxed">
                Système de Gestion des Ressources Humaines pour Soft Medical Holding
              </p>
            </div>
            
            {/* Presentation Card */}
          
            {/* Features showcase */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
              <FeatureCard 
                icon={<Target className="h-6 w-6" />}
                title="Gestion Multi-Sociétés"
                description="Medical, Alougoum, Paramedic - Administration centralisée"
                color="blue"
              />
              <FeatureCard 
                icon={<TrendingUp className="h-6 w-6" />}
                title="Workflows Intelligents"
                description="Demandes de congés avec validation hiérarchique"
                color="indigo"
              />
              <FeatureCard 
                icon={<BarChart3 className="h-6 w-6" />}
                title="Analyses Avancées"
                description="Tableaux de bord et rapports détaillés"
                color="purple"
              />
              <FeatureCard 
                icon={<FileText className="h-6 w-6" />}
                title="Export PDF/Excel"
                description="Rapports RH et gestion des dépenses"
                color="blue"
              />
              <FeatureCard 
                icon={<Bell className="h-6 w-6" />}
                title="Notifications Temps Réel"
                description="Alertes FCM pour demandes et approbations"
                color="indigo"
              />
              <FeatureCard 
                icon={<Globe className="h-6 w-6" />}
                title="Accès Différencié"
                description="Super Admin, Responsable, Employé"
                color="purple"
              />
            </div>

            {/* Technologies showcase */}
             
          </div>

          {/* Right side - Enhanced Login Form */}
          <div className="w-full lg:w-1/2 max-w-md mx-auto">
            <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-sm">
              <CardHeader className="text-center pb-6 pt-8">
                <div className="mx-auto w-20 h-20 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                  <Shield className="h-10 w-10 text-white" />
                </div>
                <CardTitle className="text-3xl font-bold text-slate-900 mb-2">
                  Connexion
                </CardTitle>
                <p className="text-slate-600">
                  Accédez à votre espace de travail
                </p>
              </CardHeader>
              
              <CardContent className="px-8 pb-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-semibold text-slate-700">
                      Adresse email
                    </Label>
                    <div className="relative group">
                      <Mail className={`absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 transition-colors duration-200 ${
                        focusedField === 'email' ? 'text-blue-600' : 'text-slate-400'
                      }`} />
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onFocus={() => setFocusedField('email')}
                        onBlur={() => setFocusedField(null)}
                        required
                        className={`pl-12 h-14 text-lg border-2 transition-all duration-200 rounded-xl ${
                          focusedField === 'email' 
                            ? 'border-blue-500 ring-4 ring-blue-100' 
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                        placeholder="votre@email.com"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-semibold text-slate-700">
                      Mot de passe
                    </Label>
                    <div className="relative group">
                      <Lock className={`absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 transition-colors duration-200 ${
                        focusedField === 'password' ? 'text-blue-600' : 'text-slate-400'
                      }`} />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onFocus={() => setFocusedField('password')}
                        onBlur={() => setFocusedField(null)}
                        required
                        className={`pl-12 pr-12 h-14 text-lg border-2 transition-all duration-200 rounded-xl ${
                          focusedField === 'password' 
                            ? 'border-blue-500 ring-4 ring-blue-100' 
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                        placeholder="Votre mot de passe"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors duration-200"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-50 border-2 border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-2 duration-300">
                      <AlertCircle className="h-5 w-5 flex-shrink-0" />
                      <span className="font-medium">{error}</span>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl rounded-xl group"
                    disabled={loadingSubmit}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                  >
                    {loadingSubmit ? (
                      <>
                        <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                        Connexion en cours...
                      </>
                    ) : (
                      <>
                        <Shield className="mr-3 h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
                        Se connecter
                        <ArrowRight className="ml-3 h-5 w-5 transition-transform duration-200 group-hover:translate-x-1" />
                      </>
                    )}
                  </Button>
                </form>
                
                <div className="mt-6 p-4 bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl border border-slate-200/50">
                  <p className="text-sm text-slate-600 text-center">
                    <strong>Développé  par :</strong> Mohamed Ouahi
                    <br />
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// Enhanced Feature Card Component
function FeatureCard({ icon, title, description, color }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: 'blue' | 'indigo' | 'purple';
}) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600 text-blue-600',
    indigo: 'from-indigo-500 to-indigo-600 text-indigo-600',
    purple: 'from-purple-500 to-purple-600 text-purple-600'
  };

  return (
    <div className="flex items-center gap-4 p-4 bg-white/80 backdrop-blur-sm rounded-2xl border border-white/50 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02]">
      <div className={`w-12 h-12 bg-gradient-to-r ${colorClasses[color]} rounded-xl flex items-center justify-center text-white shadow-lg`}>
        {icon}
      </div>
      <div>
        <h3 className="font-semibold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-600">{description}</p>
      </div>
    </div>
  );
}

// Tech Pill Component
function TechPill({ icon, name }: { icon: string; name: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-slate-200/70 shadow-xs">
      <span className="text-sm">{icon}</span>
      <span className="text-xs font-medium text-slate-700">{name}</span>
    </div>
  );
}

// Enhanced Label Component
function Label({ htmlFor, children, className }: { htmlFor: string; children: React.ReactNode; className?: string }) {
  return (
    <label htmlFor={htmlFor} className={`block text-sm font-medium text-slate-700 ${className}`}>
      {children}
    </label>
  );
}

// Enhanced AlertCircle Component
function AlertCircle({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

export default Login;
