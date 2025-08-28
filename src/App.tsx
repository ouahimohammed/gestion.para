import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Dashboard } from './pages/Dashboard';
import { Employees } from './pages/Employees';
import { Leaves } from './pages/Leaves';
import { CalendarPage } from './pages/Calendar';
import { Reports } from './pages/Reports';
import { Companies } from './pages/Companies';
import { Notifications } from './pages/Notifications';
import { Unauthorized } from './pages/Unauthorized';
import { RequestLeave } from './pages/RequestLeave';
import { Profile } from './pages/Profile';
import { Responsables } from './pages/Responsables';
import { ToastProvider } from './components/ui/use-toast';
import { ProfileAdmin } from './pages/ProfileAdmin ';
import Login from './pages/Login';
import { MarkAbsence } from './pages/MarkAbsence';
import { EmployeeAbsences } from './pages/EmployeeAbsences';
import KitchenManagement from './pages/KitchenManagement';
import SuiviVoiture from './pages/SuiviVoiture';
 function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/employees" element={<ProtectedRoute requiredRole={['super_admin', 'responsable']}><Employees /></ProtectedRoute>} />
            <Route path="/leaves" element={<ProtectedRoute><Leaves /></ProtectedRoute>} />
            <Route path="/request-leave" element={<ProtectedRoute requiredRole={['employe', 'responsable']}><RequestLeave /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute requiredRole={['employe','responsable']}><Profile /></ProtectedRoute>} />
            <Route path="/profiladmin" element={<ProtectedRoute requiredRole={['super_admin' ]}><ProfileAdmin /></ProtectedRoute>} />
            <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute requiredRole={['super_admin', 'responsable']}><Reports /></ProtectedRoute>} />
            <Route path="/companies" element={<ProtectedRoute requiredRole={['super_admin']}><Companies /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
            <Route path="/responsables" element={<ProtectedRoute><Responsables /></ProtectedRoute>} />
            <Route path="/absences" element={<ProtectedRoute><MarkAbsence /></ProtectedRoute>} />
            <Route path="/cars" element={<ProtectedRoute><SuiviVoiture  /></ProtectedRoute>} />

            <Route path="/justification" element={<ProtectedRoute requiredRole={['super_admin', 'responsable']}><EmployeeAbsences /></ProtectedRoute>} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/kitchen" element={<ProtectedRoute requiredRole={['super_admin', 'responsable','employe']}><KitchenManagement user={undefined}  /></ProtectedRoute>} />

            
          </Routes>
        </Router>
      </AuthProvider>
    </ToastProvider>
  );
}
export default App;
