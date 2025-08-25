import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Plus, Users, Building2, FileText, Settings } from 'lucide-react';

interface QuickActionsProps {
  userRole?: string;
}

export function QuickActions({ userRole }: QuickActionsProps) {
  const navigate = useNavigate();

  const handleActionClick = (actionType: string) => {
    switch (actionType) {
      case 'new-request':
        navigate('/request-leave');
        break;
      case 'add-employee':
        navigate('/employees');
        break;
      case 'new-company':
        navigate('/companies');
        break;
      default:
        break;
    }
  };

  const getActions = () => {
    switch (userRole) {
      case 'employe':
        return [
          { 
            label: 'Nouvelle demande', 
            icon: Plus, 
            variant: 'default' as const,
            action: 'new-request'
          },
        ];
      case 'responsable':
        return [
          { 
            label: 'Ajouter employé', 
            icon: Plus, 
            variant: 'default' as const,
            action: 'add-employee'
          },
        ];
      case 'super_admin':
        return [
          { 
            label: 'Nouvelle entreprise', 
            icon: Building2, 
            variant: 'outline' as const,
            action: 'new-company'
          },
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
          onClick={() => handleActionClick(action.action)}
        >
          <action.icon className="h-4 w-4" />
          <span className="hidden sm:inline">{action.label}</span>
        </Button>
      ))}
    </div>
  );
}
