"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Server, Cpu, Shield, DollarSign, Zap, Globe, Users, Box } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#030712] text-white overflow-hidden">
      {/* Animated background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-cyan-500/5 pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-900/20 via-transparent to-transparent pointer-events-none" />
      
      {/* Subtle grid pattern */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2"
        >
          <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-cyan-400 rounded-lg flex items-center justify-center">
            <Box className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl">Sparebox</span>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-4"
        >
          <Link href="/pricing" className="text-gray-400 hover:text-white transition">
            Pricing
          </Link>
          <Link href="/login" className="text-gray-400 hover:text-white transition">
            Log in
          </Link>
          <Link
            href="/signup"
            className="bg-violet-500 hover:bg-violet-400 px-4 py-2 rounded-lg font-medium transition"
          >
            Get Started
          </Link>
        </motion.div>
      </nav>

      {/* Hero */}
      <main className="relative z-10 max-w-6xl mx-auto px-6 pt-20 pb-32">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 px-4 py-1.5 rounded-full text-sm text-violet-400 mb-6"
          >
            <Zap className="w-4 h-4" />
            <span>Beta — Join the P2P AI network</span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-5xl md:text-7xl font-bold mb-6 leading-tight tracking-tight"
          >
            Your hardware.{" "}
            <span className="bg-gradient-to-r from-violet-400 via-cyan-400 to-violet-400 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
              Their agents.
            </span>
            <br />
            Everyone wins.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            The P2P marketplace for AI compute. Hosts earn passive income from idle hardware. 
            Users deploy AI agents in minutes. No DevOps required.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link
              href="/signup?role=host"
              className="group bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-400 hover:to-violet-500 px-8 py-4 rounded-xl font-medium text-lg transition flex items-center justify-center gap-2 shadow-lg shadow-violet-500/25"
            >
              Start Earning
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/signup?role=user"
              className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 px-8 py-4 rounded-xl font-medium text-lg transition"
            >
              Deploy an Agent
            </Link>
          </motion.div>
        </div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="grid grid-cols-3 gap-8 mt-20 max-w-2xl mx-auto"
        >
          <Stat value="$10" label="per month" sublabel="Starting at" />
          <Stat value="60%" label="to hosts" sublabel="Revenue" />
          <Stat value="2 min" label="to deploy" sublabel="Setup" />
        </motion.div>

        {/* Features bento grid */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-32"
        >
          <FeatureCard
            icon={<DollarSign className="w-6 h-6" />}
            title="Passive Income"
            description="Your old laptop could be earning $50/month right now. Set it, forget it, get paid."
            className="lg:col-span-1"
          />
          <FeatureCard
            icon={<Cpu className="w-6 h-6" />}
            title="Deploy in Minutes"
            description="Pick a host. Click deploy. Your AI agent is live. No server config, no Docker, no pain."
            className="lg:col-span-1"
          />
          <FeatureCard
            icon={<Shield className="w-6 h-6" />}
            title="Secure by Default"
            description="Isolated containers. Encrypted networking. Your data stays yours."
            className="lg:col-span-1"
          />
          <FeatureCard
            icon={<Globe className="w-6 h-6" />}
            title="Global Network"
            description="Hosts everywhere means agents everywhere. Low latency, high availability, no single point of failure."
            className="lg:col-span-2"
            large
          />
          <FeatureCard
            icon={<Users className="w-6 h-6" />}
            title="Real People, Real Hardware"
            description="Not a faceless datacenter. A network of individuals with machines to spare."
            className="lg:col-span-1"
          />
        </motion.div>

        {/* How it works */}
        <div className="mt-32">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-bold text-center mb-4 tracking-tight"
          >
            Simple by design
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-gray-400 text-center mb-12 max-w-xl mx-auto"
          >
            Complex under the hood. Dead simple on the surface.
          </motion.p>
          <div className="grid md:grid-cols-3 gap-8">
            <StepCard
              number="1"
              title="Install the agent"
              description="Hosts run one command. Our software handles the rest — security, networking, updates."
              delay={0.1}
            />
            <StepCard
              number="2"
              title="Deploy your AI"
              description="Users pick a host and click deploy. Agent live in under 2 minutes."
              delay={0.2}
            />
            <StepCard
              number="3"
              title="Everyone wins"
              description="Hosts earn $7.20 on every $12 subscription. Users get reliable AI hosting. Hardware finds purpose."
              delay={0.3}
            />
          </div>
        </div>

        {/* Pricing Preview */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-32"
        >
          <div className="bg-gradient-to-b from-violet-500/10 to-transparent border border-violet-500/20 rounded-3xl p-8 md:p-12">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">
                Transparent pricing. No surprises.
              </h2>
              <p className="text-gray-400 mb-8">
                $12/month. Host gets $7.20. We get $4.80. That&apos;s it.
              </p>
              
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div className="bg-white/5 rounded-2xl p-6 text-left">
                  <div className="text-sm text-violet-400 font-medium mb-2">For Hosts</div>
                  <div className="text-3xl font-bold mb-1">60%</div>
                  <div className="text-gray-400 text-sm">of every subscription, paid monthly</div>
                </div>
                <div className="bg-white/5 rounded-2xl p-6 text-left">
                  <div className="text-sm text-cyan-400 font-medium mb-2">For Users</div>
                  <div className="text-3xl font-bold mb-1">$10-15</div>
                  <div className="text-gray-400 text-sm">per agent, per month</div>
                </div>
              </div>

              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 text-violet-400 hover:text-violet-300 font-medium"
              >
                See full pricing details
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-32 text-center"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">
            Ready to join the network?
          </h2>
          <p className="text-gray-400 mb-8 max-w-md mx-auto">
            Got spare hardware? Start earning. Need AI hosting? Deploy in minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="bg-violet-500 hover:bg-violet-400 px-8 py-3 rounded-xl font-medium transition shadow-lg shadow-violet-500/25"
            >
              Create Account
            </Link>
            <Link
              href="/pricing"
              className="bg-white/5 hover:bg-white/10 border border-white/10 px-8 py-3 rounded-xl font-medium transition"
            >
              View Pricing
            </Link>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-violet-500 to-cyan-400 rounded flex items-center justify-center">
              <Box className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold">Sparebox</span>
          </div>
          <p className="text-gray-500 text-sm">
            © 2026 Sparebox. Open infrastructure for personal AI.
          </p>
        </div>
      </footer>

      {/* CSS for gradient animation */}
      <style jsx global>{`
        @keyframes gradient {
          0%, 100% { background-position: 0% center; }
          50% { background-position: 100% center; }
        }
        .animate-gradient {
          animation: gradient 3s ease infinite;
        }
      `}</style>
    </div>
  );
}

function Stat({
  value,
  label,
  sublabel,
}: {
  value: string;
  label: string;
  sublabel: string;
}) {
  return (
    <div className="text-center">
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{sublabel}</p>
      <p className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
        {value}
      </p>
      <p className="text-gray-400 text-sm">{label}</p>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  className = "",
  large = false,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  className?: string;
  large?: boolean;
}) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className={`bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-white/10 rounded-2xl p-6 transition-colors ${large ? "p-8" : ""} ${className}`}
    >
      <div className="w-12 h-12 bg-gradient-to-br from-violet-500/20 to-cyan-500/20 rounded-xl flex items-center justify-center text-violet-400 mb-4">
        {icon}
      </div>
      <h3 className={`font-semibold mb-2 ${large ? "text-xl" : "text-lg"}`}>{title}</h3>
      <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
    </motion.div>
  );
}

function StepCard({
  number,
  title,
  description,
  delay,
}: {
  number: string;
  title: string;
  description: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay }}
      className="text-center"
    >
      <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-cyan-400 rounded-2xl flex items-center justify-center text-2xl font-bold mx-auto mb-4 shadow-lg shadow-violet-500/25">
        {number}
      </div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
    </motion.div>
  );
}
