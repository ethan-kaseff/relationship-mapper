"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import {
  Building2,
  Shield,
  Heart,
  MessageSquare,
  ExternalLink,
  Calendar,
  History,
  Globe,
  BarChart3,
  Star,
  GitBranch,
  TrendingUp,
  Users,
  Landmark,
  Network,
  ArrowRight,
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
};

const features = [
  { icon: Building2, title: "Partner & Organization Management", description: "Track organizations, their roles, and key contacts all in one place." },
  { icon: Shield, title: "Role-Based Access Control", description: "Fine-grained permissions for admins, office users, and connectors." },
  { icon: Heart, title: "Relationship Tracking", description: "Map who knows whom and the strength of every connection." },
  { icon: MessageSquare, title: "Connection Logging", description: "Record every interaction with dates, notes, and context." },
  { icon: ExternalLink, title: "Connector Portal", description: "Give external stakeholders a simple way to log their own interactions." },
  { icon: Calendar, title: "Event Management & RSVP", description: "Plan events, send invitations, and track attendance." },
  { icon: History, title: "Role Assignment History", description: "See the full timeline of who held which role and when." },
  { icon: Globe, title: "Multi-Office Support", description: "Data isolation between offices with optional cross-office views." },
  { icon: BarChart3, title: "Dashboard Analytics", description: "At-a-glance metrics for people, partners, relationships, and more." },
  { icon: Star, title: "Priority-Based Classification", description: "Categorize partners by priority level to focus on what matters most." },
];

const steps = [
  { icon: Building2, title: "Add Your Partners", description: "Import or create organizations and assign roles to key contacts." },
  { icon: GitBranch, title: "Map Relationships", description: "Connect people to partners and document every touchpoint." },
  { icon: TrendingUp, title: "Track & Grow", description: "Monitor engagement, spot gaps, and strengthen your network over time." },
];

const useCases = [
  { icon: Users, title: "Nonprofits & Community Orgs", description: "Track donor relationships, volunteer networks, and community partnerships across programs and offices." },
  { icon: Network, title: "Professional Networks", description: "Manage business relationships, referral partners, and strategic alliances with full interaction history." },
  { icon: Landmark, title: "Government & Public Sector", description: "Map stakeholder relationships across agencies, track constituent engagement, and coordinate multi-office outreach." },
];

function NetworkVisualization() {
  const nodes = [
    { cx: 150, cy: 80, r: 6 },
    { cx: 280, cy: 60, r: 8 },
    { cx: 400, cy: 100, r: 5 },
    { cx: 200, cy: 180, r: 7 },
    { cx: 340, cy: 170, r: 6 },
    { cx: 100, cy: 150, r: 5 },
    { cx: 450, cy: 180, r: 7 },
    { cx: 260, cy: 130, r: 9 },
  ];

  const lines = [
    [0, 1], [1, 2], [0, 3], [3, 4], [1, 4], [0, 5], [2, 6], [1, 7], [3, 7], [4, 7], [7, 2],
  ];

  return (
    <svg viewBox="0 0 550 250" className="w-full max-w-lg mx-auto opacity-30">
      {lines.map(([a, b], i) => (
        <motion.line
          key={i}
          x1={nodes[a].cx}
          y1={nodes[a].cy}
          x2={nodes[b].cx}
          y2={nodes[b].cy}
          stroke="white"
          strokeWidth="1"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.6 }}
          transition={{ duration: 1.2, delay: 0.3 + i * 0.1 }}
        />
      ))}
      {nodes.map((node, i) => (
        <motion.circle
          key={i}
          cx={node.cx}
          cy={node.cy}
          r={node.r}
          fill="white"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.8 }}
          transition={{ duration: 0.4, delay: 0.2 + i * 0.08 }}
        />
      ))}
    </svg>
  );
}

