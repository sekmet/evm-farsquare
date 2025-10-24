import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  ShieldCheck,
  Coins,
  PieChart,
  GitCompare,
  Droplets,
  Fingerprint,
  Brain,
  Share2,
  Users,
  MapPin,
  TrendingUp,
  KeyRound,
} from "lucide-react";
import logo from "../assets/evm-farsquare.png";

type HeroStat = {
  label: string;
  value: string;
};

type FeaturedProperty = {
  title: string;
  location: string;
  price: string;
  tokenPrice: string;
  available: string;
  yield: string;
  risk: string;
  growth: string;
  progress: number;
  image: string;
};

type PlatformInsight = {
  title: string;
  description: string;
  icon: LucideIcon;
  iconClasses: string;
};

type PlatformHighlight = {
  badge: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
  badgeClassName?: string;
  title: string;
  description: string;
};

const heroBackground =
  "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1920&h=1080&fit=crop&auto=format";

const heroStats: HeroStat[] = [
  { label: "Tokenized assets", value: "$9.6B" },
  { label: "Average rental APY", value: "5.5%" },
  { label: "Daily settlements", value: "2.1K" },
  { label: "Verified investors", value: "40K+" },
];

const platformFeatures = [
  {
    icon: ShieldCheck,
    title: "Permissioned token standard",
    description:
      "Enforce ERC-3643 permission flags across Hedera and partner EVM networks so only verified wallets can trade.",
  },
  {
    icon: PieChart,
    title: "Fractionalization engine",
    description:
      "Mint property fractions with automated rental distributions and portfolio-level analytics built into the rails.",
  },
  {
    icon: GitCompare,
    title: "Hybrid marketplace",
    description:
      "Blend off-chain matching with atomic ETH settlement so trades stay fast, affordable, and fully auditable.",
  },
  {
    icon: Droplets,
    title: "Liquidity vaults",
    description:
      "Pool fractionalized tokens into vaults, mint LP positions, and unlock secondary liquidity for every project.",
  },
  {
    icon: Fingerprint,
    title: "KYC compliance gateway",
    description:
      "Keep PII off-chain, surface attestations on-chain, and provide auditors with immutable compliance snapshots.",
  },
  {
    icon: Brain,
    title: "AI investment layer",
    description:
      "Fuse on-chain events with property fundamentals to deliver AI-driven forecasts, risk scoring, and alerts.",
  },
  {
    icon: Share2,
    title: "Embeddable widgets",
    description:
      "Ship white-label investment widgets so partners can embed FarSquare listings anywhere with zero friction.",
  },
  {
    icon: Users,
    title: "Governance module",
    description:
      "Enable snapshot voting for upgrades, exits, and repairs with outcomes recorded directly on-chain.",
  },
];

const featuredProperties: FeaturedProperty[] = [
  {
    title: "Golf Course Community Homes",
    location: "Scottsdale, Arizona",
    price: "$250.00",
    tokenPrice: "≈ 0.005250 ETH",
    available: "8,000,000 / 8,000,000",
    yield: "5.5% yield",
    risk: "medium risk",
    growth: "+5.5%",
    progress: 1,
    image:
      "https://images.unsplash.com/photo-1570129477492-45c003edd2be?q=80&w=1400&auto=format&fit=crop",
  },
  {
    title: "Medical Office Building",
    location: "Houston, Texas",
    price: "$320.00",
    tokenPrice: "≈ 0.006720 ETH",
    available: "1,250,000 / 1,600,000",
    yield: "6.2% yield",
    risk: "low risk",
    growth: "+6.2%",
    progress: 0.78,
    image:
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=1400&auto=format&fit=crop",
  },
  {
    title: "Historic Brownstone Collection",
    location: "Brooklyn, New York",
    price: "$190.00",
    tokenPrice: "≈ 0.003900 ETH",
    available: "640,000 / 800,000",
    yield: "5.1% yield",
    risk: "balanced",
    growth: "+5.1%",
    progress: 0.8,
    image:
      "https://images.unsplash.com/photo-1464316325666-63beaf639dbb?q=80&w=1400&auto=format&fit=crop",
  },
];

