import { ShieldCheck, UserCheck, HeartHandshake, Lock } from "lucide-react";

export function Safety() {
  return (
    <section className="px-4 py-24 bg-emerald-900 text-white relative overflow-hidden">
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
      
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4 flex items-center justify-center gap-3">
            <ShieldCheck className="w-8 h-8 text-emerald-400" />
            Built to keep young people safe
          </h2>
          <p className="text-emerald-100/80">Safety comes first, not as an afterthought.</p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-emerald-800/50 backdrop-blur-sm p-8 rounded-2xl border border-emerald-700/50 hover:bg-emerald-800 transition-colors">
            <UserCheck className="w-10 h-10 text-emerald-400 mb-4" />
            <h3 className="text-xl font-bold mb-2">Verified professionals</h3>
            <p className="text-emerald-100/80 text-sm leading-relaxed">Our team manually reviews every professional&apos;s background before their profile goes live to students.</p>
          </div>
          <div className="bg-emerald-800/50 backdrop-blur-sm p-8 rounded-2xl border border-emerald-700/50 hover:bg-emerald-800 transition-colors">
            <HeartHandshake className="w-10 h-10 text-emerald-400 mb-4" />
            <h3 className="text-xl font-bold mb-2">Parental consent</h3>
            <p className="text-emerald-100/80 text-sm leading-relaxed">Students under 18 are activated only after a parent or guardian explicitly agrees via email.</p>
          </div>
          <div className="bg-emerald-800/50 backdrop-blur-sm p-8 rounded-2xl border border-emerald-700/50 hover:bg-emerald-800 transition-colors">
            <Lock className="w-10 h-10 text-emerald-400 mb-4" />
            <h3 className="text-xl font-bold mb-2">Privacy by design</h3>
            <p className="text-emerald-100/80 text-sm leading-relaxed">Messaging opens only after a session is accepted, and personal emails are never shown to other users.</p>
          </div>
        </div>
      </div>
    </section>
  );
}