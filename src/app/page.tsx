"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Server, Cpu, Shield, DollarSign, Zap, Globe, Users } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-950 text-white overflow-hidden">
      {/* Animated background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-cyan-500/5 pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-transparent to-transparent pointer-events-none" />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2"
        >
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-cyan-400 rounded-lg flex items-center justify-center">
            <Server className="w-5 h-5 text-gray-900" />
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
            className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 px-4 py-2 rounded-lg font-medium transition"
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
            className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 rounded-full text-sm text-emerald-400 mb-6"
          >
            <Zap className="w-4 h-4" />
            <span>Now in beta — join the network</span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-5xl md:text-7xl font-bold mb-6 leading-tight"
          >
            Turn spare hardware into{" "}
            <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
              AI infrastructure
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto"
          >
            A peer-to-peer marketplace connecting idle computers with people who want
            to run AI agents. Hosts earn passive income. Users get simple deployment.
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
              className="group bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 px-8 py-4 rounded-xl font-medium text-lg transition flex items-center justify-center gap-2"
            >
              Become a Host
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/signup?role=user"
              className="bg-white/5 hover:bg-white/10 border border-white/10 px-8 py-4 rounded-xl font-medium text-lg transition"
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
          <Stat value="60%" label="to hosts" sublabel="Earnings" />
          <Stat value="24/7" label="uptime" sublabel="Target" />
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
            title="Earn Passive Income"
            description="Turn your old laptop into $20-30/month. Set it and forget it."
            className="lg:col-span-1"
          />
          <FeatureCard
            icon={<Cpu className="w-6 h-6" />}
            title="One-Click Deploy"
            description="Deploy your AI agent in minutes. No server management required."
            className="lg:col-span-1"
          />
          <FeatureCard
            icon={<Shield className="w-6 h-6" />}
            title="Secure & Isolated"
            description="Docker containers + encrypted networking. Your data stays yours."
            className="lg:col-span-1"
          />
          <FeatureCard
            icon={<Globe className="w-6 h-6" />}
            title="Global Network"
            description="Hosts around the world means low-latency agents wherever you are."
            className="lg:col-span-2"
            large
          />
          <FeatureCard
            icon={<Users className="w-6 h-6" />}
            title="Community Powered"
            description="Real people, real hardware. Not faceless datacenters."
            className="lg:col-span-1"
          />
        </motion.div>

        {/* How it works */}
        <div className="mt-32">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-bold text-center mb-4"
          >
            How it works
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-gray-400 text-center mb-12 max-w-xl mx-auto"
          >
            Three simple steps to join the distributed AI revolution
          </motion.p>
          <div className="grid md:grid-cols-3 gap-8">
            <StepCard
              number="1"
              title="Install the agent"
              description="Hosts run our lightweight software on any spare computer. It handles everything."
              delay={0.1}
            />
            <StepCard
              number="2"
              title="Deploy your AI"
              description="Users pick a host and deploy their OpenClaw agent with a single click."
              delay={0.2}
            />
            <StepCard
              number="3"
              title="Everyone wins"
              description="Hosts earn monthly income. Users get affordable AI hosting. Hardware finds purpose."
              delay={0.3}
            />
          </div>
        </div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-32 text-center"
        >
          <div className="bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 rounded-3xl p-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to get started?
            </h2>
            <p className="text-gray-400 mb-8 max-w-md mx-auto">
              Join the network today. Whether you have spare hardware or need an AI agent hosted, we&apos;ve got you covered.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/signup"
                className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 px-8 py-3 rounded-xl font-medium transition"
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
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-emerald-400 to-cyan-400 rounded flex items-center justify-center">
              <Server className="w-4 h-4 text-gray-900" />
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
      <p className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
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
      className={`bg-white/[0.03] border border-white/5 rounded-2xl p-6 ${large ? "p-8" : ""} ${className}`}
    >
      <div className="w-12 h-12 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 rounded-xl flex items-center justify-center text-emerald-400 mb-4">
        {icon}
      </div>
      <h3 className={`font-semibold mb-2 ${large ? "text-xl" : "text-lg"}`}>{title}</h3>
      <p className="text-gray-400 text-sm">{description}</p>
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
      <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-2xl flex items-center justify-center text-2xl font-bold mx-auto mb-4">
        {number}
      </div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-gray-400 text-sm">{description}</p>
    </motion.div>
  );
}
