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
import { Download, FileText, BarChart3, XCircle, User, CheckCircle, Filter, Calendar, Building, FileDown, Users, Clock, Award, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
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
  nom_employe: string;
  prenom_employe: string;
  employe_id: string;
  created_at: string;
  updated_at?: string;
}

interface Employee {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  entreprise: string;
  solde_conge: number;
  userId: string;
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
  const [expandedEmployees, setExpandedEmployees] = useState<Set<string>>(new Set());

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
      data.leaves = leavesData;

      // Fetch employees with leave balance
      let employeesQuery;
      if (userProfile?.role === 'super_admin') {
        employeesQuery = query(collection(db, 'employes'));
      } else if (userProfile?.role === 'responsable' && userProfile.entreprise) {
        employeesQuery = query(
          collection(db, 'employes'),
          where('entreprise', '==', userProfile.entreprise)
        );
      }

      if (employeesQuery) {
        const employeesSnapshot = await getDocs(employeesQuery);
        const employeesData = employeesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Employee[];
        data.employees = employeesData;
      }

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

  const toggleEmployeeExpansion = (employeeId: string) => {
    const newExpanded = new Set(expandedEmployees);
    if (newExpanded.has(employeeId)) {
      newExpanded.delete(employeeId);
    } else {
      newExpanded.add(employeeId);
    }
    setExpandedEmployees(newExpanded);
  };

  const getFilteredLeaves = (): Leave[] => {
    let filtered = reportData.leaves as Leave[];

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

  const getFilteredEmployees = (): Employee[] => {
    let filtered = reportData.employees as Employee[];

    if (filters.company) {
      filtered = filtered.filter(employee => employee.entreprise === filters.company);
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
      const month = leave.date_debut.substring(0, 7);
      monthlyData[month] = (monthlyData[month] || 0) + 1;
    });

    return Object.entries(monthlyData).map(([month, count]) => ({
      name: month,
      value: count,
      count: count
    })).sort((a, b) => a.name.localeCompare(b.name));
  };

