import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export class PDFGenerator {
  constructor() {
    this.doc = null;
    this.pageHeight = 297; // A4 height in mm
    this.pageWidth = 210; // A4 width in mm
    this.margin = 20;
    this.currentY = this.margin;
    this.lineHeight = 7;
  }

  // Initialiser le document PDF
  initDocument() {
    this.doc = new jsPDF('p', 'mm', 'a4');
    this.currentY = this.margin;
  }

  // Ajouter l'en-tête du document
  addHeader(title, period, generatedBy, company = null) {
    const pageWidth = this.pageWidth;
    
    // Logo et titre principal
    this.doc.setFillColor(59, 130, 246); // Blue-500
    this.doc.rect(this.margin, this.margin, pageWidth - (2 * this.margin), 25, 'F');
    
    this.doc.setTextColor(255, 255, 255);
    this.doc.setFontSize(20);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(title, this.margin + 5, this.margin + 8);
    
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(`Période: ${period}`, this.margin + 5, this.margin + 16);
    
    if (company) {
      this.doc.text(`Entreprise: ${company}`, this.margin + 5, this.margin + 22);
    }
    
    this.currentY = this.margin + 35;
    
    // Informations de génération
    this.doc.setTextColor(100, 116, 139); // Gray-500
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(`Généré le: ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`, this.margin, this.currentY);
    this.doc.text(`Par: ${generatedBy}`, this.margin, this.currentY + 5);
    
    this.currentY += 20;
  }

  // Ajouter une section de titre
  addSectionTitle(title, color = [59, 130, 246]) {
    this.checkPageBreak(15);
    
    this.doc.setFillColor(color[0], color[1], color[2]);
    this.doc.rect(this.margin, this.currentY, this.pageWidth - (2 * this.margin), 10, 'F');
    
    this.doc.setTextColor(255, 255, 255);
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(title, this.margin + 3, this.currentY + 7);
    
    this.currentY += 15;
  }

  // Vérifier si une nouvelle page est nécessaire
  checkPageBreak(height) {
    if (this.currentY + height > this.pageHeight - this.margin) {
      this.doc.addPage();
      this.currentY = this.margin;
    }
  }

  // Ajouter un tableau avec autoTable
  addTable(headers, data, options = {}) {
    const defaultOptions = {
      startY: this.currentY,
      margin: { left: this.margin, right: this.margin },
      styles: {
        fontSize: 10,
        cellPadding: 3,
        halign: 'left'
      },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
        fontSize: 11,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      tableLineColor: [226, 232, 240],
      tableLineWidth: 0.1,
      ...options
    };

    autoTable(this.doc, {
      head: [headers],
      body: data,
      ...defaultOptions
    });

    this.currentY = this.doc.lastAutoTable.finalY + 10;
  }

  // Ajouter un résumé/total
  addSummary(items, totalLabel, totalValue, color = [34, 197, 94]) {
    this.checkPageBreak(30);
    
    // Boîte de résumé
    this.doc.setFillColor(color[0], color[1], color[2]);
    this.doc.rect(this.margin, this.currentY, this.pageWidth - (2 * this.margin), 20, 'F');
    
    this.doc.setTextColor(255, 255, 255);
    this.doc.setFontSize(16);
    this.doc.setFont('helvetica', 'bold');
    
    const text = `${totalLabel}: ${totalValue}`;
    const textWidth = this.doc.getTextWidth(text);
    const textX = (this.pageWidth - textWidth) / 2;
    
    this.doc.text(text, textX, this.currentY + 13);
    
    this.currentY += 30;
  }

  // Ajouter le footer
  addFooter() {
    const pageCount = this.doc.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i);
      
      // Ligne de séparation
      this.doc.setDrawColor(226, 232, 240);
      this.doc.line(this.margin, this.pageHeight - 15, this.pageWidth - this.margin, this.pageHeight - 15);
      
      // Texte du footer
      this.doc.setTextColor(100, 116, 139);
      this.doc.setFontSize(8);
      this.doc.setFont('helvetica', 'normal');
      
      this.doc.text('Document confidentiel - Usage interne uniquement', this.margin, this.pageHeight - 10);
      this.doc.text(`Page ${i} sur ${pageCount}`, this.pageWidth - this.margin - 20, this.pageHeight - 10);
    }
  }

  // Sauvegarder le PDF
  save(filename) {
    this.addFooter();
    this.doc.save(filename);
  }
}

