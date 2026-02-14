
import React, { useState, useEffect, useRef } from 'react';
import { 
  User, AuthState, Sermon, Story, Quiz, QuizResult, Music, Devotional, UserRole, 
  PrayerPoint, Testimony, BibleStudyPlan, AppSettings 
} from './types';
import { 
  INITIAL_SERMONS, INITIAL_STORIES, INITIAL_QUIZZES, INITIAL_MUSIC, DAILY_DEVOTIONAL, 
  POPPING_VIDEOS, GROWTH_CHALLENGE_TASKS, BIBLE_VERSIONS, MOCK_BIBLE_CONTENT, 
  INTERCESSORY_SCRIPTURES, PRAYER_INSTRUMENTAL_URL 
} from './constants';
import { generateMotivation } from './services/gemini';

// --- Simulated Database Helpers ---
const getStoredUsers = () => JSON.parse(localStorage.getItem('teenfaith_registered_users') || '[]');
const setStoredUsers = (users: any[]) => localStorage.setItem('teenfaith_registered_users', JSON.stringify(users));

// --- Components ---

const Navbar = ({ 
  user, 
  onLogout, 
  onNavigate,
  currentPage
}: { 
  user: User | null; 
  onLogout: () => void; 
  onNavigate: (page: string) => void;
  currentPage: string;
}) => (
  <nav className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm overflow-x-auto">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between h-20 items-center min-w-[700px] lg:min-w-0">
        <div className="flex items-center cursor-pointer shrink-0" onClick={() => onNavigate('home')}>
          <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-2.5 rounded-xl mr-3 shadow-lg shadow-indigo-100">
            <i className="fas fa-cross text-white text-xl"></i>
          </div>
          <span className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 tracking-tight">
            TeenFaith+
          </span>
        </div>
        
        <div className="hidden lg:flex space-x-2 items-center mx-6">
          {[
            { id: 'home', label: 'Home' },
            { id: 'bible', label: 'Bible' },
            { id: 'music', label: 'Music' },
            { id: 'sermons', label: 'Sermons' },
            { id: 'stories', label: 'Cinema' },
            { id: 'quizzes', label: 'Quizzes' },
            { id: 'motivation', label: 'Motivation' }
          ].map(page => (
            <button 
              key={page.id}
              onClick={() => onNavigate(page.id)} 
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${currentPage === page.id ? 'bg-indigo-50 text-indigo-600' : 'text-gray-500 hover:text-indigo-600 hover:bg-gray-50'}`}
            >
              {page.label}
            </button>
          ))}
          {user?.role === 'admin' && (
            <button onClick={() => onNavigate('admin')} className="px-4 py-2 rounded-xl text-sm font-black text-rose-500 hover:bg-rose-50 transition-all">Admin</button>
          )}
        </div>

        <div className="flex items-center space-x-4 shrink-0">
          {user ? (
            <div className="flex items-center space-x-3 bg-gray-50 p-1.5 pr-4 rounded-2xl border border-gray-100">
              <button 
                onClick={() => onNavigate('profile')}
                className="flex items-center space-x-3 group"
              >
                <img 
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} 
                  alt="avatar" 
                  className="w-10 h-10 rounded-xl bg-white border border-gray-200 group-hover:scale-105 transition shadow-sm"
                />
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-black text-gray-900 leading-none mb-1">{user.name}</div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{user.role}</div>
                </div>
              </button>
              <div className="w-px h-6 bg-gray-200 mx-1"></div>
              <button 
                onClick={onLogout}
                className="text-gray-400 hover:text-red-500 transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50"
                title="Logout"
              >
                <i className="fas fa-sign-out-alt text-lg"></i>
              </button>
            </div>
          ) : (
            <button 
              onClick={() => onNavigate('login')}
              className="bg-indigo-600 text-white px-6 py-2.5 rounded-2xl font-black hover:bg-indigo-700 transition shadow-lg shadow-indigo-100"
            >
              Login
            </button>
          )}
        </div>
      </div>
    </div>
  </nav>
);

const SectionHeader = ({ title, subtitle, videoUrl }: { title: string; subtitle: string; videoUrl?: string }) => (
  <div className="relative mb-12 rounded-[2.5rem] overflow-hidden bg-gray-900 shadow-2xl group min-h-[320px] flex items-center">
    {videoUrl && (
      <div className="absolute inset-0 opacity-40 grayscale group-hover:grayscale-0 transition duration-1000">
        <iframe 
          className="w-full h-full object-cover scale-110"
          src={`${videoUrl}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoUrl.split('/').pop()}`}
          title="background-video"
          frameBorder="0" 
          allow="autoplay"
        ></iframe>
      </div>
    )}
    <div className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent"></div>
    <div className="relative p-12 lg:p-20 flex flex-col items-start justify-center max-w-2xl">
      <h2 className="text-4xl lg:text-6xl font-black text-white mb-6 tracking-tight animate-fade-in-up leading-tight">
        {title}
      </h2>
      <p className="text-lg lg:text-xl text-indigo-100 font-medium opacity-90 leading-relaxed">
        {subtitle}
      </p>
    </div>
  </div>
);

// --- Page Components ---

const MusicPage = ({ musicList }: { musicList: Music[] }) => {
  const [downloading, setDownloading] = useState<Record<string, 'idle' | 'loading' | 'success'>>({});
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'submitting' | 'success'>('idle');

  const handleDownload = (id: string) => {
    setDownloading(prev => ({ ...prev, [id]: 'loading' }));
    
    setTimeout(() => {
      setDownloading(prev => ({ ...prev, [id]: 'success' }));
      
      setTimeout(() => {
        setDownloading(prev => ({ ...prev, [id]: 'idle' }));
      }, 3000);
    }, 3000);
  };

  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitStatus('submitting');
    setTimeout(() => {
      setSubmitStatus('success');
      setTimeout(() => {
        setIsSubmitModalOpen(false);
        setSubmitStatus('idle');
      }, 2000);
    }, 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <SectionHeader 
        title="Vibe with the Word" 
        subtitle="The ultimate teen soundtrack. Fresh beats, eternal truths. Download your favorites or share your own sound." 
        videoUrl={POPPING_VIDEOS[1]}
      />

      <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
        <div className="flex gap-3 bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm overflow-x-auto w-full md:w-auto">
          {['All', 'Worship', 'Hip-Hop', 'Pop', 'Acoustic'].map(cat => (
            <button key={cat} className={`px-6 py-2.5 rounded-xl font-black text-sm transition-all whitespace-nowrap ${cat === 'All' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50'}`}>
              {cat}
            </button>
          ))}
        </div>
        <button 
          onClick={() => setIsSubmitModalOpen(true)}
          className="bg-black text-white px-8 py-4 rounded-[1.25rem] font-black hover:scale-105 transition shadow-xl shadow-gray-200 flex items-center space-x-3 w-full md:w-auto justify-center"
        >
          <i className="fas fa-plus"></i>
          <span>Submit Your Track</span>
        </button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {musicList.map(m => (
          <div key={m.id} className="bg-white rounded-[2rem] overflow-hidden shadow-sm border border-gray-100 hover:shadow-2xl transition-all group flex flex-col">
            <div className="relative aspect-square overflow-hidden bg-gray-100">
               <img src={m.thumbnailUrl} alt={m.title} className="w-full h-full object-cover group-hover:scale-110 transition duration-1000" />
               <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-[2px]">
                  <button className="w-16 h-16 bg-white text-indigo-600 rounded-full flex items-center justify-center text-xl shadow-2xl scale-50 group-hover:scale-100 transition duration-500">
                    <i className="fas fa-play"></i>
                  </button>
               </div>
               <span className="absolute top-4 left-4 bg-indigo-600 text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-xl shadow-lg">
                 {m.category}
               </span>

               {downloading[m.id] === 'loading' && (
                 <div className="absolute inset-0 bg-white/90 backdrop-blur-md flex flex-col items-center justify-center animate-fade-in z-20">
                    <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                    <span className="mt-4 text-xs font-black text-indigo-600 uppercase tracking-widest">Downloading...</span>
                 </div>
               )}
               {downloading[m.id] === 'success' && (
                 <div className="absolute inset-0 bg-emerald-600/90 backdrop-blur-md flex flex-col items-center justify-center animate-fade-in z-20">
                    <div className="w-16 h-16 bg-white text-emerald-600 rounded-full flex items-center justify-center text-2xl animate-bounce shadow-xl">
                       <i className="fas fa-check"></i>
                    </div>
                    <span className="mt-4 text-xs font-black text-white uppercase tracking-widest">Saved Successfully!</span>
                 </div>
               )}
            </div>
            <div className="p-8 flex flex-col flex-grow">
              <h3 className="font-black text-xl text-gray-900 mb-1 group-hover:text-indigo-600 transition">{m.title}</h3>
              <p className="text-gray-400 font-bold text-sm mb-6">{m.artist}</p>
              <div className="mt-auto">
                <button 
                  onClick={() => handleDownload(m.id)}
                  disabled={downloading[m.id] === 'loading'}
                  className={`w-full py-4 rounded-2xl font-black text-sm transition-all flex items-center justify-center space-x-2 ${downloading[m.id] === 'loading' ? 'bg-gray-100 text-gray-300' : 'bg-gray-50 text-gray-600 hover:bg-indigo-600 hover:text-white shadow-sm'}`}
                >
                  <i className="fas fa-cloud-arrow-down"></i>
                  <span>{downloading[m.id] === 'loading' ? 'Wait...' : 'Download Track'}</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Submission Modal */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-xl rounded-[2.5rem] p-12 shadow-2xl relative overflow-hidden">
            <button onClick={() => setIsSubmitModalOpen(false)} className="absolute top-8 right-8 text-gray-400 hover:text-gray-900 transition">
              <i className="fas fa-times text-2xl"></i>
            </button>
            
            {submitStatus === 'success' ? (
              <div className="text-center py-10 animate-fade-in">
                <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">
                  <i className="fas fa-check"></i>
                </div>
                <h3 className="text-4xl font-black text-gray-900 mb-3">Vibe Received!</h3>
                <p className="text-gray-500 font-medium">Your track has been submitted for moderation. We'll check your vibe soon!</p>
              </div>
            ) : (
              <>
                <h3 className="text-4xl font-black text-gray-900 mb-2">Share Your Sound</h3>
                <p className="text-gray-400 font-bold text-sm mb-10 uppercase tracking-widest">Inspire the next generation</p>
                <form onSubmit={handleTrackSubmit} className="space-y-6">
                   <div className="space-y-2">
                     <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Track Name</label>
                     <input required type="text" placeholder="e.g. Higher Heights" className="w-full p-5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-indigo-100 outline-none" />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                       <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Artist Name</label>
                       <input required type="text" placeholder="Your moniker" className="w-full p-5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-indigo-100 outline-none" />
                     </div>
                     <div className="space-y-2">
                       <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Category</label>
                       <select className="w-full p-5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-indigo-100 outline-none appearance-none font-bold">
                         <option>Worship</option>
                         <option>Hip-Hop</option>
                         <option>Gospel Pop</option>
                         <option>Acoustic</option>
                       </select>
                     </div>
                   </div>
                   <div className="space-y-2">
                     <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Audio File URL (SoundCloud/Drive/YT)</label>
                     <input required type="url" placeholder="https://..." className="w-full p-5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-indigo-100 outline-none" />
                   </div>
                   <button 
                    disabled={submitStatus === 'submitting'}
                    className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 transition shadow-xl shadow-indigo-100 flex items-center justify-center space-x-3"
                   >
                     {submitStatus === 'submitting' ? <><i className="fas fa-spinner fa-spin"></i> <span>Uploading Vibe...</span></> : 'Submit for Review'}
                   </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const LoginPage = ({ onLogin, onRegister }: { onLogin: (e: string, p: string, r: UserRole) => void, onRegister: (n: string, e: string, p: string, r: UserRole) => void }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('teen');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isRegistering) onRegister(name, email, pass, role);
    else onLogin(email, pass, role);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
      
      <div className="bg-white w-full max-w-md p-10 rounded-[3rem] shadow-2xl border border-gray-100 relative z-10 animate-fade-in">
        <div className="text-center mb-10">
           <div className="bg-indigo-600 inline-flex p-5 rounded-[1.75rem] shadow-xl shadow-indigo-100 mb-6">
              <i className="fas fa-cross text-white text-3xl"></i>
           </div>
           <h2 className="text-4xl font-black text-gray-900 tracking-tight mb-2">TeenFaith+</h2>
           <p className="text-gray-400 font-bold text-sm uppercase tracking-[0.2em]">{isRegistering ? 'Create Profile' : 'Member Login'}</p>
        </div>

        <div className="flex bg-gray-50 p-1.5 rounded-2xl mb-8">
          <button onClick={() => setIsRegistering(false)} className={`flex-1 py-3 rounded-xl text-sm font-black transition-all ${!isRegistering ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>Login</button>
          <button onClick={() => setIsRegistering(true)} className={`flex-1 py-3 rounded-xl text-sm font-black transition-all ${isRegistering ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>Register</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {isRegistering && (
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
              <input required type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Jane Doe" className="w-full p-4.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-indigo-50 outline-none transition" />
            </div>
          )}
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email / Username</label>
            <input required type="text" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="w-full p-4.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-indigo-50 outline-none transition" />
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Password</label>
            <input required type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••••" className="w-full p-4.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-indigo-50 outline-none transition" />
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Select Rank</label>
            <div className="flex gap-3 mt-1">
               <button type="button" onClick={() => setRole('teen')} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all border ${role === 'teen' ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-gray-100 text-gray-400'}`}>Teen Member</button>
               <button type="button" onClick={() => setRole('admin')} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all border ${role === 'admin' ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-white border-gray-100 text-gray-400'}`}>Admin Overseer</button>
            </div>
          </div>
          <button className="w-full py-5 bg-indigo-600 text-white font-black rounded-[1.5rem] hover:bg-indigo-700 transition shadow-xl shadow-indigo-100 transform active:scale-95">
            {isRegistering ? 'Join the Community' : 'Enter Portal'}
          </button>
        </form>
      </div>
    </div>
  );
};

// --- Main App Entry ---

const App: React.FC = () => {
  const [authState, setAuthState] = useState<AuthState>({ user: null, isAuthenticated: false });
  const [currentPage, setCurrentPage] = useState<string>('home');

  useEffect(() => {
    // Session load
    const user = localStorage.getItem('tf_session');
    if (user) setAuthState({ user: JSON.parse(user), isAuthenticated: true });
  }, []);

  const handleLogin = (email: string, pass: string, role: UserRole) => {
    const users = getStoredUsers();
    const found = users.find((u: any) => (u.email === email || u.name === email) && u.password === pass);
    if (found || email === 'Consi') { // Special seeded admin
       const sessionUser = found ? { id: found.id, name: found.name, email: found.email, role } : { id: '1', name: 'Consi', email: 'Consi', role: 'admin' as UserRole };
       setAuthState({ user: sessionUser, isAuthenticated: true });
       localStorage.setItem('tf_session', JSON.stringify(sessionUser));
       setCurrentPage('home');
    } else alert("Credentials not found. Try registering!");
  };

  const handleRegister = (name: string, email: string, pass: string, role: UserRole) => {
    const users = getStoredUsers();
    const newUser = { id: Date.now().toString(), name, email, password: pass, role };
    setStoredUsers([...users, newUser]);
    const sessionUser = { id: newUser.id, name, email, role };
    setAuthState({ user: sessionUser, isAuthenticated: true });
    localStorage.setItem('tf_session', JSON.stringify(sessionUser));
    setCurrentPage('home');
  };

  const handleLogout = () => {
    setAuthState({ user: null, isAuthenticated: false });
    localStorage.removeItem('tf_session');
    setCurrentPage('login');
  };

  const renderContent = () => {
    if (!authState.isAuthenticated) return <LoginPage onLogin={handleLogin} onRegister={handleRegister} />;

    switch (currentPage) {
      case 'home': return (
        <div className="max-w-7xl mx-auto px-4 py-12">
          <SectionHeader 
            title={`Rise & Shine, ${authState.user?.name.split(' ')[0]}`} 
            subtitle="Your daily growth hub. Catch up on sermons, vibes, and growth challenges." 
            videoUrl={POPPING_VIDEOS[0]}
          />
          <div className="grid md:grid-cols-3 gap-8">
            <div onClick={() => setCurrentPage('music')} className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-2 transition-all cursor-pointer group">
               <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-2xl mb-8 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  <i className="fas fa-music"></i>
               </div>
               <h3 className="text-2xl font-black mb-4">Teen Vibes</h3>
               <p className="text-gray-500 font-medium">Download the latest faith tracks and submit your own creations.</p>
            </div>
            <div onClick={() => setCurrentPage('sermons')} className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-2 transition-all cursor-pointer group">
               <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center text-2xl mb-8 group-hover:bg-purple-600 group-hover:text-white transition-all">
                  <i className="fas fa-video"></i>
               </div>
               <h3 className="text-2xl font-black mb-4">Watch Sermons</h3>
               <p className="text-gray-500 font-medium">Powerful messages tailored for the modern teenage soul.</p>
            </div>
            <div onClick={() => setCurrentPage('quizzes')} className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-2 transition-all cursor-pointer group">
               <div className="w-16 h-16 bg-pink-50 text-pink-600 rounded-2xl flex items-center justify-center text-2xl mb-8 group-hover:bg-pink-600 group-hover:text-white transition-all">
                  <i className="fas fa-brain"></i>
               </div>
               <h3 className="text-2xl font-black mb-4">Growth Quizzes</h3>
               <p className="text-gray-500 font-medium">Level up your rank by testing your biblical knowledge.</p>
            </div>
          </div>
        </div>
      );
      case 'music': return <MusicPage musicList={INITIAL_MUSIC} />;
      case 'bible': return <div className="max-w-7xl mx-auto px-4 py-12"><SectionHeader title="Holy Bible" subtitle="Navigate and search the scriptures effortlessly." /></div>;
      case 'sermons': return <div className="max-w-7xl mx-auto px-4 py-12"><SectionHeader title="Teen Sermons" subtitle="Watch life-changing messages." videoUrl={POPPING_VIDEOS[2]} /></div>;
      case 'quizzes': return <div className="max-w-7xl mx-auto px-4 py-12"><SectionHeader title="Growth Quizzes" subtitle="Challenge yourself and level up." /></div>;
      case 'motivation': return <div className="max-w-7xl mx-auto px-4 py-12"><SectionHeader title="AI Soul Lift" subtitle="Personalized guidance powered by Gemini." /></div>;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-inter">
      {authState.isAuthenticated && <Navbar user={authState.user} onLogout={handleLogout} onNavigate={setCurrentPage} currentPage={currentPage} />}
      <main className="flex-grow">
        {renderContent()}
      </main>
      <footer className="bg-white border-t border-gray-100 py-16 text-center">
         <div className="max-w-7xl mx-auto px-4">
            <div className="bg-indigo-600 w-12 h-12 rounded-xl flex items-center justify-center text-white mx-auto mb-6 shadow-xl shadow-indigo-100">
               <i className="fas fa-cross text-xl"></i>
            </div>
            <p className="text-gray-400 font-black uppercase text-xs tracking-[0.3em] mb-4">TeenFaith+</p>
            <p className="text-gray-300 text-sm font-medium">Built for the bold. Built for the faithful. &copy; 2024</p>
         </div>
      </footer>
    </div>
  );
};

export default App;
