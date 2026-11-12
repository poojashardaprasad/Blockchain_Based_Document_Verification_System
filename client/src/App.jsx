import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Verifier from './pages/Verifier';
import UploaderDashboard from './pages/UploaderDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ProofVerification from './pages/ProofVerification';
import { RequireAuth, RequireRole } from './components/RouteGuards';

function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-grow">
        <Routes>
          <Route path="/" element={<Navigate to="/verifier" />} />
          <Route path="/verifier" element={<Verifier />} />
          <Route path="/verify-proof/:proofHash" element={<ProofVerification />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Uploader Routes */}
          <Route element={<RequireRole roles={['uploader']} />}>
            <Route path="/uploader" element={<UploaderDashboard />} />
          </Route>

          {/* Admin Routes */}
          <Route element={<RequireRole roles={['admin']} />}>
            <Route path="/admin" element={<AdminDashboard />} />
          </Route>
        </Routes>
      </div>
    </div>
  );
}

export default App;