export default function LandingPage() {
  const { status } = useSession();
  const isLoggedIn = status === "authenticated";

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <span className="text-xl font-bold text-indigo-600">Relationship Mapper</span>
          {status !== "loading" && (
            <Link
              href={isLoggedIn ? "/dashboard" : "/login"}
              className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              {isLoggedIn ? "Go to Dashboard" : "Login"}
            </Link>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-16 overflow-hidden">
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
            <motion.div
              className="text-center max-w-3xl mx-auto"
              initial="hidden"
              animate="visible"
              variants={stagger}
            >
              <motion.h1
                className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight"
                variants={fadeUp}
              >
                Map Every Relationship That Matters
              </motion.h1>
              <motion.p
                className="mt-6 text-lg sm:text-xl text-indigo-100 leading-relaxed"
                variants={fadeUp}
              >
                The relationship intelligence platform that helps organizations track partnerships,
                log interactions, and grow their network — all in one place.
              </motion.p>
              <motion.div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center" variants={fadeUp}>
                <Link
                  href={isLoggedIn ? "/dashboard" : "/login"}
                  className="inline-flex items-center justify-center gap-2 bg-white text-indigo-600 px-8 py-3.5 rounded-lg text-base font-semibold hover:bg-indigo-50 transition-colors shadow-lg"
                >
                  Get Started <ArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center justify-center gap-2 border-2 border-white/30 text-white px-8 py-3.5 rounded-lg text-base font-semibold hover:bg-white/10 transition-colors"
                >
                  See How It Works
                </a>
              </motion.div>
            </motion.div>
            <motion.div
              className="mt-16"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.5 }}
            >
              <NetworkVisualization />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 sm:py-28 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Everything You Need to Manage Relationships</h2>
            <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
              A complete toolkit for tracking partners, logging interactions, and understanding your network.
            </p>
          </motion.div>
          <motion.div
            className="grid sm:grid-cols-2 gap-6"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={stagger}
          >
            {features.map((feature) => (
              <motion.div
                key={feature.title}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                variants={fadeUp}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                    <feature.icon className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{feature.title}</h3>
                    <p className="mt-1 text-sm text-gray-500 leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 sm:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">How It Works</h2>
            <p className="mt-4 text-lg text-gray-500">Get up and running in three simple steps.</p>
          </motion.div>
          <motion.div
            className="grid sm:grid-cols-3 gap-8"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={stagger}
          >
            {steps.map((step, i) => (
              <motion.div key={step.title} className="text-center" variants={fadeUp}>
                <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <step.icon className="w-8 h-8 text-white" />
                </div>
                <div className="text-sm font-semibold text-indigo-600 mb-2">Step {i + 1}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-500 leading-relaxed">{step.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-20 sm:py-28 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Built For Organizations Like Yours</h2>
            <p className="mt-4 text-lg text-gray-500">Trusted by teams that rely on strong relationships.</p>
          </motion.div>
          <motion.div
            className="grid sm:grid-cols-3 gap-8"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={stagger}
          >
            {useCases.map((uc) => (
              <motion.div
                key={uc.title}
                className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 text-center"
                variants={fadeUp}
              >
                <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <uc.icon className="w-7 h-7 text-purple-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{uc.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{uc.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 sm:py-28 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center max-w-2xl mx-auto"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
          >
            <motion.h2
              className="text-3xl sm:text-4xl font-bold"
              variants={fadeUp}
            >
              Ready to Strengthen Your Network?
            </motion.h2>
            <motion.p
              className="mt-4 text-lg text-gray-400"
              variants={fadeUp}
            >
              Start mapping the relationships that drive your organization forward.
            </motion.p>
            <motion.div className="mt-8" variants={fadeUp}>
              <Link
                href={isLoggedIn ? "/dashboard" : "/login"}
                className="inline-flex items-center gap-2 bg-indigo-600 text-white px-8 py-3.5 rounded-lg text-base font-semibold hover:bg-indigo-700 transition-colors shadow-lg"
              >
                Start Mapping Relationships <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-950 text-gray-400 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} Relationship Mapper. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
