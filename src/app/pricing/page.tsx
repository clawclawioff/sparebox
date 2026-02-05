"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Server, Check, ArrowRight, Cpu, HardDrive, Wifi } from "lucide-react";

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-cyan-500/5 pointer-events-none" />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-cyan-400 rounded-lg flex items-center justify-center">
            <Server className="w-5 h-5 text-gray-900" />
          </div>
          <span className="font-bold text-xl">Sparebox</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-gray-400 hover:text-white transition">
            Log in
          </Link>
          <Link
            href="/signup"
            className="bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-2 rounded-lg font-medium"
          >
            Get Started
          </Link>
        </div>
      </nav>

      <main className="relative z-10 max-w-6xl mx-auto px-6 pt-16 pb-32">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Whether you&apos;re hosting or deploying, our pricing is straightforward.
            Hosts keep 60% of every dollar.
          </p>
        </motion.div>

        {/* Pricing cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* For Users */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/[0.03] border border-white/10 rounded-2xl p-8"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-cyan-500/20 rounded-xl flex items-center justify-center">
                <Cpu className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h2 className="font-semibold text-lg">For Users</h2>
                <p className="text-gray-500 text-sm">Deploy AI agents</p>
              </div>
            </div>

            <div className="mb-6">
              <span className="text-4xl font-bold">$10</span>
              <span className="text-gray-400"> - $15/mo</span>
              <p className="text-gray-500 text-sm mt-1">per agent, varies by host</p>
            </div>

            <ul className="space-y-3 mb-8">
              <PricingFeature>One-click agent deployment</PricingFeature>
              <PricingFeature>Automatic failover & migration</PricingFeature>
              <PricingFeature>Real-time monitoring dashboard</PricingFeature>
              <PricingFeature>Secure Tailscale networking</PricingFeature>
              <PricingFeature>Email support</PricingFeature>
            </ul>

            <Link
              href="/signup?role=user"
              className="block w-full text-center bg-white/5 hover:bg-white/10 border border-white/10 py-3 rounded-xl font-medium transition"
            >
              Deploy an Agent
            </Link>
          </motion.div>

          {/* For Hosts */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-b from-emerald-500/10 to-transparent border border-emerald-500/20 rounded-2xl p-8 relative overflow-hidden"
          >
            <div className="absolute top-4 right-4 bg-emerald-500/20 text-emerald-400 text-xs font-medium px-2 py-1 rounded-full">
              Earn Money
            </div>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                <HardDrive className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="font-semibold text-lg">For Hosts</h2>
                <p className="text-gray-500 text-sm">Monetize hardware</p>
              </div>
            </div>

            <div className="mb-6">
              <span className="text-4xl font-bold text-emerald-400">60%</span>
              <span className="text-gray-400"> of subscription</span>
              <p className="text-gray-500 text-sm mt-1">$6-9/mo per agent you host</p>
            </div>

            <ul className="space-y-3 mb-8">
              <PricingFeature>Keep 60% of every subscription</PricingFeature>
              <PricingFeature>Set your own pricing</PricingFeature>
              <PricingFeature>Lightweight agent software</PricingFeature>
              <PricingFeature>Automatic payouts via Stripe</PricingFeature>
              <PricingFeature>Host multiple agents per machine</PricingFeature>
            </ul>

            <Link
              href="/signup?role=host"
              className="group block w-full text-center bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 py-3 rounded-xl font-medium transition"
            >
              <span className="flex items-center justify-center gap-2">
                Become a Host
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
          </motion.div>
        </div>

        {/* Host requirements */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-20 max-w-4xl mx-auto"
        >
          <h2 className="text-2xl font-bold text-center mb-8">Host Requirements</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            <RequirementCard
              icon={<Cpu className="w-6 h-6" />}
              title="4+ CPU cores"
              description="Modern multi-core processor (2018 or newer)"
            />
            <RequirementCard
              icon={<HardDrive className="w-6 h-6" />}
              title="8GB+ RAM"
              description="More RAM = more agents you can host"
            />
            <RequirementCard
              icon={<Wifi className="w-6 h-6" />}
              title="Stable internet"
              description="Reliable connection with 10+ Mbps upload"
            />
          </div>
        </motion.div>

        {/* FAQ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-20 max-w-3xl mx-auto"
        >
          <h2 className="text-2xl font-bold text-center mb-8">FAQ</h2>
          <div className="space-y-4">
            <FAQItem
              question="How do host payouts work?"
              answer="Hosts are paid monthly via Stripe Connect. We handle all payment processing — you just need a bank account. Payouts happen on the 15th of each month for the previous month's earnings."
            />
            <FAQItem
              question="Can I host from a laptop?"
              answer="Yes! Laptops work great. Just keep it plugged in and connected to the internet. Our software is lightweight and won't affect your normal use."
            />
            <FAQItem
              question="What if a host goes offline?"
              answer="We automatically migrate your agent to another available host. Your agent's state is backed up, so you won't lose any data or configuration."
            />
            <FAQItem
              question="Is my data secure?"
              answer="Absolutely. All communication uses Tailscale's encrypted mesh networking. Agents run in isolated Docker containers with strict resource limits. Hosts cannot access your agent's data."
            />
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-20 text-center"
        >
          <p className="text-gray-400 mb-4">Ready to join the network?</p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 px-8 py-3 rounded-xl font-medium transition"
          >
            Get Started Free
            <ArrowRight className="w-5 h-5" />
          </Link>
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
    </div>
  );
}

function PricingFeature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2 text-gray-300">
      <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
      {children}
    </li>
  );
}

function RequirementCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white/[0.03] border border-white/5 rounded-xl p-6 text-center">
      <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400 mx-auto mb-3">
        {icon}
      </div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-gray-500 text-sm">{description}</p>
    </div>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="bg-white/[0.03] border border-white/5 rounded-xl p-6">
      <h3 className="font-semibold mb-2">{question}</h3>
      <p className="text-gray-400 text-sm">{answer}</p>
    </div>
  );
}
