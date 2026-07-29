import { motion } from "framer-motion";

// Generate fewer particles for mobile performance
const particles = Array.from({ length: 10 }).map((_, i) => ({
  id: i,
  size: Math.random() * 8 + 4,
  x: Math.random() * 100,
  y: Math.random() * 100,
  duration: Math.random() * 20 + 20,
  delay: Math.random() * 5,
}));

export function BackgroundFX() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-rose-950">
      {/* Real high-tech logistics hub & delivery background image */}
      <img
        src="/logistics-bg.png"
        alt="Logistics & Delivery Hub"
        className="absolute inset-0 w-full h-full object-cover opacity-40 blur-[3px] scale-105 pointer-events-none"
      />
      {/* Gradient wash overlay for optimal readability while showing background details */}
      <div className="absolute inset-0 bg-gradient-to-b from-red-50/75 via-white/80 to-rose-100/85 backdrop-blur-[1px]" />
      <div className="absolute inset-0 grid-overlay opacity-20" />
      
      {/* Floating Particles - Reduced count and complexity */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-primary/30"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
          }}
          animate={{
            y: [0, -100, 0],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "linear",
          }}
        />
      ))}

      {/* Large glowing orbs - Static to prevent severe GPU lag on mobile WebViews */}
      <div className="absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full bg-rose-500/20 blur-3xl opacity-40" />
      <div className="absolute top-1/4 -right-32 h-[600px] w-[600px] rounded-full bg-primary/10 blur-3xl opacity-40" />
      <div className="absolute -bottom-40 left-1/4 h-[500px] w-[500px] rounded-full bg-orange-500/10 blur-3xl opacity-40" />
    </div>
  );
}
