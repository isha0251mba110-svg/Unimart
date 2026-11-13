import { useState } from 'react';
import { Eye, EyeOff, KeyRound, Loader2, ShieldCheck, X } from 'lucide-react';
import { authService } from '../services/firebaseReady';
import { StudentUser, University } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  universities: University[];
  defaultUniversityId: string;
  defaultCampusId: string;
  onAuthSuccess: (user: StudentUser) => void;
}

export function AuthModal({
  isOpen,
  onClose,
  universities,
  defaultUniversityId,
  defaultCampusId,
  onAuthSuccess,
}: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Login / Forgot fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');

  // Registration fields (all 8 requested fields)
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regMobile, setRegMobile] = useState('');
  const [regUniId, setRegUniId] = useState(defaultUniversityId);
  const [regCampusId, setRegCampusId] = useState(defaultCampusId);
  const selectedRegUni = universities.find((u) => u.id === regUniId) ?? universities[0];
  const selectedRegCampus =
    selectedRegUni?.campuses.find((c) => c.id === regCampusId) ??
    selectedRegUni?.campuses[0];
  const [regHostel, setRegHostel] = useState(selectedRegCampus?.hostels[0] ?? '');
  const [regRoom, setRegRoom] = useState('');
  const [regPassword, setRegPassword] = useState('');

  if (!isOpen) return null;

  const handleUniChange = (uniId: string) => {
    setRegUniId(uniId);
    const uni = universities.find((u) => u.id === uniId);
    const firstCampus = uni?.campuses[0];
    if (firstCampus) {
      setRegCampusId(firstCampus.id);
      setRegHostel(firstCampus.hostels[0] ?? '');
    }
  };

  const handleCampusChange = (campusId: string) => {
    setRegCampusId(campusId);
    const camp = selectedRegUni?.campuses.find((c) => c.id === campusId);
    if (camp) {
      setRegHostel(camp.hostels[0] ?? '');
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    if (!loginEmail.trim() || !loginPassword) {
      setError('Please enter both your email and password.');
      return;
    }
    setLoading(true);
    try {
      const user = await authService.login(loginEmail, loginPassword);
      onAuthSuccess(user);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (
      !regName.trim() ||
      !regEmail.trim() ||
      !/^\d{10}$/.test(regMobile.trim()) ||
      !regUniId ||
      !regCampusId ||
      !regHostel ||
      !regRoom.trim() ||
      regPassword.length < 6
    ) {
      setError(
        'Please complete all fields (valid 10-digit mobile, hostel room number, and password min 6 characters).'
      );
      return;
    }

    setLoading(true);
    try {
      const user = await authService.register({
        name: regName,
        email: regEmail,
        mobile: regMobile,
        universityId: regUniId,
        campusId: regCampusId,
        hostel: regHostel,
        roomNumber: regRoom,
        password: regPassword,
      });
      onAuthSuccess(user);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    if (!forgotEmail.trim()) {
      setError('Enter your registered university email.');
      return;
    }
    setLoading(true);
    try {
      const msg = await authService.sendPasswordReset(forgotEmail);
      setSuccessMsg(msg);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send reset link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F294A]/50 backdrop-blur-[2px]">
      <div
        className="w-full max-w-lg bg-[#FFFDF9] border border-[#E5DEC9] rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
        role="dialog"
        aria-label="Student Authentication"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-[#0F294A] text-white flex items-center justify-between">
          <div>
            <h2 className="font-display font-bold text-xl">
              {mode === 'login'
                ? 'Student Sign In'
                : mode === 'register'
                ? 'Create Campus Account'
                : 'Reset Password'}
            </h2>
            <p className="text-xs text-[#CBD5E1] mt-0.5">
              Firebase Auth-ready session · Demo persistence active
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-3 border-b border-[#E5DEC9] bg-[#F3EFE6] text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError('');
              setSuccessMsg('');
            }}
            className={`py-3 transition-colors ${
              mode === 'login'
                ? 'bg-[#FFFDF9] text-[#0F294A] border-b-2 border-[#15803D]'
                : 'text-[#5C6F85] hover:text-[#0F294A]'
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError('');
              setSuccessMsg('');
            }}
            className={`py-3 transition-colors ${
              mode === 'register'
                ? 'bg-[#FFFDF9] text-[#0F294A] border-b-2 border-[#15803D]'
                : 'text-[#5C6F85] hover:text-[#0F294A]'
            }`}
          >
            Register
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('forgot');
              setError('');
              setSuccessMsg('');
            }}
            className={`py-3 transition-colors ${
              mode === 'forgot'
                ? 'bg-[#FFFDF9] text-[#0F294A] border-b-2 border-[#15803D]'
                : 'text-[#5C6F85] hover:text-[#0F294A]'
            }`}
          >
            Forgot Password
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#B91C1C] font-medium">
              {error}
            </div>
          )}
          {successMsg && (
            <div className="p-3 rounded-xl bg-[#EAF6EE] border border-[#B7DFC4] text-xs text-[#14532D] font-medium">
              {successMsg}
            </div>
          )}

          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#0F294A] mb-1">
                  University Email
                </label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="name@university.ac.in"
                  className="w-full h-10 px-3.5 rounded-xl bg-[#FAF8F3] border border-[#E5DEC9] text-sm focus:outline-none focus:border-[#0F294A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F294A] mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full h-10 pl-3.5 pr-10 rounded-xl bg-[#FAF8F3] border border-[#E5DEC9] text-sm focus:outline-none focus:border-[#0F294A]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5C6F85]"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl bg-[#0F294A] hover:bg-[#1A3A63] text-white font-semibold text-sm inline-flex items-center justify-center gap-2 transition-colors"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Sign In to UNIMART
              </button>

              {/* Quick Demo Credentials Box */}
              <div className="bg-[#F3EFE6] border border-[#E5DEC9] rounded-xl p-3.5 space-y-2">
                <p className="text-[11px] font-mono uppercase tracking-wider text-[#5C6F85] font-semibold">
                  Demo Accounts for College Presentation
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setLoginEmail('aarav.sharma@dgu.ac.in');
                      setLoginPassword('Campus@123');
                    }}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#FFFDF9] border border-[#E5DEC9] text-[#0F294A] hover:border-[#15803D]"
                  >
                    Fill Demo Student (DGU)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginEmail('admin@unimart.in');
                      setLoginPassword('Admin@123');
                    }}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#FFFDF9] border border-[#E5DEC9] text-[#0F294A] hover:border-[#15803D]"
                  >
                    Fill Campus Admin
                  </button>
                </div>
              </div>
            </form>
          )}

          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#0F294A] mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="e.g. Rohan Verma"
                    className="w-full h-10 px-3 rounded-xl bg-[#FAF8F3] border border-[#E5DEC9] text-sm focus:outline-none focus:border-[#0F294A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0F294A] mb-1">
                    Mobile Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={regMobile}
                    onChange={(e) => setRegMobile(e.target.value)}
                    placeholder="10-digit mobile"
                    className="w-full h-10 px-3 rounded-xl bg-[#FAF8F3] border border-[#E5DEC9] text-sm font-mono focus:outline-none focus:border-[#0F294A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F294A] mb-1">
                  University / Personal Email *
                </label>
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="student@university.ac.in"
                  className="w-full h-10 px-3 rounded-xl bg-[#FAF8F3] border border-[#E5DEC9] text-sm focus:outline-none focus:border-[#0F294A]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#0F294A] mb-1">
                    University *
                  </label>
                  <select
                    value={regUniId}
                    onChange={(e) => handleUniChange(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-[#FAF8F3] border border-[#E5DEC9] text-sm focus:outline-none focus:border-[#0F294A]"
                  >
                    {universities.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F294A] mb-1">
                    Campus *
                  </label>
                  <select
                    value={regCampusId}
                    onChange={(e) => handleCampusChange(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-[#FAF8F3] border border-[#E5DEC9] text-sm focus:outline-none focus:border-[#0F294A]"
                  >
                    {selectedRegUni?.campuses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.city})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#0F294A] mb-1">
                    Hostel *
                  </label>
                  <select
                    value={regHostel}
                    onChange={(e) => setRegHostel(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-[#FAF8F3] border border-[#E5DEC9] text-sm focus:outline-none focus:border-[#0F294A]"
                  >
                    {selectedRegCampus?.hostels.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F294A] mb-1">
                    Room Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={regRoom}
                    onChange={(e) => setRegRoom(e.target.value)}
                    placeholder="e.g. B-204"
                    className="w-full h-10 px-3 rounded-xl bg-[#FAF8F3] border border-[#E5DEC9] text-sm font-mono focus:outline-none focus:border-[#0F294A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F294A] mb-1">
                  Password (min 6 characters) *
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Create a secure password"
                  className="w-full h-10 px-3 rounded-xl bg-[#FAF8F3] border border-[#E5DEC9] text-sm focus:outline-none focus:border-[#0F294A]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl bg-[#15803D] hover:bg-[#166534] text-white font-semibold text-sm inline-flex items-center justify-center gap-2 transition-colors"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Create Student Account
              </button>
            </form>
          )}

          {mode === 'forgot' && (
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div className="flex items-start gap-2.5 text-xs text-[#5C6F85] bg-[#F3EFE6] p-3 rounded-xl">
                <KeyRound className="w-4 h-4 text-[#0F294A] shrink-0 mt-0.5" />
                <span>
                  Enter your registered campus email. In production, Firebase Authentication sends a secure password reset link.
                </span>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#0F294A] mb-1">
                  Registered Email
                </label>
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="aarav.sharma@dgu.ac.in"
                  className="w-full h-10 px-3.5 rounded-xl bg-[#FAF8F3] border border-[#E5DEC9] text-sm focus:outline-none focus:border-[#0F294A]"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl bg-[#0F294A] hover:bg-[#1A3A63] text-white font-semibold text-sm inline-flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Send Reset Link (Demo)
              </button>
            </form>
          )}

          <div className="pt-2 border-t border-[#F0EAE0] flex items-center gap-2 text-[11px] text-[#5C6F85]">
            <ShieldCheck className="w-4 h-4 text-[#15803D] shrink-0" />
            <span>Structured for Firebase Auth (`authService`) with instant local demo state.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