  // Fonction pour exporter le rapport d'un seul employé en PDF
  const exportEmployeePDF = (employee: Employee) => {
    const doc = new jsPDF();
    
    // En-tête du document
    doc.setFontSize(20);
    doc.text('Rapport de Solde de Congé', 14, 22);
    doc.setFontSize(12);
    doc.text(`Généré le: ${new Date().toLocaleDateString('fr-FR')}`, 14, 30);
    
    // Informations de l'employé
    doc.setFontSize(14);
    doc.text('Informations Employé', 14, 45);
    doc.setFontSize(10);
    
    let yPosition = 55;
    doc.text(`Nom: ${employee.nom}`, 14, yPosition);
    yPosition += 8;
    doc.text(`Prénom: ${employee.prenom}`, 14, yPosition);
    yPosition += 8;
    doc.text(`Email: ${employee.email}`, 14, yPosition);
    yPosition += 8;
    doc.text(`Entreprise: ${employee.entreprise}`, 14, yPosition);
    yPosition += 15;
    
    // Solde de congé
    doc.setFontSize(14);
    doc.text('Solde de Congé', 14, yPosition);
    yPosition += 10;
    doc.setFontSize(12);
    doc.text(`Jours restants: ${employee.solde_conge || 0} jours`, 14, yPosition);
    
    // Graphique de progression (optionnel)
    yPosition += 15;
    doc.setFontSize(10);
    doc.text("Progression de l'utilisation des congés:", 14, yPosition);
    yPosition += 8;
    
    // Barre de progression simple
    const progressWidth = 100;
    const progress = Math.min((employee.solde_conge || 0) / 25 * 100, 100);
    doc.rect(14, yPosition, progressWidth, 8);
    doc.setFillColor(59, 130, 246);
    doc.rect(14, yPosition, (progress / 100) * progressWidth, 8, 'F');
    
    yPosition += 15;
    doc.text(`${employee.solde_conge || 0} / 25 jours (${progress.toFixed(1)}%)`, 14, yPosition);
    
    doc.save(`rapport-solde-${employee.nom}-${employee.prenom}-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Fonction pour exporter le rapport d'un seul employé en Excel
  const exportEmployeeExcel = (employee: Employee) => {
    const wb = XLSX.utils.book_new();
    
    // Feuille de données employé
    const employeeData = [
      ['Rapport de Solde de Congé'],
      ['Généré le:', new Date().toLocaleDateString('fr-FR')],
      [],
      ['Informations Employé'],
      ['Nom:', employee.nom],
      ['Prénom:', employee.prenom],
      ['Email:', employee.email],
      ['Entreprise:', employee.entreprise],
      [],
      ['Solde de Congé'],
      ['Jours restants:', employee.solde_conge || 0],
      ['Jours totaux:', 25],
      ['Pourcentage utilisé:', `${((25 - (employee.solde_conge || 0)) / 25 * 100).toFixed(1)}%`]
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(employeeData);
    XLSX.utils.book_append_sheet(wb, ws, 'Solde Congé');
    
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(data, `rapport-solde-${employee.nom}-${employee.prenom}-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToExcel = () => {
    const filtered = getFilteredLeaves();
    const filteredEmployees = getFilteredEmployees();
    
    // Create workbook with multiple sheets
    const wb = XLSX.utils.book_new();
    
    // Leaves sheet
    const leavesWs = XLSX.utils.json_to_sheet(filtered.map(leave => ({
      'Employé': `${leave.prenom_employe} ${leave.nom_employe}`,
      'Type': leave.type === 'annuel' ? 'Congé annuel' : leave.type === 'maladie' ? 'Congé maladie' : 'Congé exceptionnel',
      'Entreprise': leave.entreprise,
      'Date début': leave.date_debut,
      'Date fin': leave.date_fin,
      'Statut': leave.statut === 'en_attente' ? 'En attente' : leave.statut === 'accepte' ? 'Accepté' : 'Refusé',
      'Motif': leave.motif,
    })));

    // Employee balance sheet - MODIFIÉ POUR INCLURE TOUS LES EMPLOYÉS
    const employeesWs = XLSX.utils.json_to_sheet(filteredEmployees.map(employee => ({
      'Nom': employee.nom,
      'Prénom': employee.prenom,
      'Email': employee.email,
      'Entreprise': employee.entreprise,
      'Solde congé (jours)': employee.solde_conge || 0,
      'Solde utilisé (jours)': 25 - (employee.solde_conge || 0),
      'Pourcentage utilisé': `${((25 - (employee.solde_conge || 0)) / 25 * 100).toFixed(1)}%`
    })));

    XLSX.utils.book_append_sheet(wb, leavesWs, 'Congés');
    XLSX.utils.book_append_sheet(wb, employeesWs, 'Soldes employés');

    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(data, `rapport-conges-complet-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToPDF = () => {
    const filtered = getFilteredLeaves();
    const filteredEmployees = getFilteredEmployees();
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
    
    // Employee balances table - AJOUTÉ POUR TOUS LES EMPLOYÉS
    yPosition += 15;
    if (yPosition + 50 > doc.internal.pageSize.height) {
      doc.addPage();
      yPosition = 20;
    }
    
    doc.setFontSize(14);
    doc.text('Soldes des Employés', 14, yPosition);
    yPosition += 10;
    
    const employeeTableData = filteredEmployees.map(employee => [
      `${employee.prenom} ${employee.nom}`,
      employee.entreprise,
      `${employee.solde_conge || 0} jours`,
      `${25 - (employee.solde_conge || 0)} jours`,
      `${((25 - (employee.solde_conge || 0)) / 25 * 100).toFixed(1)}%`
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Employé', 'Entreprise', 'Solde restant', 'Solde utilisé', '% utilisé']],
      body: employeeTableData,
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

    // Leaves table (sur une nouvelle page si nécessaire)
    const lastCell = (doc as any).lastAutoTable.finalY;
    yPosition = lastCell + 10;
    
    if (yPosition + 100 > doc.internal.pageSize.height) {
      doc.addPage();
      yPosition = 20;
    }
    
    doc.setFontSize(14);
    doc.text('Détails des Congés', 14, yPosition);
    yPosition += 10;
    
    const tableData = filtered.map(leave => [
      `${leave.prenom_employe} ${leave.nom_employe}`,
      leave.type === 'annuel' ? 'Congé annuel' : leave.type === 'maladie' ? 'Congé maladie' : 'Congé exceptionnel',
      leave.entreprise,
      new Date(leave.date_debut).toLocaleDateString('fr-FR'),
      new Date(leave.date_fin).toLocaleDateString('fr-FR'),
      leave.statut === 'en_attente' ? 'En attente' : leave.statut === 'accepte' ? 'Accepté' : 'Refusé'
    ]);
    
    autoTable(doc, {
      startY: yPosition,
      head: [['Employé', 'Type', 'Entreprise', 'Début', 'Fin', 'Statut']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [139, 92, 246],
        textColor: 255
      },
      styles: {
        fontSize: 8,
        cellPadding: 2
      }
    });

    doc.save(`rapport-conges-complet-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Fonction pour exporter seulement les soldes
  const exportEmployeesBalancesOnly = (employees: Employee[]) => {
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(20);
    doc.text('Rapport des Soldes de Congé', 14, 22);
    doc.setFontSize(12);
    doc.text(`Généré le: ${new Date().toLocaleDateString('fr-FR')}`, 14, 30);
    
    // Employee balances table
    let yPosition = 45;
    doc.setFontSize(14);
    doc.text('Soldes des Employés', 14, yPosition);
    yPosition += 10;
    
    const employeeTableData = employees.map(employee => [
      `${employee.prenom} ${employee.nom}`,
      employee.email,
      employee.entreprise,
      `${employee.solde_conge || 0} jours`,
      `${25 - (employee.solde_conge || 0)} jours`,
      `${((25 - (employee.solde_conge || 0)) / 25 * 100).toFixed(1)}%`
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Employé', 'Email', 'Entreprise', 'Solde restant', 'Solde utilisé', '% utilisé']],
      body: employeeTableData,
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

    doc.save(`rapport-soldes-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-gradient-to-r from-blue-500 to-purple-500 border-t-transparent mx-auto"></div>
          <p className="text-gray-600 mt-4 text-center">Chargement des données...</p>
        </div>
      </div>
    );
  }

  const filteredLeaves = getFilteredLeaves();
  const filteredEmployees = getFilteredEmployees();
  const leavesByType = getLeavesByType();
  const leavesByStatus = getLeavesByStatus();
  const leavesByCompany = getLeavesByCompany();
  const monthlyLeaves = getMonthlyLeaves();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header with premium styling */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Rapports et Statistiques
            </h1>
            <p className="text-gray-600 mt-2">Analysez les données de congés et les soldes employés</p>
          </div>
          <div className="flex space-x-3">
            <Button 
              onClick={exportToExcel} 
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 border-0 rounded-2xl px-6 py-3 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
            >
              <Download className="h-4 w-4 mr-2" />
              Excel Complet
            </Button>
            <Button 
              onClick={exportToPDF} 
              className="bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 border-0 rounded-2xl px-6 py-3 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
            >
              <FileDown className="h-4 w-4 mr-2" />
              PDF Complet
            </Button>
            {/* Nouveau bouton pour exporter seulement les soldes */}
            <Button 
              onClick={() => {
                const filteredEmployees = getFilteredEmployees();
                exportEmployeesBalancesOnly(filteredEmployees);
              }}
              className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 border-0 rounded-2xl px-6 py-3 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
            >
              <Users className="h-4 w-4 mr-2" />
              Soldes Seulement
            </Button>
          </div>
        </div>

        {/* Filters with glassmorphism */}
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-3 rounded-2xl shadow-lg">
                  <Filter className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-xl font-semibold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                  Filtres
                </h3>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setFilters({ startDate: '', endDate: '', company: '', leaveType: '' })}
                className="rounded-xl hover:bg-gray-100/80 backdrop-blur-sm"
              >
                Réinitialiser
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <label className="block text-sm font-semibold mb-3 text-gray-700">Date début</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-gradient-to-br from-blue-500 to-indigo-600 p-2 rounded-xl">
                    <Calendar className="h-4 w-4 text-white" />
                  </div>
                  <Input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                    className="pl-16 h-12 rounded-2xl border-gray-200/60 bg-white/80 backdrop-blur-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold mb-3 text-gray-700">Date fin</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-gradient-to-br from-blue-500 to-indigo-600 p-2 rounded-xl">
                    <Calendar className="h-4 w-4 text-white" />
                  </div>
                  <Input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                    className="pl-16 h-12 rounded-2xl border-gray-200/60 bg-white/80 backdrop-blur-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold mb-3 text-gray-700">Type de congé</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-gradient-to-br from-purple-500 to-pink-600 p-2 rounded-xl">
                    <FileText className="h-4 w-4 text-white" />
                  </div>
                  <select
                    className="w-full h-12 pl-16 pr-4 py-3 border border-gray-200/60 rounded-2xl focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/50 bg-white/80 backdrop-blur-sm transition-all"
                    value={filters.leaveType}
                    onChange={(e) => setFilters({ ...filters, leaveType: e.target.value })}
                  >
                    <option value="">Tous les types</option>
                    <option value="annuel">Congé annuel</option>
                    <option value="maladie">Congé maladie</option>
                    <option value="exceptionnel">Congé exceptionnel</option>
                  </select>
                </div>
              </div>
              
              {userProfile?.role === 'super_admin' && (
                <div>
                  <label className="block text-sm font-semibold mb-3 text-gray-700">Entreprise</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-gradient-to-br from-green-500 to-teal-600 p-2 rounded-xl">
                      <Building className="h-4 w-4 text-white" />
                    </div>
                    <select
                      className="w-full h-12 pl-16 pr-4 py-3 border border-gray-200/60 rounded-2xl focus:ring-2 focus:ring-green-500/30 focus:border-green-500/50 bg-white/80 backdrop-blur-sm transition-all"
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
          </div>
        </div>

        {/* Statistics Cards with premium design */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/20 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 overflow-hidden">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-6 relative">
              <div className="absolute top-4 right-4 bg-white/20 rounded-2xl p-3">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div className="text-white">
                <p className="text-blue-100 text-sm font-medium">Total Congés</p>
                <p className="text-3xl font-bold mt-2">{filteredLeaves.length}</p>
                <p className="text-blue-100 text-xs mt-1">Période sélectionnée</p>
              </div>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/20 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 overflow-hidden">
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-6 relative">
              <div className="absolute top-4 right-4 bg-white/20 rounded-2xl p-3">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
              <div className="text-white">
                <p className="text-green-100 text-sm font-medium">Congés Approuvés</p>
                <p className="text-3xl font-bold mt-2">{filteredLeaves.filter(l => l.statut === 'accepte').length}</p>
                <p className="text-green-100 text-xs mt-1">
                  {filteredLeaves.length > 0 ? Math.round((filteredLeaves.filter(l => l.statut === 'accepte').length / filteredLeaves.length) * 100) : 0}% du total
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/20 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 overflow-hidden">
            <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-6 relative">
              <div className="absolute top-4 right-4 bg-white/20 rounded-2xl p-3">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <div className="text-white">
                <p className="text-amber-100 text-sm font-medium">En Attente</p>
                <p className="text-3xl font-bold mt-2">{filteredLeaves.filter(l => l.statut === 'en_attente').length}</p>
                <p className="text-amber-100 text-xs mt-1">
                  {filteredLeaves.length > 0 ? Math.round((filteredLeaves.filter(l => l.statut === 'en_attente').length / filteredLeaves.length) * 100) : 0}% du total
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/20 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 overflow-hidden">
            <div className="bg-gradient-to-br from-red-500 to-pink-600 p-6 relative">
              <div className="absolute top-4 right-4 bg-white/20 rounded-2xl p-3">
                <XCircle className="h-6 w-6 text-white" />
              </div>
              <div className="text-white">
                <p className="text-red-100 text-sm font-medium">Congés Refusés</p>
                <p className="text-3xl font-bold mt-2">{filteredLeaves.filter(l => l.statut === 'refuse').length}</p>
                <p className="text-red-100 text-xs mt-1">
                  {filteredLeaves.length > 0 ? Math.round((filteredLeaves.filter(l => l.statut === 'refuse').length / filteredLeaves.length) * 100) : 0}% du total
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Employee Leave Balance Section */}
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-3 rounded-2xl shadow-lg">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  Soldes des Employés
                </h3>
                <p className="text-gray-600">Jours de congé restants par employé</p>
              </div>
            </div>

            {filteredEmployees.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredEmployees.map((employee) => {
                  const isExpanded = expandedEmployees.has(employee.id);
                  
                  return (
                    <div 
                      key={employee.id} 
                      className="bg-white/60 backdrop-blur-sm rounded-2xl border border-white/30 p-4 hover:bg-white/80 hover:shadow-lg transition-all duration-300"
                    >
                      {/* En-tête de la carte réduite */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="bg-gradient-to-br from-blue-400 to-purple-500 p-2 rounded-xl">
                            <User className="h-4 w-4 text-white" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-semibold text-gray-900 truncate">
                              {employee.prenom} {employee.nom}
                            </h4>
                            <p className="text-sm text-gray-600 truncate">{employee.email}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                              {employee.solde_conge || 0}
                            </span>
                            <span className="text-xs text-gray-600 ml-1">jours</span>
                          </div>
                          
                          <button 
                            onClick={() => toggleEmployeeExpansion(employee.id)}
                            className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
                          >
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      
                      {/* Contenu détaillé (visible seulement quand développé) */}
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                          <div className="flex items-center gap-2 text-sm">
                            <Building className="h-4 w-4 text-gray-500" />
                            <span className="text-gray-700">{employee.entreprise}</span>
                          </div>
                          
                          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-3 border border-blue-100/50">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Award className="h-4 w-4 text-blue-600" />
                                <span className="text-sm font-medium text-gray-700">Solde congé</span>
                              </div>
                              <div className="text-right">
                                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                  {employee.solde_conge || 0}
                                </span>
                                <span className="text-xs text-gray-600 ml-1">jours</span>
                              </div>
                            </div>
                            
                            {/* Progress bar for leave balance */}
                            <div className="mt-2">
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-500"
                                  style={{ width: `${Math.min((employee.solde_conge || 0) / 25 * 100, 100)}%` }}
                                ></div>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                {employee.solde_conge || 0} / 25 jours annuels
                              </p>
                            </div>
                          </div>
                          
                          {/* Boutons d'export individuels */}
                          <div className="flex gap-2 pt-2">
                            <button 
                              onClick={() => exportEmployeePDF(employee)}
                              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition-colors text-sm"
                            >
                              <FileDown className="h-3 w-3" />
                              PDF
                            </button>
                            <button 
                              onClick={() => exportEmployeeExcel(employee)}
                              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-green-100 text-green-700 rounded-xl hover:bg-green-200 transition-colors text-sm"
                            >
                              <Download className="h-3 w-3" />
                              Excel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border border-gray-200/50">
                <Users className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun employé trouvé</h3>
                <p className="text-gray-600">Aucun employé ne correspond aux filtres sélectionnés.</p>
              </div>
            )}
          </div>
        </div>

        {/* Tabs Navigation with premium styling */}
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/20 shadow-xl">
          <div className="p-2">
            <nav className="flex space-x-2">
              <button
                onClick={() => setActiveTab('overview')}
                className={`flex-1 py-4 px-6 rounded-2xl font-semibold text-sm transition-all duration-300 ${
                  activeTab === 'overview'
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg transform scale-105'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'
                }`}
              >
                <BarChart3 className="h-4 w-4 mr-2 inline" />
                Aperçu
              </button>
              <button
                onClick={() => setActiveTab('details')}
                className={`flex-1 py-4 px-6 rounded-2xl font-semibold text-sm transition-all duration-300 ${
                  activeTab === 'details'
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg transform scale-105'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'
                }`}
              >
                <FileText className="h-4 w-4 mr-2 inline" />
                Détails
              </button>
            </nav>
          </div>
        </div>

        {/* Charts with glassmorphism */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-3 rounded-2xl shadow-lg">
                    <BarChart3 className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                    Répartition par type de congé
                  </h3>
                </div>
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
                  <div className="text-center py-12 text-gray-500">Aucune donnée disponible</div>
                )}
              </div>
            </div>

            <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-gradient-to-br from-green-500 to-teal-600 p-3 rounded-2xl shadow-lg">
                    <TrendingUp className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                    Statut des demandes
                  </h3>
                </div>
                {leavesByStatus.length > 0 ? (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={leavesByStatus}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value) => [`${value} congés`, 'Nombre']} />
                        <Legend />
                        <Bar dataKey="count" fill="url(#blueGradient)" name="Nombre de congés" radius={[8, 8, 0, 0]} />
                        <defs>
                          <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.9}/>
                            <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.7}/>
                          </linearGradient>
                        </defs>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">Aucune donnée disponible</div>
                )}
              </div>
            </div>

            {userProfile?.role === 'super_admin' && leavesByCompany.length > 0 && (
              <div className="lg:col-span-2 bg-white/70 backdrop-blur-xl rounded-3xl border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300">
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-3 rounded-2xl shadow-lg">
                      <Building className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                      Congés par entreprise
                    </h3>
                  </div>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={leavesByCompany}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value) => [`${value} congés`, 'Nombre']} />
                        <Legend />
                        <Bar dataKey="count" fill="url(#purpleGradient)" name="Nombre de congés" radius={[8, 8, 0, 0]} />
                        <defs>
                          <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.9}/>
                            <stop offset="95%" stopColor="#EC4899" stopOpacity={0.7}/>
                          </linearGradient>
                        </defs>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {monthlyLeaves.length > 0 && (
              <div className="lg:col-span-2 bg-white/70 backdrop-blur-xl rounded-3xl border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300">
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="bg-gradient-to-br from-orange-500 to-red-600 p-3 rounded-2xl shadow-lg">
                      <Calendar className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                      Évolution mensuelle des congés
                    </h3>
                  </div>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monthlyLeaves}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value) => [`${value} congés`, 'Nombre']} />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="count" 
                          stroke="url(#orangeGradient)" 
                          name="Congés par mois" 
                          strokeWidth={3}
                          dot={{ fill: '#F97316', strokeWidth: 2, r: 6 }}
                        />
                        <defs>
                          <linearGradient id="orangeGradient" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="5%" stopColor="#F97316" stopOpacity={0.9}/>
                            <stop offset="95%" stopColor="#EF4444" stopOpacity={0.7}/>
                          </linearGradient>
                        </defs>
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Data Table with premium design */}
        {activeTab === 'details' && (
          <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-3 rounded-2xl shadow-lg">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-xl font-semibold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                  Détails des congés ({filteredLeaves.length})
                </h3>
              </div>

              {filteredLeaves.length > 0 ? (
                <div className="overflow-x-auto rounded-2xl">
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200/50">
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider rounded-tl-2xl">
                          Employé
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Type
                        </th>
                        {userProfile?.role === 'super_admin' && (
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Entreprise
                          </th>
                        )}
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Période
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Statut
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider rounded-tr-2xl">
                          Motif
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white/50 backdrop-blur-sm">
                      {filteredLeaves.map((leave, index) => (
                        <tr 
                          key={leave.id} 
                          className={`hover:bg-white/80 transition-all duration-300 border-b border-gray-200/30 ${
                            index === filteredLeaves.length - 1 ? 'border-b-0' : ''
                          }`}
                        >
                          <td className="px-6 py-5 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="bg-gradient-to-br from-blue-400 to-purple-500 p-2 rounded-xl">
                                <User className="h-4 w-4 text-white" />
                              </div>
                              <div className="text-sm font-semibold text-gray-900">
                                {leave.prenom_employe} {leave.nom_employe}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            <span className={`px-3 py-1 text-xs font-medium rounded-xl ${
                              leave.type === 'annuel' 
                                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                : leave.type === 'maladie'
                                ? 'bg-red-100 text-red-800 border border-red-200'
                                : 'bg-purple-100 text-purple-800 border border-purple-200'
                            }`}>
                              {leave.type === 'annuel' ? 'Congé annuel' : leave.type === 'maladie' ? 'Congé maladie' : 'Congé exceptionnel'}
                            </span>
                          </td>
                          {userProfile?.role === 'super_admin' && (
                            <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900 font-medium">
                              {leave.entreprise}
                            </td>
                          )}
                          <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                            <div className="font-medium">
                              {new Date(leave.date_debut).toLocaleDateString('fr-FR')} - {new Date(leave.date_fin).toLocaleDateString('fr-FR')}
                            </div>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            <span className={`px-3 py-1 text-xs font-medium rounded-xl ${
                              leave.statut === 'accepte' 
                                ? 'bg-green-100 text-green-800 border border-green-200'
                                : leave.statut === 'en_attente'
                                ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                                : 'bg-red-100 text-red-800 border border-red-200'
                            }`}>
                              {leave.statut === 'en_attente' ? 'En attente' : leave.statut === 'accepte' ? 'Accepté' : 'Refusé'}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-sm text-gray-900 max-w-xs">
                            <div className="truncate" title={leave.motif}>
                              {leave.motif}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border border-gray-200/50">
                  <FileText className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun congé trouvé</h3>
                  <p className="text-gray-600">Aucun congé ne correspond aux filtres actuels.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
