import { doc, runTransaction, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Met à jour le statut d'une demande de congé et ajuste le solde si nécessaire
 * @param {string} leaveId - ID de la demande de congé
 * @param {string} newStatus - Nouveau statut ('accepte' ou 'refuse')
 * @param {string} employeeId - ID de l'employé
 * @param {number} leaveDays - Nombre de jours de congé
 * @param {string} previousStatus - Ancien statut de la demande
 */
export const updateLeaveStatus = async (leaveId, newStatus, employeeId, leaveDays, previousStatus) => {
  try {
    await runTransaction(db, async (transaction) => {
      const leaveRef = doc(db, 'conges', leaveId);
      const employeeRef = doc(db, 'employes', employeeId);
      
      // Mettre à jour le statut de la demande
      transaction.update(leaveRef, { 
        statut: newStatus,
        processed_at: new Date().toISOString()
      });
      
      // Gérer le solde de congé seulement pour les congés annuels
      const employeeDoc = await transaction.get(employeeRef);
      
      if (employeeDoc.exists()) {
        const currentBalance = employeeDoc.data().solde_conge || 0;
        
        if (newStatus === 'accepte') {
          // Si la demande est acceptée, déduire du solde
          transaction.update(employeeRef, {
            solde_conge: currentBalance - leaveDays
          });
        } else if (newStatus === 'refuse' && previousStatus === 'accepte') {
          // Si une demande précédemment acceptée est refusée, restaurer le solde
          transaction.update(employeeRef, {
            solde_conge: currentBalance + leaveDays
          });
        }
      }
    });
    
    console.log('Statut de congé mis à jour avec succès');
    return true;
  } catch (error) {
    console.error('Erreur lors de la mise à jour du statut:', error);
    throw error;
  }
};