const platformInsights: PlatformInsight[] = [
  {
    title: "ERC-3643 Permissioning",
    description:
      "On-chain permission flags across Hedera and other EVM networks ensure every token remains compliant.",
    icon: Coins,
    iconClasses: "bg-yellow-500/50 text-primary",
  },
  {
    title: "Blockchain Security",
    description:
      "All transactions secured on the blockchain with permissioned token standards",
    icon: ShieldCheck,
    iconClasses: "bg-primary/10 text-primary",
  },
  {
    title: "Hybrid marketplace rails",
    description:
      "Off-chain order matching combined with atomic on-chain ETH settlement keeps trades fast and auditable.",
    icon: GitCompare,
    iconClasses: "bg-red-600/30 text-secondary-foreground",
  },
  {
    title: "AI market intelligence",
    description:
      "AI models blend property, rental, and macro data to power forecasts, risk scoring, and portfolio alerts.",
    icon: Brain,
    iconClasses: "bg-emerald-100 text-emerald-600",
  },
];

const platformHighlights: PlatformHighlight[] = [
  {
    badge: "Global access",
    badgeVariant: "secondary",
    title: "Secure KYC onboarding",
    description:
      "Permissioned ERC-3643 workflows keep investor identities verified while protecting private data off-chain.",
  },
  {
    badge: "ETH settlement",
    badgeVariant: "outline",
    badgeClassName: "border-white/60 bg-primary/10 text-primary",
    title: "Instant ETH settlement",
    description:
      "Execute trades with ETH payouts routed through Hedera and partner EVM networks for multi-currency liquidity.",
  },
  {
    badge: "AI insights",
    badgeVariant: "outline",
    badgeClassName: "border-secondary text-secondary-foreground",
    title: "AI investment intelligence",
    description:
      "Machine learning monitors live market feeds to surface anomalies, yield drift, and suggested reallocations.",
  },
];

const featureIconGradients = [
  "from-primary to-primary/70",
  "from-yellow-300 to-yellow-600/70",
  "from-emerald-500 to-emerald-400",
  "from-sky-500 to-sky-400",
  "from-amber-500 to-amber-400",
  "from-purple-500 to-purple-400",
  "from-rose-500 to-rose-400",
  "from-slate-500 to-slate-400",
];

