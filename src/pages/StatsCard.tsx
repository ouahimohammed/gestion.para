import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor: string;
  bgColor: string;
  trend?: 'up' | 'down' | 'neutral';
  trendText?: string;
  urgent?: boolean;
}

export function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  iconColor, 
  bgColor, 
  trend = 'neutral', 
  trendText,
  urgent = false 
}: StatsCardProps) {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3" />;
      case 'down':
        return <TrendingDown className="h-3 w-3" />;
      default:
        return <Minus className="h-3 w-3" />;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'text-emerald-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-slate-500';
    }
  };

  return (
    <Card className="relative overflow-hidden border-0 shadow-md hover:shadow-lg transition-all duration-200 group">
      {urgent && (
        <div className="absolute top-2 right-2">
          <AlertTriangle className="h-4 w-4 text-amber-500 animate-pulse" />
        </div>
      )}
      
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">
          {title}
        </CardTitle>
        <div className={`p-2 rounded-lg ${bgColor} group-hover:scale-110 transition-transform duration-200`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="text-2xl font-bold text-slate-900 mb-1">
          {value}
        </div>
        
        {trendText && (
          <div className="flex items-center gap-1">
            <span className={`${getTrendColor()} flex items-center gap-1 text-xs font-medium`}>
              {getTrendIcon()}
            </span>
            <span className="text-xs text-slate-600">{trendText}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
