import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';


// PlaceHolders Pages

const AdminDashboard = () => <div className="p-8 text-white bg-slate-950 min-h-screen"> Admin Dashboard - Coming Soon</div>;
const TeacherDashboard = () => <div className="p-8 text-white bg-slate-950 min-h-screen"> Teacher Dashboard - Coming Soon</div>;
const ParentDashboard = () => <div className="p-8 text-white bg-slate-950 min-h-screen"> Parent Dashboard - Coming Soon</div>;

const NotFound = () => (
  <div className="min-h-screen bg-slate-950 flex items-center justify-center">
    <div className="text-center">
      <p className="text-6xl font-black text-slate-700 mb-4">404</p>
      <p className="text-white font-semibold text-xl mb-2"> Page Not Found</p>
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
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Admin Only */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/dashboard" element={<AdminDashboard />} />
          </Route>

          {/* Teacher Only */}

          <Route element={<ProtectedRoute allowedRoles={['teacher']} />}>
            <Route path="/teacher" element={<TeacherDashboard />} />
          </Route>

          {/* Parent Only */}

          <Route element={<ProtectedRoute allowedRoles={['parent']} />}>
            <Route path="/parent" element={<ParentDashboard />} />
          </Route>

          {/* Catch All - 404 Not Found */}
          <Route path="*" element={<NotFound />} />






        </Routes>
      </AuthProvider>
    </BrowserRouter>

  );
}