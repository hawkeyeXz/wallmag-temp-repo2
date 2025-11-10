"use client"

import { ProtectedRoute, useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { Heart } from "lucide-react"
import { useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import useSWR from "swr"

async function fetcher(url: string) {
  const res = await fetch(url, { credentials: "include" })
  if (!res.ok) throw new Error("Failed to fetch")
  return res.json()
}

const COLORS = ["#3b82f6", "#ef4444"]

export default function DonationsAnalyticsPage() {
  return (
    <ProtectedRoute>
      <DonationsAnalyticsDashboard />
    </ProtectedRoute>
  )
}

function DonationsAnalyticsDashboard() {
  const { user } = useAuth()
  const [days, setDays] = useState("30")

  const { data, isLoading } = useSWR(`/api/admin/donations/analytics?days=${days}`, fetcher)

  const summary = data?.summary || {}
  const breakdown = data?.breakdown || {}
  const recentIntents = data?.recent_intents || []
  const intentsOverTime = data?.intents_over_time || []

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Heart className="w-8 h-8 text-red-500" />
            Donations Analytics
          </h1>
          <p className="text-muted-foreground">Track donation activity and trends</p>
        </div>
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Intents", value: summary.total_intents || 0 },
          { label: "UPI Donations", value: summary.upi_intents || 0 },
          { label: "PayPal Donations", value: summary.paypal_intents || 0 },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Method Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Donations by Method</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : breakdown.by_method ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: "UPI", value: breakdown.by_method.upi || 0 },
                    { name: "PayPal", value: breakdown.by_method.paypal || 0 },
                  ]}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {COLORS.map((color, index) => (
                    <Cell key={`cell-${index}`} fill={color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-center py-8">No data available</p>
          )}
        </CardContent>
      </Card>

      {/* Source Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Donations by Source Device</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : breakdown.by_source ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={[
                  { name: "Web", value: breakdown.by_source.web || 0 },
                  { name: "Mobile", value: breakdown.by_source.mobile || 0 },
                  { name: "Tablet", value: breakdown.by_source.tablet || 0 },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-center py-8">No data available</p>
          )}
        </CardContent>
      </Card>

      {/* Donations Over Time */}
      <Card>
        <CardHeader>
          <CardTitle>Donation Intents Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : intentsOverTime.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={intentsOverTime}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#ef4444" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-center py-8">No data available</p>
          )}
        </CardContent>
      </Card>

      {/* Recent Intents */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Donation Intents</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : recentIntents.length > 0 ? (
            <div className="space-y-3">
              {recentIntents.slice(0, 10).map((intent: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium text-sm capitalize">{intent.method || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground">{new Date(intent.timestamp).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="capitalize">
                      {intent.source || "Web"}
                    </Badge>
                    <Badge variant="secondary">₹{intent.amount || "Custom"}</Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No donation intents yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