// Fonction pour générer le PDF des heures supplémentaires
export const generateHeuresSupplementairesPDF = (
  filteredEmployees,
  filteredHeures,
  period,
  userProfile,
  totalHeuresSupplementaires
) => {
  const generator = new PDFGenerator();
  generator.initDocument();
  
  // En-tête
  generator.addHeader(
    'RAPPORT HEURES SUPPLÉMENTAIRES',
    period,
    `${userProfile?.nom || 'Utilisateur'} (${userProfile?.role || 'N/A'})`,
    userProfile?.entreprise
  );
  
  // Section détails par employé
  generator.addSectionTitle('DÉTAILS PAR EMPLOYÉ', [59, 130, 246]);
  
  // Préparer les données pour le tableau
  const tableHeaders = ['Employé', 'Poste', 'Journées Complètes', 'Demi-Journées', 'Total (DH)'];
  const tableData = filteredEmployees.map(employee => {
    const heuresEmployee = filteredHeures.filter(h => h.employeeId === employee.id);
    const joursComplets = heuresEmployee.filter(h => h.type === 'journée complète').length;
    const demiJournees = heuresEmployee.filter(h => h.type === 'demi-journée').length;
    const montantTotal = (joursComplets * 100) + (demiJournees * 50);
    
    return [
      `${employee.prenom} ${employee.nom}`,
      employee.poste || 'N/A',
      `${joursComplets} × 100 DH`,
      `${demiJournees} × 50 DH`,
      `${montantTotal.toFixed(2)} DH`
    ];
  });
  
  if (tableData.length > 0) {
    generator.addTable(tableHeaders, tableData, {
      columnStyles: {
        0: { cellWidth: 45 },
        1: { cellWidth: 35 },
        2: { cellWidth: 35 },
        3: { cellWidth: 35 },
        4: { cellWidth: 30, halign: 'right', fontStyle: 'bold' }
      }
    });
  } else {
    generator.doc.setTextColor(239, 68, 68);
    generator.doc.setFontSize(12);
    generator.doc.text('Aucune heure supplémentaire enregistrée pour cette période.', generator.margin, generator.currentY);
    generator.currentY += 15;
  }
  
  // Section résumé détaillé
  generator.addSectionTitle('RÉSUMÉ MENSUEL', [168, 85, 247]);
  
  const summaryHeaders = ['Type', 'Quantité', 'Tarif Unitaire', 'Sous-total'];
  const summaryData = [];
  
  const totalJoursComplets = filteredEmployees.reduce((sum, employee) => {
    const heuresEmployee = filteredHeures.filter(h => h.employeeId === employee.id);
    return sum + heuresEmployee.filter(h => h.type === 'journée complète').length;
  }, 0);
  
  const totalDemiJournees = filteredEmployees.reduce((sum, employee) => {
    const heuresEmployee = filteredHeures.filter(h => h.employeeId === employee.id);
    return sum + heuresEmployee.filter(h => h.type === 'demi-journée').length;
  }, 0);
  
  if (totalJoursComplets > 0) {
    summaryData.push(['Journées complètes', totalJoursComplets.toString(), '100 DH', `${(totalJoursComplets * 100).toFixed(2)} DH`]);
  }
  
  if (totalDemiJournees > 0) {
    summaryData.push(['Demi-journées', totalDemiJournees.toString(), '50 DH', `${(totalDemiJournees * 50).toFixed(2)} DH`]);
  }
  
  if (summaryData.length > 0) {
    generator.addTable(summaryHeaders, summaryData, {
      headStyles: {
        fillColor: [168, 85, 247]
      },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 30, halign: 'center' },
        2: { cellWidth: 40, halign: 'center' },
        3: { cellWidth: 40, halign: 'right', fontStyle: 'bold' }
      }
    });
  }
  
  // Total final
  generator.addSummary(
    [],
    'TOTAL HEURES SUPPLÉMENTAIRES',
    `${totalHeuresSupplementaires.toFixed(2)} DH`,
    [34, 197, 94]
  );
  
  // Sauvegarder
  const filename = `heures_supplementaires_${period.replace(/ /g, '_')}.pdf`;
  generator.save(filename);
};

