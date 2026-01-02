import Background3D from '@/components/Background3D';
import CommandCenter from '@/components/CommandCenter';

export default function Home() {
  return (
    <main className="relative min-h-screen text-white overflow-hidden selection:bg-nexa-primary selection:text-black">

      {/* 1. Immersive Background */}
      <Background3D />

      {/* 2. Top Dashboard (Upper Deck) */}
      <section className="relative z-10 p-8 grid grid-cols-1 md:grid-cols-4 gap-6 max-w-7xl mx-auto pt-20">
        <div className="md:col-span-2 md:row-span-2 min-h-[300px] glass-panel rounded-3xl p-8 flex flex-col justify-center items-center neon-glow">
          <h1 className="text-6xl font-bold tracking-tighter mb-4 text-glow">
            NEXA<span className="text-nexa-primary">.OS</span>
          </h1>
          <p className="text-nexa-primary/60 font-mono text-sm tracking-widest uppercase">
            System Online • v2.0.4
          </p>
        </div>

        <div className="glass-panel rounded-3xl p-6 h-[200px] hover:border-nexa-primary/50 transition-colors cursor-pointer group">
          <h2 className="text-xl font-medium mb-2 text-gray-400 group-hover:text-white transition-colors">Active Agents</h2>
          <div className="text-4xl font-mono text-nexa-secondary">03</div>
        </div>

        <div className="glass-panel rounded-3xl p-6 h-[200px] hover:border-nexa-primary/50 transition-colors cursor-pointer group">
          <h2 className="text-xl font-medium mb-2 text-gray-400 group-hover:text-white transition-colors">System Load</h2>
          <div className="text-4xl font-mono text-green-400">12%</div>
        </div>
      </section>

      {/* 3. Bottom Command Center (Lower Deck) */}
      <CommandCenter />

    </main>
  );
}
