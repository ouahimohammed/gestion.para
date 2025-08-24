import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import { Download, FileText, BarChart3, Filter, Calendar, Building, FileDown } from 'lucide-react';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { LineChart, Line } from 'recharts';

interface ReportData {
  leaves: any[];
  employees: any[];
  companies: any[];
}

 interface Leave {
  id: string;
  type: string;
  entreprise: string;
  date_debut: string;
  date_fin: string;
  statut: string;
  motif: string;
  nom_employe: string;  // Corrigé: employe avec "é"
  prenom_employe: string;  // Corrigé: employe avec "é"
  employe_id: string;
  created_at: string;
  updated_at?: string;
}
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316', '#06B6D4', '#84CC16'];

export function Reports() {
  const { userProfile } = useAuth();
  const [reportData, setReportData] = useState<ReportData>({
    leaves: [],
    employees: [],
    companies: [],
  });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    company: '',
    leaveType: '',
  });
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (userProfile) {
      fetchReportData();
    }
  }, [userProfile]);

  const fetchReportData = async () => {
  try {
    const data: ReportData = { leaves: [], employees: [], companies: [] };

    // Fetch leaves
    let leavesQuery;
    if (userProfile?.role === 'super_admin') {
      leavesQuery = query(collection(db, 'conges'));
    } else if (userProfile?.role === 'responsable' && userProfile.entreprise) {
      leavesQuery = query(
        collection(db, 'conges'),
        where('entreprise', '==', userProfile.entreprise)
      );
    } else {
      setLoading(false);
      return;
    }

    const leavesSnapshot = await getDocs(leavesQuery);
    const leavesData = leavesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Les données contiennent déjà nom_employe et prenom_employe, pas besoin d'enrichir
    data.leaves = leavesData;

    // Fetch companies (only for super admin)
    if (userProfile?.role === 'super_admin') {
      const companiesQuery = query(collection(db, 'entreprises'));
      const companiesSnapshot = await getDocs(companiesQuery);
      data.companies = companiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    setReportData(data);
  } catch (error) {
    console.error('Error fetching report data:', error);
  } finally {
    setLoading(false);
  }
};

  const getFilteredLeaves = (): Leave[] => {
  let filtered = reportData.leaves as Leave[]; // Assurez le typage

  if (filters.startDate) {
    filtered = filtered.filter(leave => leave.date_debut >= filters.startDate);
  }
  if (filters.endDate) {
    filtered = filtered.filter(leave => leave.date_fin <= filters.endDate);
  }
  if (filters.company) {
    filtered = filtered.filter(leave => leave.entreprise === filters.company);
  }
  if (filters.leaveType) {
    filtered = filtered.filter(leave => leave.type === filters.leaveType);
  }

  return filtered;
};

  const getLeavesByType = () => {
    const filtered = getFilteredLeaves();
    const typeCount = filtered.reduce((acc, leave) => {
      acc[leave.type] = (acc[leave.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(typeCount).map(([type, count]) => ({
      name: type === 'annuel' ? 'Congé annuel' : type === 'maladie' ? 'Congé maladie' : 'Congé exceptionnel',
      value: count,
      count: count
    }));
  };

  const getLeavesByStatus = () => {
    const filtered = getFilteredLeaves();
    const statusCount = filtered.reduce((acc, leave) => {
      acc[leave.statut] = (acc[leave.statut] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(statusCount).map(([status, count]) => ({
      name: status === 'en_attente' ? 'En attente' : status === 'accepte' ? 'Accepté' : 'Refusé',
      value: count,
      count: count
    }));
  };

  const getLeavesByCompany = () => {
    const filtered = getFilteredLeaves();
    const companyCount = filtered.reduce((acc, leave) => {
      acc[leave.entreprise] = (acc[leave.entreprise] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(companyCount).map(([company, count]) => ({
      name: company,
      value: count,
      count: count
    }));
  };

  const getMonthlyLeaves = () => {
    const filtered = getFilteredLeaves();
    const monthlyData: { [key: string]: number } = {};
    
    filtered.forEach(leave => {
      const month = leave.date_debut.substring(0, 7); // YYYY-MM format
      monthlyData[month] = (monthlyData[month] || 0) + 1;
    });

    return Object.entries(monthlyData).map(([month, count]) => ({
      name: month,
      value: count,
      count: count
    })).sort((a, b) => a.name.localeCompare(b.name));
  };

   const exportToExcel = () => {
  const filtered = getFilteredLeaves();
  const ws = XLSX.utils.json_to_sheet(filtered.map(leave => ({
    'Employé': `${leave.prenom_employe} ${leave.nom_employe}`,  // Corrigé ici
    'Type': leave.type === 'annuel' ? 'Congé annuel' : leave.type === 'maladie' ? 'Congé maladie' : 'Congé exceptionnel',
    'Entreprise': leave.entreprise,
    'Date début': leave.date_debut,
    'Date fin': leave.date_fin,
    'Statut': leave.statut === 'en_attente' ? 'En attente' : leave.statut === 'accepte' ? 'Accepté' : 'Refusé',
    'Motif': leave.motif,
  })));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Congés');

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(data, `rapport-conges-${new Date().toISOString().split('T')[0]}.xlsx`);
};

  const exportToPDF = () => {
  const filtered = getFilteredLeaves();
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(20);
  doc.text('Rapport des Congés', 14, 22);
  doc.setFontSize(12);
  doc.text(`Généré le: ${new Date().toLocaleDateString('fr-FR')}`, 14, 30);
  
  // Summary statistics
  doc.setFontSize(14);
  doc.text('Résumé', 14, 45);
  doc.setFontSize(10);
  
  let yPosition = 55;
  doc.text(`Total des congés: ${filtered.length}`, 14, yPosition);
  yPosition += 8;
  doc.text(`Congés approuvés: ${filtered.filter(l => l.statut === 'accepte').length}`, 14, yPosition);
  yPosition += 8;
  doc.text(`En attente: ${filtered.filter(l => l.statut === 'en_attente').length}`, 14, yPosition);
  yPosition += 8;
  doc.text(`Refusés: ${filtered.filter(l => l.statut === 'refuse').length}`, 14, yPosition);
  
  // Table data - CORRIGÉ ICI
  const tableData = filtered.map(leave => [
    `${leave.prenom_employe} ${leave.nom_employe}`,  // Corrigé ici
    leave.type === 'annuel' ? 'Congé annuel' : leave.type === 'maladie' ? 'Congé maladie' : 'Congé exceptionnel',
    leave.entreprise,
    new Date(leave.date_debut).toLocaleDateString('fr-FR'),
    new Date(leave.date_fin).toLocaleDateString('fr-FR'),
    leave.statut === 'en_attente' ? 'En attente' : leave.statut === 'accepte' ? 'Accepté' : 'Refusé'
  ]);
  
  // Add new page for table if needed
  if (yPosition + 100 > doc.internal.pageSize.height) {
    doc.addPage();
    yPosition = 20;
  }
  
  // Create table
  autoTable(doc, {
    startY: yPosition + 10,
    head: [['Employé', 'Type', 'Entreprise', 'Début', 'Fin', 'Statut']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: 255
    },
    styles: {
      fontSize: 8,
      cellPadding: 2
    }
  });

  // Save PDF
  doc.save(`rapport-conges-${new Date().toISOString().split('T')[0]}.pdf`);
};

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const filteredLeaves = getFilteredLeaves();
  const leavesByType = getLeavesByType();
  const leavesByStatus = getLeavesByStatus();
  const leavesByCompany = getLeavesByCompany();
  const monthlyLeaves = getMonthlyLeaves();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Rapports et Statistiques</h1>
        <div className="flex space-x-2">
          <Button onClick={exportToExcel} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Excel
          </Button>
          <Button onClick={exportToPDF} variant="outline" className="gap-2">
            <FileDown className="h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtres
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setFilters({ startDate: '', endDate: '', company: '', leaveType: '' })}
            >
              Réinitialiser
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Date début</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Date fin</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Type de congé</label>
              <select
                className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={filters.leaveType}
                onChange={(e) => setFilters({ ...filters, leaveType: e.target.value })}
              >
                <option value="">Tous les types</option>
                <option value="annuel">Congé annuel</option>
                <option value="maladie">Congé maladie</option>
                <option value="exceptionnel">Congé exceptionnel</option>
              </select>
            </div>
            
            {userProfile?.role === 'super_admin' && (
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Entreprise</label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <select
                    className="w-full h-10 px-3 pl-10 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={filters.company}
                    onChange={(e) => setFilters({ ...filters, company: e.target.value })}
                  >
                    <option value="">Toutes les entreprises</option>
                    {reportData.companies.map(company => (
                      <option key={company.id} value={company.nom}>
                        {company.nom}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-800">Total Congés</CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">{filteredLeaves.length}</div>
            <p className="text-xs text-blue-600 mt-1">Période sélectionnée</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-800">Congés Approuvés</CardTitle>
            <BarChart3 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">
              {filteredLeaves.filter(l => l.statut === 'accepte').length}
            </div>
            <p className="text-xs text-green-600 mt-1">
              {filteredLeaves.length > 0 ? Math.round((filteredLeaves.filter(l => l.statut === 'accepte').length / filteredLeaves.length) * 100) : 0}% du total
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-amber-800">En Attente</CardTitle>
            <BarChart3 className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-900">
              {filteredLeaves.filter(l => l.statut === 'en_attente').length}
            </div>
            <p className="text-xs text-amber-600 mt-1">
              {filteredLeaves.length > 0 ? Math.round((filteredLeaves.filter(l => l.statut === 'en_attente').length / filteredLeaves.length) * 100) : 0}% du total
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-800">Congés Refusés</CardTitle>
            <BarChart3 className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-900">
              {filteredLeaves.filter(l => l.statut === 'refuse').length}
            </div>
            <p className="text-xs text-red-600 mt-1">
              {filteredLeaves.length > 0 ? Math.round((filteredLeaves.filter(l => l.statut === 'refuse').length / filteredLeaves.length) * 100) : 0}% du total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Aperçu
          </button>
          <button
            onClick={() => setActiveTab('details')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'details'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Détails
          </button>
        </nav>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Répartition par type de congé</CardTitle>
          </CardHeader>
          <CardContent>
            {leavesByType.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={leavesByType}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {leavesByType.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} congés`, 'Nombre']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">Aucune donnée disponible</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Statut des demandes</CardTitle>
          </CardHeader>
          <CardContent>
            {leavesByStatus.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={leavesByStatus}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${value} congés`, 'Nombre']} />
                    <Legend />
                    <Bar dataKey="count" fill="#3B82F6" name="Nombre de congés" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">Aucune donnée disponible</div>
            )}
          </CardContent>
        </Card>

        {userProfile?.role === 'super_admin' && leavesByCompany.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Congés par entreprise</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={leavesByCompany}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${value} congés`, 'Nombre']} />
                    <Legend />
                    <Bar dataKey="count" fill="#10B981" name="Nombre de congés" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {monthlyLeaves.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Évolution mensuelle des congés</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyLeaves}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${value} congés`, 'Nombre']} />
                    <Legend />
                    <Line type="monotone" dataKey="count" stroke="#F59E0B" name="Congés par mois" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Data Table */}
      {activeTab === 'details' && (
        <Card>
          <CardHeader>
            <CardTitle>Détails des congés ({filteredLeaves.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredLeaves.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Employé
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      {userProfile?.role === 'super_admin' && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Entreprise
                        </th>
                      )}
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Période
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Statut
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Motif
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredLeaves.map((leave) => (
                      <tr key={leave.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
  <div className="text-sm font-medium text-gray-900">
    {leave.prenom_employe} {leave.nom_employe}  {/* Corrigé ici */}
  </div>
</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {leave.type === 'annuel' ? 'Congé annuel' : leave.type === 'maladie' ? 'Congé maladie' : 'Congé exceptionnel'}
                        </td>
                        {userProfile?.role === 'super_admin' && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {leave.entreprise}
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(leave.date_debut).toLocaleDateString('fr-FR')} - {new Date(leave.date_fin).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            leave.statut === 'accepte' 
                              ? 'bg-green-100 text-green-800'
                              : leave.statut === 'en_attente'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {leave.statut === 'en_attente' ? 'En attente' : leave.statut === 'accepte' ? 'Accepté' : 'Refusé'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                          {leave.motif}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">Aucun congé trouvé avec les filtres actuels</div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}