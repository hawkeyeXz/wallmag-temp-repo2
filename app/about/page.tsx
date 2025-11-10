"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function AboutPage() {
  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="text-center space-y-4">
        <h1 className="text-4xl font-bold">About Apodartho</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          The yearly e-wall magazine from the Department of Physics, showcasing articles, poems, artwork, and news from
          our vibrant community.
        </p>
      </section>

      {/* Mission */}
      <section className="grid md:grid-cols-2 gap-8 items-center">
        <div>
          <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
          <p className="text-muted-foreground mb-4">
            Apodartho is a platform dedicated to fostering creative expression and intellectual growth within our
            academic community. We believe in the power of diverse voices and perspectives.
          </p>
          <p className="text-muted-foreground">
            Whether through articles, poetry, artwork, or announcements, we create space for meaningful contribution and
            engagement.
          </p>
        </div>
        <div className="bg-muted rounded-lg h-64 flex items-center justify-center">
          <span className="text-muted-foreground">Community Space</span>
        </div>
      </section>

      {/* Features */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">What We Offer</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {[
            { title: "Articles", desc: "Thoughtful essays and insights" },
            { title: "Poetry", desc: "Creative verses and expressions" },
            { title: "Artwork", desc: "Visual art and photography" },
            { title: "News", desc: "Campus updates and announcements" },
          ].map((item) => (
            <Card key={item.title}>
              <CardHeader>
                <CardTitle className="text-lg">{item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{item.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="text-center space-y-4 py-8">
        <h2 className="text-2xl font-bold">Ready to Share Your Work?</h2>
        <p className="text-muted-foreground">Join our community of creative contributors</p>
        <Button asChild size="lg">
          <Link href="/contribute">Start Contributing</Link>
        </Button>
      </section>
    </div>
  )
}
