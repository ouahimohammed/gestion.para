import React from 'react';
import { Button } from '../components/ui/Button';
import { Plus, Users, Building2, FileText, Settings } from 'lucide-react';

interface QuickActionsProps {
  userRole?: string;
}

export function QuickActions({ userRole }: QuickActionsProps) {
  const getActions = () => {
    switch (userRole) {
      case 'employe':
        return [
          { label: 'Nouvelle demande', icon: Plus, variant: 'default' as const },
        ];
      case 'responsable':
        return [
          { label: 'Ajouter employé', icon: Users, variant: 'outline' as const },
          { label: 'Nouveau congé', icon: Plus, variant: 'default' as const },
        ];
      case 'super_admin':
        return [
          { label: 'Nouvelle entreprise', icon: Building2, variant: 'outline' as const },
          { label: 'Paramètres', icon: Settings, variant: 'outline' as const },
        ];
      default:
        return [];
    }
  };

  const actions = getActions();

  if (actions.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      {actions.map((action, index) => (
        <Button
          key={index}
          variant={action.variant}
          size="sm"
          className="flex items-center gap-2"
        >
          <action.icon className="h-4 w-4" />
          <span className="hidden sm:inline">{action.label}</span>
        </Button>
      ))}
    </div>
  );
}