const Homepage = () => {
  return (
    <div
      className="min-h-screen text-foreground"
      style={{
        background: "linear-gradient(180deg, #ffffff 0%, var(--accent) 100%)",
      }}
    >
      <header className="sticky top-0 z-50 border-b border-border bg-white/90 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <img src={logo} alt="FarSquare logo" className="h-12 w-12" />
            <span className="text-2xl font-bold">Farsquare</span>
          </div>
          <nav className="hidden items-center gap-6 text-base font-semibold md:flex">
            <Link to="#hero" className="transition-colors hover:text-primary">
              Properties
            </Link>
            <Link to="#market" className="text-muted-foreground transition-colors hover:text-primary">
              Marketplace
            </Link>            
            <Link to="#features" className="text-muted-foreground transition-colors hover:text-primary">
              AI Insights
            </Link>
            <Link to="#about" className="text-muted-foreground transition-colors hover:text-primary">
              About
            </Link>
          </nav>
          <Link to="/login">
          <Button className="rounded-full font-semibold bg-primary px-6 text-primary-foreground hover:bg-primary/90">
            Start investing
          </Button>
          </Link>
        </div>
      </header>

      <main>
        <section id="hero" className="relative overflow-hidden">
          <div
            className="absolute inset-0 bg-black/70 bg-blend-multiply opacity-80"
            style={{
              backgroundImage: `linear-gradient(180deg, rgba(13, 37, 63, 0.15), rgba(13, 37, 63, 0.55)), url(${heroBackground})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-6 py-24 text-center text-white">
            <Badge
              variant="outline"
              className="border-white/40 bg-white/10 px-4 py-1 text-sm font-semibold uppercase tracking-wide text-white"
            >
              ✨ ERC-3643 compliant security tokens
            </Badge>
            <h1 className="mt-8 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              🪙 Tokenized Real Estate Ecosystem
            </h1>
            <p className="mt-4 max-w-3xl text-lg text-white/80">
              Invest in fractional real estate ownership on Hedera and EVM networks with ERC-3643 compliant tokens,
              bringing ETH-settled trades, automated income distribution, and auditable reporting into one platform with 
              AI-powered insights help you make smarter investment decisions.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link to="#properties">
              <Button variant="default" className="rounded-full bg-primary px-6 text-primary-foreground hover:bg-primary/90 font-semibold">
                Explore properties
              </Button>
              </Link>
              <Link to="/login">
              <Button variant="default" className="rounded-full border-white/70 bg-white/10 px-6 text-white hover:bg-white/20 font-semibold">
                Add property
              </Button>
              </Link>
            </div>
            {/*<form className="mt-10 flex w-full max-w-3xl items-center rounded-full bg-white/95 p-2 shadow-xl">
              <div className="flex w-full items-center gap-2 px-4">
                <MapPin className="h-5 w-5 text-primary" />
                <Input
                  type="search"
                  placeholder="Enter an address, city, or ZIP code"
                  className="border-0 bg-transparent text-base text-muted-foreground placeholder:text-muted-foreground/70 focus-visible:ring-0"
                />
              </div>
              <Button type="submit" className="h-12 w-12 rounded-full bg-primary hover:bg-primary/90">
                <KeyRound className="h-5 w-5" />
              </Button>
            </form>*/}
          </div>
        </section>

        <section id="market" className="container mx-auto px-6 py-16">
          <div className="mb-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-3xl font-semibold">📈 Market overview</h2>
              <p className="text-muted-foreground">Real-time insights into the tokenized real estate market.</p>
            </div>
            <Button variant="outline" className="rounded-full px-5">
              Download report
            </Button>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {heroStats.map((stat) => (
              <Card key={`overview-${stat.label}`} className="border border-border/60 bg-white shadow-sm">
                <CardHeader className="space-y-2">
                  <p className="text-base text-muted-foreground">{stat.label}</p>
                  <CardTitle className="text-3xl font-semibold">{stat.value}</CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        <section id="features" className="bg-white py-16">
          <div className="container mx-auto px-6">
            <div className="text-center">
              <h2 className="text-3xl font-semibold">🌎 Ecosystem features</h2>
              <p className="mt-3 text-muted-foreground">
                Comprehensive platform for tokenized real estate investment workflows.
              </p>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {platformFeatures.map((feature, index) => (
                <Card key={feature.title} className="border border-border/60 shadow-sm">
                  <CardHeader className="flex items-start gap-4">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${
                        featureIconGradients[index % featureIconGradients.length]
                      } text-white shadow-lg`}
                    >
                      <feature.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-semibold">{feature.title}</CardTitle>
                      <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="container mx-auto px-6 py-16" id="featured">
          <div className="mb-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-3xl font-semibold">🏆 Featured properties</h2>
              <p className="text-muted-foreground">Discover high-yield investment opportunities.</p>
            </div>
            <Button variant="outline" className="rounded-full px-5">
              View all properties
            </Button>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {featuredProperties.map((property) => (
              <Card
                key={property.title}
                className="group overflow-hidden border border-border/60 bg-white shadow-sm gap-0 p-0"
              >
                <div className="relative h-56 w-full overflow-hidden">
                  <img src={property.image} alt={property.title} className="block h-full w-full object-cover" />
                  <div className="absolute left-4 top-4 flex gap-2">
                    <Badge className="rounded-full border-none bg-secondary/90 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-secondary-foreground shadow">
                      {property.risk}
                    </Badge>
                    <Badge className="rounded-full border-none bg-primary/95 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary-foreground shadow">
                      {property.yield}
                    </Badge>
                  </div>
                  <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-muted-foreground shadow">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    {property.location}
                  </div>
                </div>
                <CardContent className="space-y-3 px-6 py-6">
                  <div>
                    <h3 className="text-xl font-semibold">{property.title}</h3>
                    <p className="text-sm text-muted-foreground">{property.tokenPrice}</p>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-semibold text-primary">{property.price}</span>
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">per token</span>
                  </div>
                  <div className="flex items-center justify-between text-sm font-medium text-muted-foreground">
                    <span>Available</span>
                    <span>{property.available}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-secondary/60">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.min(Math.max(property.progress, 0), 1) * 100}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-2 text-sm font-medium text-green-600">
                    <TrendingUp className="h-4 w-4" /> {property.growth}
                  </div>
                </CardContent>
                <div className="border-t border-border/60 px-6 py-4">
                  <Button variant="default" className="w-full rounded-full group-hover:border-primary group-hover:text-secondary font-semibold">
                    Invest now
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <section className="bg-white py-16" id="about">
          <div className="container mx-auto grid gap-10 px-6 lg:grid-cols-[1.5fr_1fr]">
            <div className="space-y-6">
              <div className="space-y-3">
                <h2 className="text-3xl font-semibold">🎯 Platform information</h2>
                <p className="text-muted-foreground">
                  Farsquare connects permissioned ERC-3643 assets, ETH settlement, and AI analytics to deliver compliant
                  real estate trading across global EVM ecosystems.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {platformInsights.map((insight) => (
                  <Card key={insight.title} className="border border-border/60 shadow-sm">
                    <CardHeader className="flex items-start gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${insight.iconClasses}`}
                      >
                        <insight.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-semibold">{insight.title}</CardTitle>
                        <p className="mt-2 text-sm text-muted-foreground">{insight.description}</p>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>
            <div className="grid gap-4">
              {platformHighlights.map((highlight) => (
                <Card key={highlight.title} className="border border-border/60 bg-background shadow-sm">
                  <CardHeader className="space-y-3">
                    <Badge
                      variant={highlight.badgeVariant}
                      className={`w-fit rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                        highlight.badgeClassName ?? ""
                      }`}
                    >
                      {highlight.badge}
                    </Badge>
                    <CardTitle className="text-2xl font-semibold">{highlight.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">{highlight.description}</p>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-primary py-20 text-primary-foreground">
          <div className="container mx-auto grid gap-10 px-6 lg:grid-cols-[1.5fr_1fr]">
            <div className="space-y-6">
              <h2 className="text-3xl font-semibold leading-tight">
                🚀 Ready to launch compliant tokenized portfolios?
              </h2>
              <p className="text-white/80">
                Combine permissioned ERC-3643 issuance, ETH-settled secondary trades, and AI-powered deal flow insights
                to accelerate investor onboarding across Hedera and EVM markets.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <Button className="font-semibold rounded-full bg-white px-6 text-primary hover:bg-white/90">
                  Browse properties
                </Button>
                <Button variant="default" className="font-semibold rounded-full border-white px-6 text-white hover:bg-white/10">
                  Schedule a demo
                </Button>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { label: "Jurisdictions live", value: "28", description: "Licensed partners spanning the US, EU, and UAE." },
                { label: "AI market signals", value: "120K+", description: "Automated alerts processed per 24h window." },
                { label: "Average onboarding", value: "< 6 min", description: "Investor KYC approved via layered attestations." },
                { label: "Stablecoin rails", value: "8", description: "Multi-currency settlements routed through ETH." },
              ].map((metric) => (
                <Card key={metric.label} className="rounded-3xl border border-white/30 bg-white/10 backdrop-blur">
                  <CardHeader className="space-y-1">
                    <CardTitle className="text-3xl font-semibold text-white">{metric.value}</CardTitle>
                    <p className="text-sm font-medium uppercase tracking-wide text-white/80">{metric.label}</p>
                    <p className="text-xs text-white/70">{metric.description}</p>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-white py-10">
        <div className="container mx-auto flex flex-col items-center space-y-3 px-6 text-center text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Farsquare logo" className="h-8 w-8" />
            <span className="font-semibold text-foreground">Farsquare</span>
          </div>
          <p>© {new Date().getFullYear()} Farsquare. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Homepage;