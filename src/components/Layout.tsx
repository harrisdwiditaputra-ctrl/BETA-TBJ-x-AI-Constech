import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, FileText, Settings, LogOut, Menu, X, Calculator, ExternalLink, Image as ImageIcon, User, Shield, Zap, Terminal, MessageSquare } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Ticker from "./Ticker";
import { TBJ_LOGO_HEADER, TBJ_LOGO_FOOTER } from "@/constants";

interface LayoutProps {
  children: ReactNode;
  user?: any;
  onLogout?: () => void;
  onLogin?: () => void;
}

export default function Layout({ children, user, onLogout, onLogin }: LayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const headerLogo = TBJ_LOGO_HEADER;
  const footerLogo = TBJ_LOGO_FOOTER;

  const isAdmin = user?.role === "admin";
  const isPM = user?.role === "pm";
  const isClient = user?.role === "user";

  const navigation = [
    { name: "AI Agent", href: "/ai-agent", icon: MessageSquare },
    ...(isAdmin || isPM || isClient ? [
      { name: "Proyek RAB", href: "/projects", icon: FileText },
    ] : []),
    ...(isAdmin || isPM ? [
      { name: "Estimasi AI", href: "/assistant", icon: Zap },
    ] : []),
    ...(isAdmin ? [
      { name: "Sistem Admin", href: "/admin", icon: Shield },
    ] : []),
    ...(isPM ? [
      { name: "Manajemen Proyek", href: "/pm", icon: Shield },
    ] : []),
    ...(isClient ? [
      { name: "Estimasi AI", href: "/assistant", icon: Calculator },
      { name: "Dashboard Saya", href: "/profile", icon: LayoutDashboard },
    ] : []),
  ];

  return (
    <div className="min-h-screen bg-[#F1F3F6] flex flex-col sleek-grid overflow-x-hidden font-sans">
      {/* Floating Ticker handled internally with fixed positioning */}
      <Ticker />
      
      {/* Header */}
      <header className="bg-white/60 backdrop-blur-md border-b border-white/40 sticky top-0 z-40 shadow-[0_4px_12px_rgba(163,177,198,0.15)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20">
            <div className="flex items-center">
              <Link to="/" className="flex-shrink-0 flex items-center gap-3 group">
                <div className="w-11 h-11 flex items-center justify-center transition-transform group-hover:rotate-6 rounded-xl overflow-hidden border border-white bg-white/80 shadow-[4px_4px_10px_rgba(0,0,0,0.06)]">
                  <img 
                    src={headerLogo} 
                    alt="TBJ Logo" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="font-campton-book font-bold text-2xl tracking-tighter uppercase leading-none text-[#ff6B00]">TBJ</span>
                  <span className="text-[9px] font-avenir-medium uppercase tracking-[0.2em] text-[#ff6B00]">Constech Hub</span>
                </div>
              </Link>
              <nav className="hidden md:ml-12 md:flex md:space-x-1 font-sans">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      "px-4 py-2 text-[10px] font-avenir-medium uppercase tracking-widest transition-all rounded-xl",
                      location.pathname === item.href
                        ? "bg-[#ff6B00] text-white shadow-[0_4px_12px_rgba(255,107,0,0.35)]"
                        : "text-neutral-500 hover:text-[#ff6B00] hover:bg-white/40"
                    )}
                  >
                    {item.name}
                  </Link>
                ))}
              </nav>
            </div>
            <div className="hidden md:flex items-center gap-6">
              {user ? (
                <div className="flex items-center gap-4 pl-6 border-l border-neutral-200">
                  <div className="text-right">
                    <p className="text-[11px] font-avenir-medium font-bold uppercase tracking-wider text-neutral-800">{user.displayName}</p>
                    <p className="text-[10px] font-mono text-neutral-400">{user.email}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={onLogout} className="hover:bg-[#ff6B00]/10 hover:text-[#ff6B00] rounded-xl transition-all duration-300">
                    <LogOut className="w-4 h-4 text-neutral-500" />
                  </Button>
                </div>
              ) : (
                <Button variant="default" className="btn-sleek h-10 px-6 text-[10.5px] font-avenir-medium" onClick={onLogin}>Login</Button>
              )}
            </div>
            <div className="flex items-center md:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="rounded-md"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-neutral-200">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "block px-3 py-2 rounded-md text-base font-medium",
                    location.pathname === item.href
                      ? "bg-neutral-100 text-black"
                      : "text-neutral-500 hover:text-black hover:bg-neutral-50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-5 h-5" />
                    {item.name}
                  </div>
                </Link>
              ))}
              {user && (
                <button
                  onClick={onLogout}
                  className="w-full text-left block px-3 py-2 rounded-md text-base font-medium text-neutral-500 hover:text-black hover:bg-neutral-50"
                >
                  <div className="flex items-center gap-3">
                    <LogOut className="w-5 h-5" />
                    Logout
                  </div>
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-grow overflow-hidden">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 overflow-hidden">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-neutral-100 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex flex-col items-center md:items-start gap-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center rounded-xl overflow-hidden border border-neutral-200 bg-white">
                <img 
                  src={footerLogo} 
                  alt="TBJ Logo" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <span className="font-black text-lg tracking-tighter uppercase">Tukang Bangunan Jakarta</span>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
              Tech-Driven Construction Solutions
            </p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 items-center">
            <a href="https://www.instagram.com/tukang.bangunan.jakarta/" target="_blank" rel="noopener noreferrer" className="text-neutral-400 hover:text-accent transition-colors flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest">@tukang.bangunan.jakarta</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <a href="https://www.google.com/search?q=Tukang+Bangunan+Jakarta&stick=H4sIAAAAAAAA_-NgU1I1qDBKNbO0SDG3NEkxSU5NtjC0MqgwSTZKTLWwsDA0MTY2MrMwWsQqHlKanZiXruAEJErzEvMUvBKzE4tKEgG7l7KGQwAAAA&hl=id&mat=CSWC37g7HepEElYBTVDHnh8QGuKxe3fzpQOfm7m6YZnN684KAHiUCBz7clraMqVOeYDtCGZPtAJcSYUe0My46hcpQMmvYQI0gnUOMvKh5vid8Y5oy-5fNkrFU5rQcO5stw&authuser=0" target="_blank" rel="noopener noreferrer" className="text-neutral-400 hover:text-accent transition-colors flex items-center gap-2">
              <span className="uppercase-soft">Google</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <Link to="/terms" className="text-neutral-400 hover:text-accent transition-colors">
              <span className="uppercase-soft">Terms & Conditions</span>
            </Link>
          </div>

          <p className="text-neutral-400 uppercase-soft">
            &copy; {new Date().getFullYear()} TBJ. Tech Const & Design.
          </p>
        </div>
      </footer>
    </div>
  );
}
