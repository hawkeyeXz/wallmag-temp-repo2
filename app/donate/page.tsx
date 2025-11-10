"use client"

import { useState } from "react"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Heart, QrCode, DollarSign } from "lucide-react"
import { toast } from "sonner"

async function fetcher(url: string) {
  const res = await fetch(url, { credentials: "include" })
  if (!res.ok) throw new Error("Failed to fetch")
  return res.json()
}

export default function DonatePage() {
  const [selectedMethod, setSelectedMethod] = useState<"upi" | "paypal" | null>(null)
  const [amount, setAmount] = useState("")

  const { data, isLoading } = useSWR("/api/donations", fetcher)

  const config = data?.config || {}
  const stats = data?.stats || {}

  const handleDonation = async (method: "upi" | "paypal") => {
    try {
      const res = await fetch("/api/donations", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method,
          amount: amount || "custom",
          source: "web",
        }),
      })

      if (!res.ok) throw new Error("Failed to track donation")

      toast.success(`Redirecting to ${method.toUpperCase()}...`)

      // Redirect to payment method
      if (method === "upi") {
        window.location.href = `upi://pay?pa=${config.upi_id}&pn=${encodeURIComponent(config.upi_name)}`
      } else {
        window.location.href = config.paypal_link
      }
    } catch (error) {
      toast.error("Failed to process donation")
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-bold flex items-center justify-center gap-2">
          <Heart className="w-8 h-8 text-red-500" />
          Support Our Magazine
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Your donation helps us continue creating quality content and supporting our community. Every contribution
          makes a difference!
        </p>
      </div>

      {/* Donation Stats */}
      {!isLoading && stats.total_intents > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Donations", value: stats.total_intents },
            { label: "UPI Donations", value: stats.upi_intents },
            { label: "PayPal Donations", value: stats.paypal_intents },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Donation Methods */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* UPI Method */}
        <Card className="border-2 hover:border-primary transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              UPI Payment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-lg text-center font-mono text-sm break-all">
              {config.upi_id || "Loading..."}
            </div>
            <p className="text-sm text-muted-foreground">
              Scan with any UPI app or enter the UPI ID to send money directly.
            </p>
            <Button onClick={() => handleDonation("upi")} className="w-full" size="lg">
              Pay with UPI
            </Button>
          </CardContent>
        </Card>

        {/* PayPal Method */}
        <Card className="border-2 hover:border-primary transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              PayPal Payment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-lg text-center text-sm">Secure international payments</div>
            <p className="text-sm text-muted-foreground">
              Support us globally through PayPal. Funds go directly to our account.
            </p>
            <Button onClick={() => handleDonation("paypal")} className="w-full" size="lg">
              Pay with PayPal
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Amount Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Choose Amount (Optional)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Select a suggested amount or enter a custom amount:</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {["100", "500", "1000", "5000"].map((amt) => (
              <Button
                key={amt}
                variant={amount === amt ? "default" : "outline"}
                onClick={() => setAmount(amt)}
                className="text-sm"
              >
                ₹{amt}
              </Button>
            ))}
          </div>
          <input
            type="number"
            placeholder="Custom amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-3 py-2 border border-input rounded-md"
          />
        </CardContent>
      </Card>

      {/* Benefits */}
      <Card>
        <CardHeader>
          <CardTitle>Why Donate?</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <Badge variant="outline">✓</Badge>
              <span>Support quality journalism and creative content</span>
            </li>
            <li className="flex items-start gap-3">
              <Badge variant="outline">✓</Badge>
              <span>Help us maintain and improve our platform</span>
            </li>
            <li className="flex items-start gap-3">
              <Badge variant="outline">✓</Badge>
              <span>Enable us to reach more readers globally</span>
            </li>
            <li className="flex items-start gap-3">
              <Badge variant="outline">✓</Badge>
              <span>Contribute to our community's growth</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
