import { useState, useEffect, useMemo, type FormEvent } from 'react';
import { UserPlus, Users, Search, Activity, Stethoscope } from 'lucide-react';

interface Patient {
  id: number;
  uhid: string;
  name: string;
  mobile: string;
  age: number;
  pincode: string;
  location: string;
  gender: string;
  dateOfBirth: string;
  email: string | null;
  referringDoctor: string | null;
  source: string;
  createdAt: string;
}

function ageFromDateOfBirth(isoOrYmd: string): number | null {
  if (!isoOrYmd) return null;
  const d = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(isoOrYmd) ? `${isoOrYmd}T12:00:00` : isoOrYmd,
  );
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age;
}

function formatDobForDisplay(isoOrYmd: string): string {
  if (!isoOrYmd) return '—';
  const d = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(isoOrYmd) ? `${isoOrYmd}T12:00:00` : isoOrYmd,
  );
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'register' | 'list'>('register');
  const [patients, setPatients] = useState<Patient[]>([]);

  // Form State
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [source, setSource] = useState('');
  const [email, setEmail] = useState('');
  const [referringDoctor, setReferringDoctor] = useState('');
  const [pincode, setPincode] = useState('');
  const [location, setLocation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successUhid, setSuccessUhid] = useState<string | null>(null);
  const [registeredName, setRegisteredName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const computedAge = useMemo(() => ageFromDateOfBirth(dateOfBirth), [dateOfBirth]);

  useEffect(() => {
    if (activeTab === 'list') {
      fetchPatients();
    }
  }, [activeTab]);

  const fetchPatients = async () => {
    try {
      const response = await fetch('/api/patients');
      const data = await response.json();
      setPatients(data.patients || []);
    } catch (err) {
      console.error('Failed to fetch patients', err);
    }
  };

  const resetForm = () => {
    setName('');
    setMobile('');
    setDateOfBirth('');
    setGender('');
    setSource('');
    setEmail('');
    setReferringDoctor('');
    setPincode('');
    setLocation('');
    setSuccessUhid(null);
    setRegisteredName(null);
    setError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessUhid(null);
    setRegisteredName(null);
    setError(null);

    const fullName = name.trim();
    const mobileDigits = mobile.replace(/\D/g, '');
    const pincodeTrimmed = pincode.trim();
    const locationTrimmed = location.trim();
    const emailTrimmed = email.trim();
    const referringTrimmed = referringDoctor.trim();

    const missing: string[] = [];
    if (!fullName) missing.push('full name');
    if (!gender) missing.push('gender');
    if (!dateOfBirth) missing.push('date of birth');
    else if (computedAge === null || computedAge < 0 || computedAge > 150) {
      missing.push('valid date of birth');
    }
    if (mobileDigits.length !== 10) missing.push('mobile number (10 digits)');
    if (!/^\d{6}$/.test(pincodeTrimmed)) missing.push('pincode (6 digits)');
    if (!locationTrimmed) missing.push('location');
    if (!source) missing.push('source');

    if (missing.length > 0) {
      setError(`Please complete the following: ${missing.join(', ')}.`);
      setIsSubmitting(false);
      return;
    }

    if (emailTrimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      setError('Please enter a valid email address or leave it blank.');
      setIsSubmitting(false);
      return;
    }

    const payload: Record<string, string> = {
      name: fullName,
      mobile: mobileDigits,
      pincode: pincodeTrimmed,
      location: locationTrimmed,
      gender,
      date_of_birth: dateOfBirth,
      source,
    };
    if (emailTrimmed) payload.email = emailTrimmed;
    if (referringTrimmed) payload.referring_doctor = referringTrimmed;

    try {
      const response = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to register patient');
      }

      setRegisteredName(data.patient.name);
      setSuccessUhid(data.patient.uhid);
      setName('');
      setMobile('');
      setDateOfBirth('');
      setGender('');
      setSource('');
      setEmail('');
      setReferringDoctor('');
      setPincode('');
      setLocation('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to register patient');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg font-sans text-earth">
      {/* Header */}
      <header className="px-6 md:px-12 py-8 flex justify-between items-end border-b border-stone/30">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-serif italic text-sage flex items-center gap-3">
            <div className="w-10 h-10 bg-sage rounded-xl flex items-center justify-center">
              <Stethoscope className="text-white w-6 h-6" />
            </div>
            Harmony Health Registry
          </h1>
          <p className="text-sm text-earth/60 uppercase tracking-widest pl-13">Patient Admission Portal</p>
        </div>
        <div className="text-right hidden sm:block">
          <span className="text-xs text-earth/50">V 2.1.0</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1200px] mx-auto px-6 md:px-12 py-8 flex flex-col md:flex-row gap-10">

        {/* Sidebar Nav */}
        <div className="w-full md:w-56 flex-shrink-0">
          <h2 className="text-[10px] font-bold text-earth/50 uppercase tracking-[0.2rem] mb-6 px-3">System Menu</h2>
          <nav className="space-y-2">
            <button
              onClick={() => { setActiveTab('register'); setSuccessUhid(null); setRegisteredName(null); setError(null); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'register' ? 'bg-sand text-sage border border-stone/50' : 'text-earth/70 hover:bg-stone/30 hover:text-earth border border-transparent'}`}
            >
              <UserPlus className="w-4 h-4" />
              Patient Registration
            </button>
            <button
              onClick={() => setActiveTab('list')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'list' ? 'bg-sand text-sage border border-stone/50' : 'text-earth/70 hover:bg-stone/30 hover:text-earth border border-transparent'}`}
            >
              <Users className="w-4 h-4" />
              Patient Directory
            </button>
          </nav>

          <div className="mt-8">
            <div className="flex items-center gap-3 p-4 bg-sage/5 rounded-2xl border border-sage/10">
              <Activity className="w-5 h-5 text-sage flex-shrink-0" />
              <p className="text-[11px] text-sage leading-tight">Data encrypted per medical acts.</p>
            </div>
          </div>
        </div>

        {/* Dynamic Content */}
        <div className="flex-1">
          {activeTab === 'register' && (
            <div className="bg-white rounded-[32px] p-8 md:p-10 form-shadow border border-stone/30">
              <div className="mb-8 flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                <div>
                  <h2 className="text-2xl font-serif text-sage mb-2">New Patient Registration</h2>
                  <p className="text-sm text-earth/60">Enter demographic details to generate a Unique Health Identification (UHID).</p>
                </div>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 flex-shrink-0 bg-stone/30 hover:bg-stone/60 text-earth text-sm font-medium rounded-xl transition-colors border border-stone/50"
                >
                  Start New
                </button>
              </div>

              <div>
                {successUhid && (
                  <div className="mb-10 uhid-card p-8">
                    <div className="flex justify-between items-start mb-8 relative z-10">
                      <span className="text-[10px] font-medium uppercase tracking-[0.2em] opacity-80">Unique Health Identification</span>
                      <Activity className="w-8 h-8 opacity-50" />
                    </div>
                    <div className="space-y-2 relative z-10">
                      <p className="text-4xl font-mono tracking-tighter text-white">{successUhid}</p>
                      <p className="text-sm opacity-80 font-serif italic text-white/90">Issued for: {registeredName ?? ''}</p>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="mb-8 bg-red-50 border border-red-200 rounded-2xl p-5 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2 md:col-span-2">
                      <label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-earth/70">Full Patient Name</label>
                      <input
                        id="name"
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="input-field"
                        placeholder="e.g. Arjun Dev Sharma"
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="gender" className="text-xs font-semibold uppercase tracking-wider text-earth/70">Gender</label>
                      <select
                        id="gender"
                        required
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="input-field"
                      >
                        <option value="" disabled>Select gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="dateOfBirth" className="text-xs font-semibold uppercase tracking-wider text-earth/70">Date of Birth</label>
                      <input
                        id="dateOfBirth"
                        type="date"
                        required
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        className="input-field"
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="computedAge" className="text-xs font-semibold uppercase tracking-wider text-earth/70">Age (from DOB)</label>
                      <input
                        id="computedAge"
                        type="text"
                        readOnly
                        value={computedAge !== null && computedAge >= 0 ? String(computedAge) : ''}
                        className="input-field bg-sand/50 text-earth/70 cursor-not-allowed"
                        placeholder="—"
                        aria-live="polite"
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="mobile" className="text-xs font-semibold uppercase tracking-wider text-earth/70">Mobile Number</label>
                      <input
                        id="mobile"
                        type="tel"
                        required
                        maxLength={10}
                        pattern="\d{10}"
                        title="Please enter exactly 10 digits"
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        className="input-field"
                        placeholder="0000000000"
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-earth/70">Email <span className="font-normal normal-case text-earth/50">(optional)</span></label>
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="input-field"
                        placeholder="name@example.com"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <label htmlFor="referringDoctor" className="text-xs font-semibold uppercase tracking-wider text-earth/70">Referring Doctor <span className="font-normal normal-case text-earth/50">(optional)</span></label>
                      <input
                        id="referringDoctor"
                        type="text"
                        value={referringDoctor}
                        onChange={(e) => setReferringDoctor(e.target.value)}
                        className="input-field"
                        placeholder="Dr. name or clinic"
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="source" className="text-xs font-semibold uppercase tracking-wider text-earth/70">Source</label>
                      <select
                        id="source"
                        required
                        value={source}
                        onChange={(e) => setSource(e.target.value)}
                        className="input-field"
                      >
                        <option value="" disabled>Select source</option>
                        <option value="Walk-in">Walk-in</option>
                        <option value="Referral">Referral</option>
                        <option value="Online">Online</option>
                        <option value="Camp">Camp</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="pincode" className="text-xs font-semibold uppercase tracking-wider text-earth/70">Pincode</label>
                      <input
                        id="pincode"
                        type="text"
                        required
                        maxLength={6}
                        pattern="\d{6}"
                        title="Please enter exactly 6 digits"
                        value={pincode}
                        onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="input-field"
                        placeholder="6-digit code"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <label htmlFor="location" className="text-xs font-semibold uppercase tracking-wider text-earth/70">Location</label>
                      <input
                        id="location"
                        type="text"
                        required
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="input-field"
                        placeholder="City/District"
                      />
                    </div>
                  </div>

                  <div className="pt-6">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-sage text-white py-4 rounded-xl font-medium text-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {isSubmitting ? 'Generating...' : 'Generate Unique UHID'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'list' && (
            <div className="bg-white rounded-[32px] p-8 md:p-10 form-shadow border border-stone/30 overflow-hidden min-h-[500px]">
              <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
                <div>
                  <h2 className="text-2xl font-serif text-sage mb-2">Patient Directory</h2>
                  <p className="text-sm text-earth/60">Viewing all registered patients across the system.</p>
                </div>
                <div className="relative">
                  <Search className="w-5 h-5 text-earth/40 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search query..."
                    className="input-field pl-12"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-stone/50 text-xs uppercase tracking-widest text-earth/50">
                      <th className="px-4 py-4 font-semibold w-12">#</th>
                      <th className="px-4 py-4 font-semibold">UHID</th>
                      <th className="px-4 py-4 font-semibold">Patient Name</th>
                      <th className="px-4 py-4 font-semibold">Gender</th>
                      <th className="px-4 py-4 font-semibold">Age</th>
                      <th className="px-4 py-4 font-semibold">DOB</th>
                      <th className="px-4 py-4 font-semibold">Mobile</th>
                      <th className="px-4 py-4 font-semibold">Email</th>
                      <th className="px-4 py-4 font-semibold">Ref. Doctor</th>
                      <th className="px-4 py-4 font-semibold">Source</th>
                      <th className="px-4 py-4 font-semibold">Location</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone/20">
                    {patients.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="px-4 py-16 text-center text-earth/40">
                          <div className="flex flex-col items-center justify-center">
                            <Users className="w-12 h-12 mb-4 opacity-30" />
                            <p className="font-serif italic text-lg">No patients found in the registry.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      patients.map((patient, idx) => (
                        <tr key={patient.id} className="hover:bg-sand/30 transition-colors">
                          <td className="px-4 py-5 text-sm text-earth/40">{idx + 1}</td>
                          <td className="px-4 py-5 text-sm font-mono text-sage font-semibold">{patient.uhid}</td>
                          <td className="px-4 py-5 text-sm font-medium text-earth">{patient.name}</td>
                          <td className="px-4 py-5 text-sm text-earth/70">{patient.gender}</td>
                          <td className="px-4 py-5 text-sm text-earth/70">{patient.age}</td>
                          <td className="px-4 py-5 text-sm text-earth/70 whitespace-nowrap">{formatDobForDisplay(patient.dateOfBirth)}</td>
                          <td className="px-4 py-5 text-sm text-earth/70">{patient.mobile}</td>
                          <td className="px-4 py-5 text-sm text-earth/70">{patient.email ?? '—'}</td>
                          <td className="px-4 py-5 text-sm text-earth/70">{patient.referringDoctor ?? '—'}</td>
                          <td className="px-4 py-5 text-sm text-earth/70">{patient.source}</td>
                          <td className="px-4 py-5 text-sm text-earth/70">
                            <div>{patient.location}</div>
                            <div className="text-xs text-earth/40 mt-1 uppercase tracking-wider">{patient.pincode}</div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="w-full text-center py-8 text-[10px] text-earth/40 uppercase tracking-[0.2em]">
        Internal Healthcare Management System &bull; Secured Network Session
      </footer>
    </div>
  );
}
