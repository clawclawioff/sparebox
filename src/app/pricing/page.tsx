"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Server, Check, ArrowRight, Cpu, HardDrive, Wifi } from "lucide-react";
import { SpareboxLogo } from "@/components/sparebox-logo";

export default function PricingPage() {
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
        <SpareboxLogo variant="full" size="md" href="/" />
        <div className="flex items-center gap-4">
          <Link href="/blog" className="text-stone-500 hover:text-stone-900 transition">
            Blog
          </Link>
          <Link href="/login" className="text-stone-500 hover:text-stone-900 transition">
            Log in
          </Link>
          <Link
            href="/signup"
            className="bg-gradient-to-r from-orange-600 to-orange-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm hover:shadow-md transition"
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
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-stone-900">
            Simple, transparent pricing
          </h1>
          <p className="text-xl text-stone-500 max-w-2xl mx-auto">
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
            className="bg-white border border-stone-200 rounded-2xl p-8 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <Cpu className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="font-semibold text-lg text-stone-900">For Users</h2>
                <p className="text-stone-500 text-sm">Deploy AI agents</p>
              </div>
            </div>

            <div className="mb-6">
              <span className="text-4xl font-bold text-stone-900">$10</span>
              <span className="text-stone-500"> - $15/mo</span>
              <p className="text-stone-400 text-sm mt-1">per agent, varies by host</p>
            </div>

            <ul className="space-y-3 mb-8">
              <PricingFeature>One-click agent deployment</PricingFeature>
              <PricingFeature>Automatic failover & migration</PricingFeature>
              <PricingFeature>Real-time monitoring dashboard</PricingFeature>
              <PricingFeature>Secure Tailscale networking</PricingFeature>
              <PricingFeature>Email support</PricingFeature>
            </ul>

            <Link
              href="/signup?role=deployer"
              className="block w-full text-center bg-stone-100 hover:bg-stone-200 border border-stone-200 text-stone-900 py-3 rounded-xl font-medium transition"
            >
              Deploy an Agent
            </Link>
          </motion.div>

          {/* For Hosts */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-b from-orange-50 to-white border border-orange-200 rounded-2xl p-8 relative overflow-hidden shadow-sm"
          >
            <div className="absolute top-4 right-4 bg-orange-100 text-orange-700 text-xs font-medium px-2 py-1 rounded-full">
              Earn Money
            </div>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                <HardDrive className="w-5 h-5 text-orange-700" />
              </div>
              <div>
                <h2 className="font-semibold text-lg text-stone-900">For Hosts</h2>
                <p className="text-stone-500 text-sm">Monetize hardware</p>
              </div>
            </div>

            <div className="mb-6">
              <span className="text-4xl font-bold text-orange-700">60%</span>
              <span className="text-stone-500"> of subscription</span>
              <p className="text-stone-400 text-sm mt-1">$6-9/mo per agent you host</p>
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
              className="group block w-full text-center bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 text-white py-3 rounded-xl font-medium transition shadow-sm hover:shadow-md"
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
          <h2 className="text-2xl font-bold text-center mb-8 text-stone-900">Host Requirements</h2>
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
          <h2 className="text-2xl font-bold text-center mb-8 text-stone-900">FAQ</h2>
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
          <p className="text-stone-500 mb-4">Ready to join the network?</p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 text-white px-8 py-3 rounded-xl font-medium transition shadow-sm hover:shadow-md"
          >
            Get Started Free
            <ArrowRight className="w-5 h-5" />
          </Link>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-stone-200 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <SpareboxLogo variant="full" size="sm" />
          </div>
          <p className="text-stone-400 text-sm">
            © 2026 Sparebox. Open infrastructure for personal AI.
          </p>
        </div>
      </footer>
    </div>
  );
}

function PricingFeature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2 text-stone-600">
      <Check className="w-5 h-5 text-orange-600 flex-shrink-0" />
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
    <div className="bg-white border border-stone-200 rounded-xl p-6 text-center shadow-sm">
      <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-orange-700 mx-auto mb-3">
        {icon}
      </div>
      <h3 className="font-semibold mb-1 text-stone-900">{title}</h3>
      <p className="text-stone-500 text-sm">{description}</p>
    </div>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm">
      <h3 className="font-semibold mb-2 text-stone-900">{question}</h3>
      <p className="text-stone-500 text-sm">{answer}</p>
    </div>
  );
}
