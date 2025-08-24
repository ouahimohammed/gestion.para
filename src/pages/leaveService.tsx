import { collection, query, getDocs, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile } from '../contexts/AuthContext';

export const LeaveService = {
  async fetchLeaves(userProfile: UserProfile | null) {
    try {
      let q;
      
      if (userProfile?.role === 'super_admin') {
        q = query(collection(db, 'conges'), where('statut', '==', 'accepte'));
      } else if (userProfile?.role === 'responsable' && userProfile.entreprise) {
        q = query(
          collection(db, 'conges'),
          where('entreprise', '==', userProfile.entreprise),
          where('statut', '==', 'accepte')
        );
      } else if (userProfile?.role === 'employe') {
        q = query(
          collection(db, 'conges'),
          where('employe_id', '==', userProfile.uid)
        );
      } else {
        return [];
      }

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching leaves:', error);
      throw error;
    }
  },

  async getEmployeeName(employeeId: string) {
    try {
      const docRef = doc(db, 'users', employeeId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return data.displayName || `${data.firstName} ${data.lastName}` || 'Inconnu';
      }
      
      return 'Inconnu';
    } catch (error) {
      console.error('Error fetching employee name:', error);
      return 'Inconnu';
    }
  }
};