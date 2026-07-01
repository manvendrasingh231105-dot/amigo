import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  User, 
  Mail, 
  ArrowRight, 
  MapPin, 
  School, 
  Calendar, 
  Lock, 
  CheckCircle2, 
  LogIn, 
  UserPlus, 
  AlertTriangle,
  Loader2,
  Sparkles
} from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

interface AuthGateProps {
  onLogin: (email: string, name: string, role: 'user' | 'admin', meta: Record<string, string>) => void;
}

interface StudentAccount {
  email: string;
  name: string;
  address: string;
  campusName: string;
  dob: string;
  role: 'user';
  meta: Record<string, string>;
}

export default function AuthGate({ onLogin }: AuthGateProps) {
  // Option Choice state: 'main' | 'student_login' | 'student_register' | 'admin_login' | 'google_chooser' | 'simulating_google' | 'success'
  const [stage, setStage] = useState<'main' | 'student_login' | 'student_register' | 'admin_login' | 'google_chooser' | 'simulating_google' | 'success'>('main');
  
  // Database simulation
  const [registeredStudents, setRegisteredStudents] = useState<StudentAccount[]>([]);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Registration states
  const [regName, setRegName] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regCampus, setRegCampus] = useState('');
  const [regDob, setRegDob] = useState('');
  const [regEmail, setRegEmail] = useState('');

  // Login states
  const [loginEmail, setLoginEmail] = useState('');
  const [adminEmail, setAdminEmail] = useState('');

  // Temporary container for credentials currently pending google verification
  const [pendingSession, setPendingSession] = useState<{
    email: string;
    name: string;
    role: 'user' | 'admin';
    meta: Record<string, string>;
  } | null>(null);

  // Current validated active session state to show prior to finalization
  const [verifiedSession, setVerifiedSession] = useState<{
    email: string;
    name: string;
    role: 'user' | 'admin';
    meta: Record<string, string>;
  } | null>(null);

  // Initialize DB of registered students
  useEffect(() => {
    const defaultStudents: StudentAccount[] = [
      {
        email: 'manvendrasingh17791@gmail.com',
        name: 'Manvendra Singh',
        address: 'Varanasi, Uttar Pradesh',
        campusName: 'Main IIT Campus Noida',
        dob: '2005-11-23',
        role: 'user',
        meta: { branch: 'Computer Science', intent: 'Spontaneous Coffee Meet' }
      }
    ];

    try {
      const stored = localStorage.getItem('amigo_registered_students');
      if (stored) {
        setRegisteredStudents(JSON.parse(stored));
      } else {
        localStorage.setItem('amigo_registered_students', JSON.stringify(defaultStudents));
        setRegisteredStudents(defaultStudents);
      }
    } catch (e) {
      setRegisteredStudents(defaultStudents);
    }
  }, []);

  // Handler to register a student
  const handleRegisterStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsProcessing(true);

    const emailInput = regEmail.trim().toLowerCase();
    const name = regName.trim();
    const address = regAddress.trim();
    const campus = regCampus.trim();
    const dob = regDob;

    if (!name || !address || !campus || !dob) {
      setAuthError('Please fill in all requested fields to complete registration.');
      setIsProcessing(false);
      return;
    }

    try {
      // 1. Establish Firebase Authentication via Google Sign-In Pop-up
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      if (!user || !user.email) {
        throw new Error('Could not retrieve email from Google Sign-In.');
      }

      const email = user.email.toLowerCase();

      if (emailInput && emailInput !== email) {
        console.warn(`Input email ${emailInput} did not match signed-in Google account ${email}. Using authentic Google account.`);
      }

      // Safe regex-valid ID for firestore document keys
      const safeId = 'usr_' + email.replace(/[^a-zA-Z0-9_-]/g, '_');

      // 2. Now that request.auth is populated, we can securely query if their Firestore student profile exists
      const userRef = doc(db, 'users', safeId);
      const existingDoc = await getDoc(userRef);
      if (existingDoc.exists()) {
        setAuthError(`This Google Account (${email}) is already registered with a student profile. Please go back and select Login.`);
        setIsProcessing(false);
        return;
      }

      // Generate dynamic avatars
      const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'AM';
      const colors = [
        'from-amber-400 to-orange-500',
        'from-emerald-400 to-teal-500',
        'from-purple-500 to-indigo-500',
        'from-rose-400 to-pink-500',
        'from-sky-400 to-blue-500'
      ];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];

      const newUserPayload = {
        id: safeId,
        name,
        avatar: initials,
        avatarColor: randomColor,
        trustScore: 0,
        title: 'Newcomer',
        email,
        location: campus,
        role: 'user',
        statusText: '',
        statusType: '',
        meetsCount: 0,
        xp: 0,
        level: 1,
        bio: 'Student at ' + campus
      };

      // Store in cloud DB
      await setDoc(userRef, newUserPayload);

      const pendingData = {
        email,
        name,
        role: 'user' as const,
        meta: {
          branch: 'Computer Science & Spontaneous Networks',
          intent: 'Spontaneous Coffee Meet',
          address,
          campus,
          dob
        }
      };

      setPendingSession(pendingData);
      setVerifiedSession(pendingData);
      setStage('google_chooser');
    } catch (e: any) {
      console.error("Google Registration issue:", e);
      let errorMsg = 'Registration and database insert failed: ' + (e instanceof Error ? e.message : String(e));
      if (e.code === 'auth/popup-closed-by-user') {
        errorMsg = 'Google authentication popup was closed before completing registration. Please try again.';
      } else if (e.code === 'auth/cancelled-popup-request') {
        errorMsg = 'Multiple popups were requested. Please try again.';
      }
      setAuthError(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handler to login student
  const handleStudentLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsProcessing(true);

    try {
      // 1. Authenticate via Google Sign-In Pop-up
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      if (!user || !user.email) {
        throw new Error('Could not retrieve email from Google Sign-In.');
      }

      const email = user.email.toLowerCase();
      const safeId = 'usr_' + email.replace(/[^a-zA-Z0-9_-]/g, '_');

      // 2. Fetch profile from Firestore
      const userRef = doc(db, 'users', safeId);
      const userDoc = await getDoc(userRef);
      if (!userDoc.exists()) {
        // Sign out if no Firestore student profile has been set up
        await auth.signOut();
        setAuthError(`This Gmail ID "${email}" is not registered in our database under any Student profile. Please select 'Register as a new student' option first.`);
        setIsProcessing(false);
        return;
      }

      const userData = userDoc.data();
      const pendingData = {
        email: userData.email,
        name: userData.name,
        role: (userData.role || 'user') as 'user' | 'admin',
        meta: {
          branch: 'Computer Science & Spontaneous Networks',
          intent: 'Spontaneous Coffee Meet',
          address: userData.location || 'Varanasi',
          campus: userData.location || 'IIT Campus'
        }
      };

      setPendingSession(pendingData);
      setVerifiedSession(pendingData);
      setStage('google_chooser');
    } catch (error: any) {
      console.error("Google Sign-In failed:", error);
      let errorMsg = 'Google Sign-In failed: ' + (error instanceof Error ? error.message : String(error));
      if (error.code === 'auth/popup-closed-by-user') {
        errorMsg = 'Google Sign-In popup was closed. Please try again to authenticate.';
      }
      setAuthError(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handler to login admin
  const handleAdminLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsProcessing(true);

    const allowedAdmins = [
      'manvendrasingh17791@gmail.com',
      'manvendrasingh231105@gmail.com',
      'coordinator.safety@amigo.edu'
    ];

    try {
      // Login admin via Google Sign-In Pop-up
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      if (!user || !user.email) {
        throw new Error('Could not retrieve email from Google Sign-In.');
      }

      const email = user.email.toLowerCase();

      if (!allowedAdmins.includes(email)) {
        await auth.signOut();
        setAuthError(`Access Denied: Google ID "${email}" is not on the list of authorized Administrators.`);
        setIsProcessing(false);
        return;
      }

      const safeId = 'usr_' + email.replace(/[^a-zA-Z0-9_-]/g, '_');

      // Check / Upsert admin profile in Firestore
      const userRef = doc(db, 'users', safeId);
      const userDoc = await getDoc(userRef);
      if (!userDoc.exists()) {
        const adminName = email === 'manvendrasingh17791@gmail.com' || email === 'manvendrasingh231105@gmail.com'
          ? 'Super Admin Manvendra'
          : 'Campus Safety Coordinator';
          
        await setDoc(userRef, {
          id: safeId,
          name: adminName,
          avatar: 'AD',
          avatarColor: 'from-indigo-600 to-indigo-850',
          trustScore: 5.0,
          title: 'Grid Moderator',
          email,
          location: 'Main Administration Office',
          role: 'admin',
          statusText: 'Admin Active',
          statusType: 'Coding',
          meetsCount: 100,
          xp: 10000,
          level: 100,
          bio: 'Global Spontaneous Grid Curator'
        });
      }

      const adminName = email === 'manvendrasingh17791@gmail.com' || email === 'manvendrasingh231105@gmail.com'
        ? 'Super Admin Manvendra'
        : 'Campus Safety Coordinator';
        
      const pendingData = {
        email,
        name: adminName,
        role: 'admin' as const,
        meta: {
          department: 'Main Administration Office',
          scope: 'Global Spontaneous Grid Authorization',
          staffCode: 'AMIGO-ADMIN-PRIMARY-SSO'
        }
      };

      setPendingSession(pendingData);
      setVerifiedSession(pendingData);
      setStage('google_chooser');
    } catch (e: any) {
      console.error("Admin Login compilation error/fail:", e);
      let errorMsg = 'Admin login query failed: ' + (e instanceof Error ? e.message : String(e));
      if (e.code === 'auth/popup-closed-by-user') {
        errorMsg = 'Google Sign-In popup closed before administrator authentication completed.';
      }
      setAuthError(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  // Google OAuth Authorization sequence simulation
  const triggerGoogleAuthSimulation = (
    email: string, 
    name: string, 
    role: 'user' | 'admin', 
    meta: Record<string, string>
  ) => {
    setVerifiedSession({ email, name, role, meta });
    setStage('simulating_google');
    setIsProcessing(true);

    setTimeout(() => {
      setIsProcessing(false);
      setStage('success');
    }, 2000); // 2 second mock authentic Google handshake loader
  };

  const handleFinalizeLaunch = () => {
    if (verifiedSession) {
      onLogin(verifiedSession.email, verifiedSession.name, verifiedSession.role, verifiedSession.meta);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#121212]/98 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div 
        id="google-oauth-container" 
        className="w-full max-w-lg bg-[#fdfaf7] border-4 border-[#1a1a1a] shadow-[8px_8px_0px_0px_rgba(26,26,26,1)] rounded-3xl p-6 md:p-8 cursor-default max-h-[92vh] overflow-y-auto relative text-left"
      >
        
        {/* Brand Banner Top */}
        <div className="flex items-center gap-3 border-b-4 border-[#1a1a1a] pb-4 mb-6">
          <div className="w-10 h-10 bg-[#FF6B35] rounded-xl border-2 border-[#1a1a1a] flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] font-black text-white text-sm">
            AM
          </div>
          <div>
            <h2 className="text-xl font-black font-display text-[#1a1a1a] tracking-tight flex items-center gap-2">
              <span>AMIGO SOCIAL GATEWAY</span>
              <span className="text-[9px] bg-[#EBFBEE] text-emerald-900 border border-[#1a1a1a] py-0.5 px-2 rounded font-mono uppercase font-black">
                Google Secure Access
              </span>
            </h2>
            <p className="text-[10px] text-gray-500 font-mono uppercase font-semibold">Spontaneous Proximity Authentication v2.4</p>
          </div>
        </div>

        {/* Global Error message box */}
        {authError && (
          <div className="mb-5 p-3.5 bg-rose-50 border-2 border-rose-600 rounded-xl flex items-start gap-2.5 text-xs text-rose-950 font-bold shadow-[2px_2px_0px_0px_rgba(225,29,72,1)] animate-shake">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 stroke-[2.5]" />
            <div className="flex-1">
              <span className="uppercase font-mono text-[9px] block text-rose-700 tracking-wide">Validation Security Alert</span>
              {authError}
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          
          {/* STAGE MAIN OPTIONS PICKER */}
          {stage === 'main' && (
            <motion.div
              key="main"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="space-y-4"
            >
              <div className="text-center mb-6 py-2 bg-[#FFF9F2] border-2 border-[#1a1a1a] rounded-2xl shadow-[3px_3px_0px_0px_rgba(26,26,26,1)]">
                <span className="text-[10px] font-mono text-[#FF6B35] font-black uppercase tracking-widest bg-white border border-[#1a1a1a]/40 px-2 py-0.5 rounded-full">
                  Campus Verification Network
                </span>
                <p className="text-xs text-gray-600 font-medium px-4 mt-2">
                  Spontaneous proximity matching is confined to authenticated student accounts and university staff. Please choose an authorization option below:
                </p>
              </div>

              {/* CARD OPTION 1: STUDENT GATEWAY */}
              <div className="bg-white border-3 border-[#1a1a1a] p-5 rounded-2xl shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] transition hover:-translate-y-0.5">
                <span className="text-[9px] font-mono bg-emerald-50 text-emerald-950 border border-emerald-900/30 px-2 py-0.5 rounded uppercase font-black tracking-wide">
                  Option 1: Students Portal
                </span>
                <h4 className="text-lg font-black text-[#1a1a1a] mt-1.5 flex items-center gap-1.5">
                  <User className="stroke-[2.5] text-emerald-600" size={18} />
                  <span>Student & Guest Authorization</span>
                </h4>
                <p className="text-xs text-gray-500 mt-1 font-medium select-none">
                  For students and university occupants to discover localized events, broadcast spontaneous intents, and trigger Handshakes.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                  <button
                    onClick={() => {
                      setAuthError(null);
                      setStage('student_register');
                    }}
                    className="bg-emerald-400 hover:bg-emerald-500 text-[#1a1a1a] border-2 border-[#1a1a1a] py-3 px-4 rounded-xl text-xs font-black shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] transition transform active:translate-y-0.5 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <UserPlus size={14} className="stroke-[2.5]" />
                    <span>Register New Student</span>
                  </button>
                  <button
                    onClick={() => {
                      setAuthError(null);
                      setStage('student_login');
                    }}
                    className="bg-white hover:bg-gray-50 text-[#1a1a1a] border-2 border-[#1a1a1a] py-3 px-4 rounded-xl text-xs font-black shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] transition transform active:translate-y-0.5 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <LogIn size={14} className="stroke-[2.5]" />
                    <span>Login registered student</span>
                  </button>
                </div>
              </div>

              {/* CARD OPTION 2: CAMPUS ADMINISTRATOR */}
              <div className="bg-[#FAF9FF] border-3 border-indigo-950 p-5 rounded-2xl shadow-[4px_4px_0px_0px_rgba(79,70,229,1)] transition hover:-translate-y-0.5">
                <span className="text-[9px] font-mono bg-indigo-100 text-indigo-900 border border-indigo-400/50 px-2 py-0.5 rounded uppercase font-black tracking-wide">
                  Option 2: Administration Gateway
                </span>
                <h4 className="text-lg font-black text-[#1a1a1a] mt-1.5 flex items-center gap-1.5">
                  <Shield className="stroke-[2.5] text-indigo-700" size={18} />
                  <span>Campus Administrator Login</span>
                </h4>
                <p className="text-xs text-gray-500 mt-1 font-medium">
                  Authorizations reserved for moderators to push real-time broadcasts, administer physical hotspots, and log B2B analytics.
                </p>

                <div className="mt-4">
                  <button
                    onClick={() => {
                      setAuthError(null);
                      setStage('admin_login');
                    }}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white border-2 border-indigo-950 py-3.5 px-4 rounded-xl text-xs font-black shadow-[3px_3px_0px_0px_rgba(26,26,26,1)] transition transform active:translate-y-0.5 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>Log In as Official Administrator</span>
                    <ArrowRight size={14} className="stroke-[2.5]" />
                  </button>
                </div>
              </div>

              {/* Helper DB info block */}
              <div className="p-3 bg-white border border-dashed border-gray-300 rounded-xl text-[10px] text-gray-400 font-mono flex justify-between items-center bg-gray-50">
                <span>Active Database: {registeredStudents.length} Registered Student(s)</span>
                <span>Preseeded: manvendrasingh17791@gmail.com</span>
              </div>
            </motion.div>
          )}

          {/* STAGE: REGISTER STUDENT */}
          {stage === 'student_register' && (
            <motion.div
              key="student_register"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="mb-2">
                <span className="text-[9px] text-[#FF6B35] bg-[#FFF4F0] border-2 border-[#1a1a1a] font-mono px-2 py-0.5 rounded font-black uppercase text-left inline-block">
                  Create a new Student Profile
                </span>
                <h3 className="text-xl font-black text-[#1a1a1a] mt-1">Register New Account</h3>
                <p className="text-xs text-gray-500 font-medium">Invent details below to seed your profile in the Amigo Spontaneous mesh network.</p>
              </div>

              <form onSubmit={handleRegisterStudentSubmit} className="space-y-3">
                {/* Full name */}
                <div>
                  <label className="block text-xs font-extrabold text-[#1a1a1a] uppercase mb-1 flex items-center gap-1.5 font-sans">
                    <User size={13} className="text-[#FF6B35]" />
                    <span>Full Name *</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Manvendra Singh"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="w-full bg-white border-2 border-[#1a1a1a] rounded-xl px-3.5 py-3 text-xs font-bold text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#FF6B35] shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]"
                  />
                </div>

                {/* Place / Address */}
                <div>
                  <label className="block text-xs font-extrabold text-[#1a1a1a] uppercase mb-1 flex items-center gap-1.5 font-sans">
                    <MapPin size={13} className="text-[#FF6B35]" />
                    <span>Place / Physical Address *</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Varanasi, Uttar Pradesh"
                    value={regAddress}
                    onChange={(e) => setRegAddress(e.target.value)}
                    className="w-full bg-white border-2 border-[#1a1a1a] rounded-xl px-3.5 py-3 text-xs font-bold text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#FF6B35] shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]"
                  />
                </div>

                {/* Campus name */}
                <div>
                  <label className="block text-xs font-extrabold text-[#1a1a1a] uppercase mb-1 flex items-center gap-1.5 font-sans">
                    <School size={13} className="text-[#FF6B35]" />
                    <span>Campus Name *</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Indian Institute of Technology (BHU)"
                    value={regCampus}
                    onChange={(e) => setRegCampus(e.target.value)}
                    className="w-full bg-white border-2 border-[#1a1a1a] rounded-xl px-3.5 py-3 text-xs font-bold text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#FF6B35] shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]"
                  />
                </div>

                {/* DOB & Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-extrabold text-[#1a1a1a] uppercase mb-1 flex items-center gap-1.5 font-sans">
                      <Calendar size={13} className="text-[#FF6B35]" />
                      <span>Date of Birth *</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={regDob}
                      onChange={(e) => setRegDob(e.target.value)}
                      className="w-full bg-white border-2 border-[#1a1a1a] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#FF6B35] shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-[#1a1a1a] uppercase mb-1 flex items-center gap-1.5 font-sans">
                      <Mail size={13} className="text-[#FF6B35]" />
                      <span>Gmail Address *</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="user@gmail.com"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="w-full bg-white border-2 border-[#1a1a1a] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#FF6B35] shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]"
                    />
                  </div>
                </div>

                <div className="mt-4 p-3 bg-[#FFFDF1] border-2 border-[#1a1a1a] rounded-xl text-[11px] font-medium text-stone-600 leading-tight">
                  💡 By registering, your profile details will be verified using Google OAuth integration standard protocol. This registers your Gmail address securely for all future log-ins.
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthError(null);
                      setStage('main');
                    }}
                    className="flex-1 bg-white hover:bg-gray-50 text-[#1a1a1a] border-2 border-[#1a1a1a] py-3 rounded-xl text-xs font-black transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-[2] bg-emerald-400 hover:bg-emerald-500 text-[#1a1a1a] border-2 border-[#1a1a1a] py-3 rounded-xl text-xs font-black shadow-[3px_3px_0px_0px_rgba(26,26,26,1)] transition transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>Register & Authorize via Google</span>
                    <ArrowRight size={14} className="stroke-[2.5]" />
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* STAGE: LOGIN STUDENT */}
          {stage === 'student_login' && (
            <motion.div
              key="student_login"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="mb-2">
                <span className="text-[9px] text-emerald-900 bg-emerald-100 border-2 border-emerald-950 font-mono px-2 py-0.5 rounded font-black uppercase text-left inline-block">
                  Log in as an existing Student
                </span>
                <h3 className="text-xl font-black text-[#1a1a1a] mt-1">Student Google Handshake</h3>
                <p className="text-xs text-gray-500 font-medium">Verify your registered Gmail credentials to unlock the spontaneous network map.</p>
              </div>

              <form onSubmit={handleStudentLoginSubmit} className="space-y-4">
                <div className="p-4 bg-white border-2 border-[#1a1a1a] rounded-2xl shadow-[3px_3px_0px_0px_rgba(26,26,26,1)]">
                  <span className="text-[9px] font-mono text-[#FF6B35] font-black uppercase tracking-wider block mb-1">
                    Google Single Sign-On (SSO)
                  </span>
                  <p className="text-xs text-gray-600 font-semibold mb-3">
                    Click below to open the safe Google Sign-In prompt. Select your registered Gmail address to instantly verify your identity.
                  </p>
                  
                  <div className="p-2 px-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] font-semibold text-amber-900 flex items-center gap-2">
                    <span>💡 Preseeded Account:</span>
                    <strong className="font-mono bg-white border border-amber-300 px-1.5 py-0.5 rounded text-amber-950">
                      manvendrasingh17791@gmail.com
                    </strong>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthError(null);
                      setStage('main');
                    }}
                    className="flex-1 bg-white hover:bg-gray-50 text-[#1a1a1a] border-2 border-[#1a1a1a] py-3.5 rounded-xl text-xs font-black transition cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="flex-[2] bg-[#FF6B35] hover:bg-orange-600 text-white border-2 border-[#1a1a1a] py-3.5 rounded-xl text-xs font-black shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] transition transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.22-.66-.35-1.36-.35-2.09z" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>Google Sign In & Verify</span>
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* STAGE: ADMIN LOGIN */}
          {stage === 'admin_login' && (
            <motion.div
              key="admin_login"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="mb-2">
                <span className="text-[9px] text-[#FAF9FF] bg-indigo-600 border-2 border-indigo-950 font-mono px-2 py-0.5 rounded font-black uppercase text-left inline-block">
                  Protected System Administrators Gateway
                </span>
                <h3 className="text-xl font-black text-[#1a1a1a] mt-1">Administrator Google Authentication</h3>
                <p className="text-xs text-gray-500 font-medium">Only authorized administration Gmail address endpoints are granted clearance to host networks.</p>
              </div>

              <form onSubmit={handleAdminLoginSubmit} className="space-y-4">
                <div className="p-4 bg-stone-50 border-2 border-indigo-950 rounded-2xl shadow-[3px_3px_0px_0px_rgba(79,70,229,1)]">
                  <span className="text-[9px] font-mono text-indigo-600 font-black uppercase tracking-wider block mb-1">
                    Administrator Shield SSO
                  </span>
                  <p className="text-xs text-gray-650 font-semibold mb-3">
                    Click below to trigger secure administrator authentication via Google secure popup window. Only authorized Gmail addresses are granted moderator commands.
                  </p>
                  
                  <div className="p-2 px-3 bg-indigo-50 border border-indigo-200 rounded-xl text-[11px] font-semibold text-indigo-900 flex flex-col gap-1">
                    <div>👑 Authorized Adms:</div>
                    <code className="font-mono text-[9px] bg-white border border-indigo-200 p-1 px-1.5 rounded text-indigo-950 truncate block">
                      manvendrasingh17791@gmail.com
                    </code>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthError(null);
                      setStage('main');
                    }}
                    className="flex-1 bg-white hover:bg-gray-50 text-[#1a1a1a] border-2 border-[#1a1a1a] py-3.5 rounded-xl text-xs font-black transition cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white border-2 border-indigo-950 py-3.5 rounded-xl text-xs font-black shadow-[4px_4px_0px_0px_rgba(79,70,229,1)] transition transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.22-.66-.35-1.36-.35-2.09z" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>Secure Admin OAuth Login</span>
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* STAGE: GOOGLE ACCOUNT CHOOSER */}
          {stage === 'google_chooser' && pendingSession && (
            <motion.div
              key="google_chooser"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-6"
            >
              <div className="text-center py-2">
                {/* Custom Google Styled Colorful Logo */}
                <div className="flex justify-center items-center font-sans tracking-tight font-black text-3xl select-none">
                  <span className="text-[#4285F4]">G</span>
                  <span className="text-[#EA4335]">o</span>
                  <span className="text-[#FBBC05]">o</span>
                  <span className="text-[#4285F4]">g</span>
                  <span className="text-[#34A853]">l</span>
                  <span className="text-[#EA4335]">e</span>
                </div>
                <h3 className="text-xl font-extrabold text-stone-850 mt-3 font-sans tracking-tight">
                  Sign in with Google
                </h3>
                <p className="text-xs text-stone-500 font-medium mt-1">
                  to continue to <strong className="text-[#FF6B35]">Amigo Proximity Grid</strong>
                </p>
              </div>

              {/* Box showing Selected Account */}
              <div className="bg-white border-2 border-[#1a1a1a] rounded-2xl p-4 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
                <span className="text-[9px] font-mono font-bold tracking-wider text-gray-400 uppercase block mb-1">
                  Google SSO Account Profile:
                </span>
                <div className="flex items-center gap-3 bg-[#f8f9fa] border-2 border-dashed border-gray-300 p-3 rounded-xl">
                  <div className="w-10 h-10 bg-gradient-to-tr from-[#4285F4] to-[#34A853] text-white rounded-full flex items-center justify-center font-black font-sans text-sm border border-[#1a1a1a] shadow-[1.5px_1.5px_0px_0px_rgba(26,26,26,1)]">
                    {pendingSession.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="flex-1 truncate">
                    <p className="font-extrabold text-[#1a1a1a] text-sm leading-tight">{pendingSession.name}</p>
                    <p className="font-mono text-[10px] text-gray-500 truncate leading-snug">{pendingSession.email}</p>
                  </div>
                  <div className="shrink-0 flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-200 text-[10px] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                    <span>Verified</span>
                  </div>
                </div>

                {/* Scope details */}
                <div className="mt-4 border-t border-[#1a1a1a]/10 pt-3 text-[11px] space-y-2">
                  <p className="font-black text-stone-800 uppercase font-mono text-[9px] tracking-wide">
                    Authorized Scope Approvals:
                  </p>
                  <ul className="space-y-1.5 text-stone-600 font-semibold leading-relaxed">
                    <li className="flex items-center gap-2">
                      <span className="text-emerald-500">✓</span> 
                      <span>Verify identity credentials ({pendingSession.email})</span>
                    </li>
                    {pendingSession.role === 'user' ? (
                      <>
                        <li className="flex items-center gap-2">
                          <span className="text-emerald-500">✓</span>
                          <span>Bind campus presence in <em className="text-stone-850 not-italic font-bold font-mono">"{pendingSession.meta.campusName || 'Indian Institute of Technology'}"</em></span>
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-emerald-500">✓</span>
                          <span>Broadcast spontaneous intents with geocodes</span>
                        </li>
                      </>
                    ) : (
                      <>
                        <li className="flex items-center gap-2">
                          <span className="text-indigo-600">✓</span>
                          <span>Deploy physical anchor hubs and trigger safety audits</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-indigo-600">✓</span>
                          <span>Grants total Administrator SSO clearances</span>
                        </li>
                      </>
                    )}
                  </ul>
                </div>
              </div>

              {/* Standard Google Terms/Privacy Notice */}
              <div className="text-[10px] text-gray-400 font-medium leading-relaxed bg-[#fbfbfb] p-3 border border-gray-200 rounded-xl">
                To continue, Google will securely share your profile info, email address, and campus details with Amigo Social. Before using this app, you can review Amigo's <span className="underline hover:text-stone-600 cursor-pointer">Privacy Policy</span> and <span className="underline hover:text-stone-600 cursor-pointer">Terms of Service</span>.
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setAuthError(null);
                    setPendingSession(null);
                    setStage('main');
                  }}
                  className="flex-1 bg-white hover:bg-gray-50 text-[#1a1a1a] border-2 border-[#1a1a1a] py-3.5 rounded-xl text-xs font-black shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] transition transform active:translate-y-px cursor-pointer"
                >
                  Change Account
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (pendingSession) {
                      triggerGoogleAuthSimulation(
                        pendingSession.email,
                        pendingSession.name,
                        pendingSession.role,
                        pendingSession.meta
                      );
                    }
                  }}
                  className="flex-[2] bg-[#4285F4] hover:bg-[#357ae8] text-white border-2 border-indigo-950 py-3.5 rounded-xl text-xs font-black shadow-[3px_3px_0px_0px_rgba(26,26,26,1)] transition transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.22-.66-.35-1.36-.35-2.09z" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Authorize & Continue</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* STAGE: SIMULATING GOOGLE HANDSHAKE */}
          {stage === 'simulating_google' && (
            <motion.div
              key="simulating_google"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-8 space-y-6"
            >
              <div className="flex justify-center items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-[#4285F4] animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-4 h-4 rounded-full bg-[#EA4335] animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-4 h-4 rounded-full bg-[#FBBC05] animate-bounce" style={{ animationDelay: '300ms' }}></span>
                <span className="w-4 h-4 rounded-full bg-[#34A853] animate-bounce" style={{ animationDelay: '450ms' }}></span>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-black text-[#1a1a1a] uppercase tracking-wide">
                  Invoking Google Secure OAuth API
                </h3>
                <p className="text-xs text-gray-500 font-mono font-medium max-w-sm mx-auto leading-relaxed">
                  Establishing secure SSO tunnel session for:
                  <span className="block mt-1 font-bold text-gray-800 bg-white border border-gray-200 py-1 rounded max-w-xs mx-auto truncate font-mono text-[10px]">
                    {verifiedSession?.email}
                  </span>
                </p>
              </div>

              <div className="flex items-center justify-center gap-2 text-xs text-gray-400 font-mono">
                <Loader2 className="animate-spin text-gray-400" size={14} />
                <span>Verifying secure network key...</span>
              </div>
            </motion.div>
          )}

          {/* STAGE: SUCCESS AND LAUNCH */}
          {stage === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-center space-y-5"
            >
              <div className="mx-auto w-16 h-16 bg-emerald-500 rounded-full border-4 border-[#1a1a1a] flex items-center justify-center text-white animate-bounce shadow-[3px_3px_0px_0px_rgba(26,26,26,1)]">
                <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
              </div>

              <div>
                <h3 className="text-2xl font-black text-emerald-950 font-display">
                  Google Secure Authorization Success!
                </h3>
                <p className="text-xs text-gray-400 font-mono font-bold uppercase tracking-widest mt-1">
                  Amigo Mesh-Net Access Granted
                </p>
              </div>

              <div className="p-4 bg-emerald-50 border-2 border-emerald-900 rounded-2xl text-left shadow-[4px_4px_0px_0px_rgba(6,78,59,1)]">
                <div className="flex items-center gap-3 border-b-2 border-dashed border-emerald-200 pb-2 mb-3">
                  <div className={`w-10 h-10 rounded-xl border border-emerald-900 flex items-center justify-center text-white font-extrabold font-mono text-sm shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] ${
                    verifiedSession?.role === 'admin' ? 'bg-indigo-650' : 'bg-emerald-500'
                  }`}>
                    {verifiedSession?.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-emerald-900">{verifiedSession?.name}</h4>
                    <span className="text-[9px] font-mono font-black border border-emerald-900 bg-white text-emerald-950 rounded px-1.5 py-0.2 uppercase tracking-wide">
                      {verifiedSession?.role === 'admin' ? '👮 Administrator' : '🎓 Student Occupant'}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 text-[11px] text-emerald-950 font-bold leading-tight">
                  <div>
                    <span className="text-emerald-700 uppercase tracking-wide font-mono text-[9px] block">Authorized Gmail:</span>
                    <span className="font-mono text-stone-700 font-bold">{verifiedSession?.email}</span>
                  </div>

                  {verifiedSession?.role === 'user' ? (
                    <>
                      <div>
                        <span className="text-emerald-700 uppercase tracking-wide font-mono text-[9px] block">Home Residence / Place:</span>
                        <span className="text-stone-700">{verifiedSession?.meta?.address || 'Varanasi, UP'}</span>
                      </div>
                      <div>
                        <span className="text-emerald-700 uppercase tracking-wide font-mono text-[9px] block">Registered University Domain:</span>
                        <span className="text-stone-700">{verifiedSession?.meta?.campus || 'Indian Institute of Technology (BHU)'}</span>
                      </div>
                      <div>
                        <span className="text-emerald-700 uppercase tracking-wide font-mono text-[9px] block">Date of Birth (DOB):</span>
                        <span className="font-mono text-stone-700">{verifiedSession?.meta?.dob || '2005-11-23'}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <span className="text-emerald-700 uppercase tracking-wide font-mono text-[9px] block">Administrative Clearance scope:</span>
                        <span className="text-indigo-900">Total B2B event & Spontaneous presence scheduling</span>
                      </div>
                      <div>
                        <span className="text-emerald-700 uppercase tracking-wide font-mono text-[9px] block">Auth Token Header:</span>
                        <span className="font-mono bg-white border border-emerald-300 p-0.5 px-1.5 rounded text-[10px] text-stone-600">GOOGLE-SSO-TOKEN-GRANTED</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <button
                onClick={handleFinalizeLaunch}
                className="w-full bg-[#1a1a1a] hover:bg-emerald-600 text-white border-2 border-[#1a1a1a] py-4 rounded-xl text-xs font-black tracking-widest uppercase shadow-[4px_4px_0px_0px_rgba(16,185,129,1)] transition transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
              >
                Launch Amigo Application 🚀
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
