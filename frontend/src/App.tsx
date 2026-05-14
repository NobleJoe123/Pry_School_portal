import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import AdminLogin from './pages/AdminLogin';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Teachers from './pages/Teachers';
import Parents from './pages/Parents';
import Academics from './pages/Academics';
import Finance from './pages/Finance';
import Attendance from './pages/Attendance';
import DashboardLayout from './components/DashboardLayout';


// PlaceHolders Pages


const Placeholder = ({ name }: { name: string }) => (
  <div className="flex items-center justify-center h-64 rounded-2xl border border-white/5"
    style={{ background: 'linear-gradient(135deg,#0d1b2a, #0a1628)' }}>
    <div className="text-center">
      <p className="text-slate-500 text-sm">{name}</p>
      <p className="text-slate-600 text-xs mt-1">Comming soon</p>
    </div>
  </div>
);


const NotFound = () => (
  <div className="min-h-screen bg-slate-950 flex items-center justify-center">
    <div className="text-center">
      <p className="text-6xl font-black text-slate-700 mb-4">404</p>
      <p className="text-white font-semibold text-xl mb-2"> Page Not Found</p>
      <a href="/login" className="text-amber-400 text-sm hover:text-amber-300">← Back to Login</a>
    </div>
  </div>
);


// App

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Shared Protected Routes (Dashboard Layout) */}
          <Route element={<ProtectedRoute allowedRoles={['admin', 'teacher', 'parent']} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              
              {/* Admin Only Routes */}
              <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                <Route path="/students" element={<Students />} />
                <Route path="/teachers" element={<Teachers />} />
                <Route path="/parents" element={<Parents />} />
                <Route path="/academics" element={<Academics />} />
                <Route path="/finance" element={<Finance />} />
                <Route path="/attendance" element={<Attendance />} />
              </Route>

              {/* Teacher Only Routes */}
              <Route element={<ProtectedRoute allowedRoles={['teacher']} />}>
                <Route path="/teacher" element={<Dashboard />} /> {/* Or a specific teacher home */}
                <Route path="/teacher/class" element={<Placeholder name="My Class" />} />
                <Route path="/teacher/attendance" element={<Placeholder name="Class Attendance" />} />
                <Route path="/teacher/scores" element={<Placeholder name="Record Scores" />} />
              </Route>

              {/* Parent Only Routes */}
              <Route element={<ProtectedRoute allowedRoles={['parent']} />}>
                <Route path="/parent" element={<Dashboard />} />
                <Route path="/parent/children" element={<Placeholder name="My Children" />} />
                <Route path="/parent/fees" element={<Placeholder name="Fee Payments" />} />
              </Route>

              {/* Student Only Routes */}
              <Route element={<ProtectedRoute allowedRoles={['student']} />}>
                <Route path="/student" element={<Dashboard />} />
                <Route path="/student/results" element={<Placeholder name="My Results" />} />
                <Route path="/student/attendance" element={<Placeholder name="My Attendance" />} />
              </Route>

              {/* Common Routes */}
              <Route path="/settings" element={<Placeholder name="Settings" />} />
              <Route path="/notifications" element={<Placeholder name="Notifications" />} />
            </Route>
          </Route>

          {/* Catch All - 404 Not Found */}
          <Route path="*" element={<NotFound />} />


        </Routes>
      </AuthProvider>
    </BrowserRouter>

  );
}