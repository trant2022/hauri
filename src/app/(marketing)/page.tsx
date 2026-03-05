import Link from "next/link"
import { Upload, DollarSign, Share2, Zap, UserX, Globe, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"

const steps = [
  {
    number: "1",
    icon: Upload,
    title: "Upload your file",
    description:
      "Upload any digital file — PDFs, images, videos, ZIPs — up to 500MB.",
  },
  {
    number: "2",
    icon: DollarSign,
    title: "Set your price",
    description:
      "Choose your currency (CHF, EUR, USD, GBP) and set your price. We handle the rest.",
  },
  {
    number: "3",
    icon: Share2,
    title: "Share & earn",
    description:
      "Get a unique payment link. Share it anywhere — social media, email, DMs. Buyers pay and download instantly.",
  },
]

const features = [
  {
    icon: Zap,
    title: "Instant downloads",
    description:
      "Buyers pay and download immediately. No waiting, no friction.",
  },
  {
    icon: UserX,
    title: "No account needed for buyers",
    description:
      "Your customers just pay and download. Zero signup required.",
  },
  {
    icon: Globe,
    title: "Multi-currency",
    description:
      "Sell in CHF, EUR, USD, or GBP. You choose per link.",
  },
  {
    icon: Shield,
    title: "Secure delivery",
    description:
      "Files are never publicly accessible. Time-limited signed URLs only.",
  },
]

export default function HomePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      {/* Section 1: Hero */}
      <section className="py-20 text-center sm:py-32">
        <span className="mb-6 inline-block rounded-full bg-secondary px-4 py-1.5 text-sm text-muted-foreground">
          The simplest way to sell digital files
        </span>
        <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
          Upload. Price. Share. Get&nbsp;paid.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
          Lock any digital file behind a payment link. Share it anywhere. Buyers
          pay and download instantly. No marketplace, no subscriptions — just
          sales.
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <Button asChild size="lg">
            <Link href="/signup">Start selling</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="border-border text-white hover:bg-secondary">
            <Link href="#how-it-works">See how it works</Link>
          </Button>
        </div>
      </section>

      {/* Section 2: How it works */}
      <section id="how-it-works" className="py-20 sm:py-24">
        <h2 className="mb-4 text-center text-3xl font-bold tracking-tight">
          How it works
        </h2>
        <p className="mb-12 text-center text-muted-foreground sm:mb-16">
          Three steps. Under two minutes.
        </p>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.number}
              className="rounded-xl border border-border bg-card p-6 text-center sm:p-8"
            >
              <step.icon className="mx-auto mb-4 h-10 w-10 text-accent" />
              <span className="mb-4 block font-bold text-accent">
                Step {step.number}
              </span>
              <h3 className="mb-2 text-lg font-semibold text-white">
                {step.title}
              </h3>
              <p className="text-sm text-muted-foreground">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Section 3: Features / Benefits */}
      <section className="border-t border-border py-20 sm:py-24">
        <h2 className="mb-12 text-center text-3xl font-bold tracking-tight">
          Built for creators
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-border bg-card p-6"
            >
              <feature.icon className="mb-3 h-6 w-6 text-accent" />
              <h3 className="mb-2 font-semibold text-white">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Section 4: Final CTA */}
      <section className="border-t border-border py-20 text-center sm:py-32">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Ready to start selling?
        </h2>
        <p className="mt-4 text-muted-foreground">
          Create your first payment link in under 2 minutes.
        </p>
        <Button asChild size="lg" className="mt-8">
          <Link href="/signup">Create your account</Link>
        </Button>
      </section>
    </div>
  )
}
