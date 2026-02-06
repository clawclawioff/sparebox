"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Server, Cpu, Shield, DollarSign, Zap, Globe, Users, Box, Check } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function Home() {
  return (
    <div className="min-h-screen bg-amber-50 text-stone-900 overflow-hidden">
      {/* Subtle warm gradient background */}
      <div className="fixed inset-0 bg-gradient-to-b from-orange-50 via-amber-50 to-amber-100/50 pointer-events-none" />
      
      {/* Subtle texture */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2"
        >
          <div className="w-8 h-8 bg-gradient-to-br from-orange-600 to-orange-700 rounded-lg flex items-center justify-center shadow-sm">
            <Box className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl text-stone-800">Sparebox</span>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-4"
        >
          <Link href="/pricing" className="text-stone-600 hover:text-stone-900 transition">
            Pricing
          </Link>
          <Link href="/login" className="text-stone-600 hover:text-stone-900 transition">
            Log in
          </Link>
          <Link
            href="/signup"
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium transition shadow-sm"
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
            className="inline-flex items-center gap-2 bg-orange-100 border border-orange-200 px-4 py-1.5 rounded-full text-sm text-orange-700 mb-6"
          >
            <Zap className="w-4 h-4" />
            <span>Beta — Join the P2P AI network</span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-5xl md:text-7xl font-bold mb-6 leading-tight tracking-tight text-stone-900"
          >
            Your hardware.{" "}
            <span className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-600 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
              Their agents.
            </span>
            <br />
            Everyone wins.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-xl text-stone-600 mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            The P2P marketplace for AI compute. Hosts earn passive income from idle hardware. 
            Users deploy AI agents in minutes. No DevOps required.
          </motion.p>

          {/* Waitlist */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="max-w-md mx-auto mb-8"
          >
            <WaitlistForm />
          </motion.div>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link
              href="/signup?role=host"
              className="group bg-orange-600 hover:bg-orange-700 text-white px-8 py-4 rounded-xl font-medium text-lg transition flex items-center justify-center gap-2 shadow-md shadow-orange-600/20"
            >
              Start Earning
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/signup?role=user"
              className="bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 px-8 py-4 rounded-xl font-medium text-lg transition shadow-sm"
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
            className="text-3xl md:text-4xl font-bold text-center mb-4 tracking-tight text-stone-900"
          >
            Simple by design
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-stone-600 text-center mb-12 max-w-xl mx-auto"
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
          <div className="bg-white border border-stone-200 rounded-3xl p-8 md:p-12 shadow-sm">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight text-stone-900">
                Transparent pricing. No surprises.
              </h2>
              <p className="text-stone-600 mb-8">
                $12/month. Host gets $7.20. We get $4.80. That&apos;s it.
              </p>
              
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div className="bg-orange-50 border border-orange-100 rounded-2xl p-6 text-left">
                  <div className="text-sm text-orange-700 font-medium mb-2">For Hosts</div>
                  <div className="text-3xl font-bold text-stone-900 mb-1">60%</div>
                  <div className="text-stone-600 text-sm">of every subscription, paid monthly</div>
                </div>
                <div className="bg-lime-50 border border-lime-100 rounded-2xl p-6 text-left">
                  <div className="text-sm text-lime-700 font-medium mb-2">For Users</div>
                  <div className="text-3xl font-bold text-stone-900 mb-1">$10-15</div>
                  <div className="text-stone-600 text-sm">per agent, per month</div>
                </div>
              </div>

              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 font-medium"
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
          <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight text-stone-900">
            Ready to join the network?
          </h2>
          <p className="text-stone-600 mb-8 max-w-md mx-auto">
            Got spare hardware? Start earning. Need AI hosting? Deploy in minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-3 rounded-xl font-medium transition shadow-md shadow-orange-600/20"
            >
              Create Account
            </Link>
            <Link
              href="/pricing"
              className="bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 px-8 py-3 rounded-xl font-medium transition shadow-sm"
            >
              View Pricing
            </Link>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-stone-200 bg-white/50 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-orange-600 to-orange-700 rounded flex items-center justify-center">
              <Box className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-stone-800">Sparebox</span>
          </div>
          <p className="text-stone-500 text-sm">
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
      <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">{sublabel}</p>
      <p className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
        {value}
      </p>
      <p className="text-stone-600 text-sm">{label}</p>
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
      className={`bg-white hover:bg-stone-50 border border-stone-200 hover:border-stone-300 rounded-2xl p-6 transition-all shadow-sm ${large ? "p-8" : ""} ${className}`}
    >
      <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-amber-100 rounded-xl flex items-center justify-center text-orange-600 mb-4">
        {icon}
      </div>
      <h3 className={`font-semibold text-stone-900 mb-2 ${large ? "text-xl" : "text-lg"}`}>{title}</h3>
      <p className="text-stone-600 text-sm leading-relaxed">{description}</p>
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
      <div className="w-14 h-14 bg-gradient-to-br from-orange-600 to-amber-600 rounded-2xl flex items-center justify-center text-2xl font-bold text-white mx-auto mb-4 shadow-md shadow-orange-600/20">
        {number}
      </div>
      <h3 className="font-semibold text-lg text-stone-900 mb-2">{title}</h3>
      <p className="text-stone-600 text-sm leading-relaxed">{description}</p>
    </motion.div>
  );
}

function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const joinMutation = trpc.waitlist.join.useMutation({
    onSuccess: () => {
      setSubmitted(true);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    joinMutation.mutate({ email, source: "landing" });
  };

  if (submitted) {
    return (
      <div className="flex items-center justify-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-xl py-3 px-4">
        <Check className="w-5 h-5" />
        <span className="font-medium">You&apos;re on the list!</span>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-stone-500 mb-3 text-center">
        Join the waitlist — be first to know when we launch.
      </p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          className="flex-1 bg-white border border-stone-300 rounded-xl px-4 py-2.5 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />
        <button
          type="submit"
          disabled={joinMutation.isPending}
          className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl font-medium transition shadow-sm whitespace-nowrap"
        >
          {joinMutation.isPending ? "..." : "Join"}
        </button>
      </form>
    </div>
  );
}