// Fonction pour générer le PDF des revenus de nuit
export const generateRevenusNuitPDF = (
  filteredRevenus,
  period,
  userProfile,
  totalRevenusNuit
) => {
  const generator = new PDFGenerator();
  generator.initDocument();
  
  // En-tête
  generator.addHeader(
    'RAPPORT REVENUS DE NUIT',
    period,
    `${userProfile?.nom || 'Utilisateur'} (${userProfile?.role || 'N/A'})`,
    userProfile?.entreprise
  );
  
  // Section détails des revenus
  generator.addSectionTitle('DÉTAILS DES REVENUS', [147, 51, 234]);
  
  // Préparer les données pour le tableau
  const tableHeaders = ['Date', 'Montant (DH)', 'Jour de la semaine'];
  const tableData = filteredRevenus
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map(revenu => {
      const date = new Date(revenu.date);
      const dayName = date.toLocaleDateString('fr-FR', { weekday: 'long' });
      return [
        date.toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        }),
        `${parseFloat(revenu.montant).toFixed(2)} DH`,
        dayName.charAt(0).toUpperCase() + dayName.slice(1)
      ];
    });
  
  if (tableData.length > 0) {
    generator.addTable(tableHeaders, tableData, {
      headStyles: {
        fillColor: [147, 51, 234]
      },
      columnStyles: {
        0: { cellWidth: 60, halign: 'center' },
        1: { cellWidth: 50, halign: 'right', fontStyle: 'bold' },
        2: { cellWidth: 60, halign: 'center' }
      }
    });
    
    // Statistiques supplémentaires
    generator.addSectionTitle('ANALYSE STATISTIQUE', [236, 72, 153]);
    
    const statsHeaders = ['Indicateur', 'Valeur'];
    const statsData = [
      ['Nombre total d\'entrées', filteredRevenus.length.toString()],
      ['Revenu moyen par nuit', `${(totalRevenusNuit / filteredRevenus.length).toFixed(2)} DH`],
      ['Revenu maximum', `${Math.max(...filteredRevenus.map(r => parseFloat(r.montant))).toFixed(2)} DH`],
      ['Revenu minimum', `${Math.min(...filteredRevenus.map(r => parseFloat(r.montant))).toFixed(2)} DH`]
    ];
    
    generator.addTable(statsHeaders, statsData, {
      headStyles: {
        fillColor: [236, 72, 153]
      },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 60, halign: 'right', fontStyle: 'bold' }
      }
    });
  } else {
    generator.doc.setTextColor(239, 68, 68);
    generator.doc.setFontSize(12);
    generator.doc.text('Aucun revenu de nuit enregistré pour cette période.', generator.margin, generator.currentY);
    generator.currentY += 15;
  }
  
  // Total final
  generator.addSummary(
    [],
    'TOTAL REVENUS DE NUIT',
    `${totalRevenusNuit.toFixed(2)} DH`,
    [147, 51, 234]
  );
  
  // Sauvegarder
  const filename = `revenus_nuit_${period.replace(/ /g, '_')}.pdf`;
  generator.save(filename);
};

