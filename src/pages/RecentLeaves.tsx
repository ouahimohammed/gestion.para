import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Calendar, User, Building2, Clock, Eye, MoreHorizontal } from 'lucide-react';

interface Leave {
  id: string;
  type: string;
  date_debut: string;
  date_fin: string;
  statut: string;
  entreprise?: string;
  employe_nom?: string;
  motif?: string;
  duree?: number;
}

interface RecentLeavesProps {
  leaves: Leave[];
  userRole?: string;
  loading: boolean;
}

export function RecentLeaves({ leaves, userRole, loading }: RecentLeavesProps) {
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'en_attente': { variant: 'warning' as const, label: 'En attente', icon: Clock },
      'accepte': { variant: 'success' as const, label: 'Accepté', icon: null },
      'refuse': { variant: 'destructive' as const, label: 'Refusé', icon: null },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { 
      variant: 'secondary' as const, 
      label: status, 
      icon: null 
    };

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        {config.icon && <config.icon className="h-3 w-3" />}
        {config.label}
      </Badge>
    );
  };

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const formatOptions: Intl.DateTimeFormatOptions = { 
      day: 'numeric', 
      month: 'short' 
    };
    
    if (start.getFullYear() !== new Date().getFullYear()) {
      formatOptions.year = 'numeric';
    }
    
    return `${start.toLocaleDateString('fr-FR', formatOptions)} - ${end.toLocaleDateString('fr-FR', formatOptions)}`;
  };

  const calculateDuration = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const getTitle = () => {
    switch (userRole) {
      case 'employe':
        return 'Mes demandes récentes';
      case 'responsable':
        return 'Demandes de congés récentes';
      case 'super_admin':
        return 'Activité récente des congés';
      default:
        return 'Congés récents';
    }
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {getTitle()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                    <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                  </div>
                  <div className="h-6 bg-slate-200 rounded w-20"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-600" />
          {getTitle()}
        </CardTitle>
        {leaves.length > 0 && (
          <Button variant="outline" size="sm">
            Voir tout
          </Button>
        )}
      </CardHeader>
      
      <CardContent>
        {leaves.length > 0 ? (
          <div className="space-y-3">
            {leaves.map((leave) => (
              <div 
                key={leave.id} 
                className="group flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:border-slate-300 hover:shadow-sm transition-all duration-200"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium text-slate-900 truncate">
                      {leave.type}
                    </h4>
                    <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                      {calculateDuration(leave.date_debut, leave.date_fin)} jour{calculateDuration(leave.date_debut, leave.date_fin) > 1 ? 's' : ''}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-slate-600">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDateRange(leave.date_debut, leave.date_fin)}
                    </div>
                    
                    {userRole !== 'employe' && leave.employe_nom && (
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span className="truncate max-w-32">{leave.employe_nom}</span>
                      </div>
                    )}
                    
                    {userRole === 'super_admin' && leave.entreprise && (
                      <div className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        <span className="truncate max-w-32">{leave.entreprise}</span>
                      </div>
                    )}
                  </div>
                  
                  {leave.motif && (
                    <p className="text-xs text-slate-500 mt-1 truncate">
                      {leave.motif}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center gap-2 ml-4">
                  {getStatusBadge(leave.statut)}
                  
                  {userRole !== 'employe' && leave.statut === 'en_attente' && (
                    <Button size="sm" variant="outline" className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <Eye className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              {userRole === 'employe' ? 'Aucune demande' : 'Aucune activité'}
            </h3>
            <p className="text-slate-600 mb-4">
              {userRole === 'employe' 
                ? 'Vous n\'avez pas encore fait de demande de congé' 
                : 'Aucune demande de congé récente'
              }
            </p>
            {userRole === 'employe' && (
              <Button>
                Faire une demande
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
