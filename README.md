# Employee & Leave Management System

A comprehensive full-stack web application built with React and Firebase for managing employees and leave requests across multiple companies.

## Features

### 🔐 Authentication & Role-Based Access
- Firebase Authentication with email/password
- Three user roles with different permissions:
  - **Super Admin**: Manages all companies, employees, and leaves
  - **Responsable**: Manages employees and leaves for their specific company
  - **Employé**: Can view their profile and request leaves

### 👥 Employee Management
- Add, edit, and delete employees
- Employee profiles with comprehensive information
- Company-specific employee lists
- Search and filtering capabilities

### 📅 Leave Management
- Leave request system with approval workflow
- Different leave types (annual, sick, exceptional)
- Status tracking (pending, approved, rejected)
- File attachments for leave justifications

### 📊 Dashboard & Analytics
- Role-specific dashboards with relevant metrics
- Real-time statistics and charts
- Visual data representation using Recharts

### 🗓️ Planning Calendar
- Interactive calendar view of approved leaves
- Color-coded by company
- Day-specific leave details
- Month and week views

### 🔔 Notifications
- Real-time notifications for leave requests
- Status update notifications
- Mark as read functionality
- Unread count indicators

### 📈 Reports & Export
- Generate reports with filters
- Export to Excel and text formats
- Statistical charts and graphs
- Company and period-based filtering

### 🏢 Company Management (Super Admin)
- Add and manage multiple companies
- Company-specific employee and leave organization

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Recharts** for data visualization
- **React Calendar** for calendar functionality

### Backend
- **Firebase Authentication** for user management
- **Firestore** for database
- **Firebase Storage** for file uploads
- **Firebase Security Rules** for access control

### Additional Libraries
- **Lucide React** for icons
- **File Saver** and **XLSX** for exports
- **Radix UI** components for accessibility

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- Firebase project

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Firebase:
   - Create a Firebase project
   - Enable Authentication, Firestore, and Storage
   - Copy your Firebase config to `src/lib/firebase.ts`

4. Set up Firestore Security Rules:
   ```javascript
   // Add these rules to your Firestore
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // Users can read/write their own profile
       match /users/{userId} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
       
       // Employee access rules
       match /employes/{employeeId} {
         allow read, write: if request.auth != null && (
           get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'super_admin' ||
           (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'responsable' && 
            get(/databases/$(database)/documents/users/$(request.auth.uid)).data.entreprise == resource.data.entreprise)
         );
       }
       
       // Leave access rules
       match /conges/{leaveId} {
         allow read, write: if request.auth != null && (
           get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'super_admin' ||
           (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'responsable' && 
            get(/databases/$(database)/documents/users/$(request.auth.uid)).data.entreprise == resource.data.entreprise) ||
           resource.data.employe_id == request.auth.uid
         );
       }
       
       // Companies (super admin only)
       match /entreprises/{companyId} {
         allow read, write: if request.auth != null && 
           get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'super_admin';
       }
       
       // Notifications
       match /notifications/{notificationId} {
         allow read, write: if request.auth != null && resource.data.user_id == request.auth.uid;
       }
     }
   }
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

## Demo Accounts

For testing purposes, create these accounts in Firebase:

- **Super Admin**: admin@test.com / admin123
- **Responsable**: manager@test.com / manager123  
- **Employé**: employee@test.com / employee123

## Database Structure

### Collections

#### users
```javascript
{
  uid: string,
  nom: string,
  email: string,
  role: 'super_admin' | 'responsable' | 'employe',
  entreprise?: string // null for super_admin
}
```

#### entreprises
```javascript
{
  nom: string,
  ville: string
}
```

#### employes
```javascript
{
  nom: string,
  prenom: string,
  cin: string,
  poste: string,
  entreprise: string,
  date_embauche: string,
  solde_conge: number
}
```

#### conges
```javascript
{
  employe_id: string, // reference to user
  entreprise: string,
  type: 'annuel' | 'maladie' | 'exceptionnel',
  date_debut: string,
  date_fin: string,
  statut: 'en_attente' | 'accepte' | 'refuse',
  motif: string,
  justificatif?: string // Firebase Storage URL
}
```

#### notifications
```javascript
{
  user_id: string,
  message: string,
  type: 'new_request' | 'approved' | 'rejected',
  created_at: string,
  seen: boolean
}
```

## Features Overview

### Role Permissions

| Feature | Super Admin | Responsable | Employé |
|---------|-------------|-------------|----------|
| View all companies | ✅ | ❌ | ❌ |
| Manage companies | ✅ | ❌ | ❌ |
| View all employees | ✅ | Own company only | Own profile only |
| Manage employees | ✅ | Own company only | ❌ |
| View all leaves | ✅ | Own company only | Own leaves only |
| Approve/reject leaves | ✅ | Own company only | ❌ |
| Request leaves | ❌ | ❌ | ✅ |
| View reports | ✅ | Own company only | ❌ |
| Export data | ✅ | Own company only | ❌ |

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.