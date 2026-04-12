import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
// import Students from './pages/Students';
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
)


const TeacherDashboard = () => <div className="p-8 text-white bg-slate-950 min-h-screen"> Teacher Dashboard - Coming Soon</div>;
const ParentDashboard = () => <div className="p-8 text-white bg-slate-950 min-h-screen"> Parent Dashboard - Coming Soon</div>;

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
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Admin Only */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              {/* <Route path="/students" element={<Students />} /> */}
              <Route path="/teachers" element={<Placeholder name="Teachers Management" />} />
              <Route path="/parents" element={<Placeholder name="Parents" />} />
              <Route path="/academics" element={<Placeholder name="Academics" />} />
              <Route path="/finance" element={<Placeholder name="Finance" />} />
              <Route path="/attendance" element={<Placeholder name="Attendance" />} />
              <Route path="/settings" element={<Placeholder name="Settings" />} />
              <Route path="/notifications" element={<Placeholder name="Notifications" />} />
            </Route>
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