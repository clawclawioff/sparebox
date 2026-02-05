import Link from "next/link";
import { ArrowRight, Server, Cpu, Shield, DollarSign } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
            <Server className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl">Sparebox</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-gray-400 hover:text-white transition">
            Log in
          </Link>
          <Link
            href="/signup"
            className="bg-emerald-500 hover:bg-emerald-600 px-4 py-2 rounded-lg font-medium transition"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="max-w-6xl mx-auto px-6 pt-20 pb-32">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Turn spare hardware into{" "}
            <span className="text-emerald-400">AI infrastructure</span>
          </h1>
          <p className="text-xl text-gray-400 mb-8">
            A peer-to-peer marketplace connecting idle computers with people who want
            to run AI agents. Hosts earn passive income. Users get simple deployment.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup?role=host"
              className="bg-emerald-500 hover:bg-emerald-600 px-6 py-3 rounded-lg font-medium text-lg transition flex items-center justify-center gap-2"
            >
              Become a Host <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/signup?role=user"
              className="bg-gray-800 hover:bg-gray-700 border border-gray-700 px-6 py-3 rounded-lg font-medium text-lg transition"
            >
              Deploy an Agent
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-24">
          <FeatureCard
            icon={<DollarSign className="w-6 h-6" />}
            title="Earn Passive Income"
            description="Turn your old laptop into $20-30/month. Set it and forget it."
          />
          <FeatureCard
            icon={<Cpu className="w-6 h-6" />}
            title="One-Click Deploy"
            description="Deploy your AI agent in minutes. No server management required."
          />
          <FeatureCard
            icon={<Shield className="w-6 h-6" />}
            title="Secure & Isolated"
            description="Docker containers + encrypted networking. Your data stays yours."
          />
          <FeatureCard
            icon={<Server className="w-6 h-6" />}
            title="Community Powered"
            description="A network of real people hosting real hardware. Not faceless datacenters."
          />
        </div>

        {/* How it works */}
        <div className="mt-32">
          <h2 className="text-3xl font-bold text-center mb-12">How it works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <StepCard
              number="1"
              title="For Hosts"
              description="Install our lightweight agent on any spare computer. It runs in the background and manages AI workloads."
            />
            <StepCard
              number="2"
              title="For Users"
              description="Pick a host, configure your OpenClaw agent, and deploy. We handle the networking and monitoring."
            />
            <StepCard
              number="3"
              title="Everyone Wins"
              description="Hosts earn monthly income. Users get affordable AI hosting. Old hardware finds new purpose."
            />
          </div>
        </div>

        {/* Pricing preview */}
        <div className="mt-32 text-center">
          <h2 className="text-3xl font-bold mb-4">Simple Pricing</h2>
          <p className="text-gray-400 mb-8">
            $10-15/month per agent. Hosts keep 60%. No hidden fees.
          </p>
          <Link
            href="/pricing"
            className="text-emerald-400 hover:text-emerald-300 font-medium"
          >
            View pricing details →
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-emerald-500 rounded flex items-center justify-center">
              <Server className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold">Sparebox</span>
          </div>
          <p className="text-gray-500 text-sm">
            © 2026 Sparebox. Open infrastructure for personal AI.
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
      <div className="w-12 h-12 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-400 mb-4">
        {icon}
      </div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-gray-400 text-sm">{description}</p>
    </div>
  );
}

function StepCard({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
        {number}
      </div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </div>
  );
}