// Fonction pour générer un rapport combiné
export const generateRapportCombinePDF = (
  filteredEmployees,
  filteredHeures,
  filteredRevenus,
  period,
  userProfile,
  totalHeuresSupplementaires,
  totalRevenusNuit,
  resultatNet
) => {
  const generator = new PDFGenerator();
  generator.initDocument();
  
  // En-tête
  generator.addHeader(
    'RAPPORT FINANCIER COMPLET',
    period,
    `${userProfile?.nom || 'Utilisateur'} (${userProfile?.role || 'N/A'})`,
    userProfile?.entreprise
  );
  
  // Section vue d'ensemble
  generator.addSectionTitle('VUE D\'ENSEMBLE FINANCIÈRE', [59, 130, 246]);
  
  const overviewHeaders = ['Catégorie', 'Montant', 'Type'];
  const overviewData = [
    ['Heures supplémentaires', `${totalHeuresSupplementaires.toFixed(2)} DH`, 'Dépense'],
    ['Revenus de nuit', `${totalRevenusNuit.toFixed(2)} DH`, 'Recette'],
    ['RÉSULTAT NET', `${resultatNet >= 0 ? '+' : ''}${resultatNet.toFixed(2)} DH`, resultatNet >= 0 ? 'Bénéfice' : 'Déficit']
  ];
  
  generator.addTable(overviewHeaders, overviewData, {
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 50, halign: 'right', fontStyle: 'bold' },
      2: { cellWidth: 40, halign: 'center' }
    },
    didParseCell: function(data) {
      if (data.row.index === 2) { // Ligne du résultat net
        if (resultatNet >= 0) {
          data.cell.styles.fillColor = [34, 197, 94]; // Green
        } else {
          data.cell.styles.fillColor = [239, 68, 68]; // Red
        }
        data.cell.styles.textColor = 255;
        data.cell.styles.fontStyle = 'bold';
      }
    }
  });
  
  // Section heures supplémentaires détaillées
  generator.addSectionTitle('HEURES SUPPLÉMENTAIRES - DÉTAIL', [59, 130, 246]);
  
  const heuresHeaders = ['Employé', 'Poste', 'J. Complètes', 'Demi-J.', 'Total'];
  const heuresData = filteredEmployees.map(employee => {
    const heuresEmployee = filteredHeures.filter(h => h.employeeId === employee.id);
    const joursComplets = heuresEmployee.filter(h => h.type === 'journée complète').length;
    const demiJournees = heuresEmployee.filter(h => h.type === 'demi-journée').length;
    const montantTotal = (joursComplets * 100) + (demiJournees * 50);
    
    return [
      `${employee.prenom} ${employee.nom}`,
      employee.poste || 'N/A',
      `${joursComplets}`,
      `${demiJournees}`,
      `${montantTotal.toFixed(2)} DH`
    ];
  });
  
  if (heuresData.length > 0) {
    generator.addTable(heuresHeaders, heuresData, {
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 40 },
        2: { cellWidth: 25, halign: 'center' },
        3: { cellWidth: 25, halign: 'center' },
        4: { cellWidth: 30, halign: 'right', fontStyle: 'bold' }
      }
    });
  }
  
  // Section revenus de nuit si présents
  if (filteredRevenus.length > 0) {
    generator.addSectionTitle('REVENUS DE NUIT - DÉTAIL', [147, 51, 234]);
    
    const revenusHeaders = ['Date', 'Montant (DH)'];
    const revenusData = filteredRevenus
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map(revenu => [
        new Date(revenu.date).toLocaleDateString('fr-FR'),
        `${parseFloat(revenu.montant).toFixed(2)} DH`
      ]);
    
    generator.addTable(revenusHeaders, revenusData, {
      headStyles: {
        fillColor: [147, 51, 234]
      },
      columnStyles: {
        0: { cellWidth: 80, halign: 'center' },
        1: { cellWidth: 50, halign: 'right', fontStyle: 'bold' }
      }
    });
  }
  
  // Résumé final avec couleur conditionnelle
  const summaryColor = resultatNet >= 0 ? [34, 197, 94] : [239, 68, 68];
  generator.addSummary(
    [],
    'RÉSULTAT NET MENSUEL',
    `${resultatNet >= 0 ? '+' : ''}${resultatNet.toFixed(2)} DH`,
    summaryColor
  );
  
  // Sauvegarder
  const filename = `rapport_complet_${period.replace(/ /g, '_')}.pdf`;
  generator.save(filename);
};
