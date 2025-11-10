"use client"

import { ProtectedRoute, useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertTriangle, Shield, Lock, Zap } from "lucide-react"
import { useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import useSWR from "swr"
import { toast } from "sonner"

async function fetcher(url: string) {
  const res = await fetch(url, { credentials: "include" })
  if (!res.ok) throw new Error("Failed to fetch")
  return res.json()
}

export default function SecurityPage() {
  return (
    <ProtectedRoute>
      <SecurityDashboard />
    </ProtectedRoute>
  )
}

function SecurityDashboard() {
  const { user } = useAuth()
  const [hours, setHours] = useState("24")
  const [ipToBlock, setIpToBlock] = useState("")
  const [isBlocking, setIsBlocking] = useState(false)

  const { data, isLoading, mutate } = useSWR(`/api/admin/security/dashboard?hours=${hours}`, fetcher)

  const dashboard = data || {}

  const handleBlockIP = async (action: "block" | "unblock") => {
    if (!ipToBlock.trim()) {
      toast.error("Please enter an IP address")
      return
    }

    setIsBlocking(true)
    try {
      const res = await fetch("/api/admin/security/dashboard", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          ip: ipToBlock,
          duration: 86400,
        }),
      })

      if (!res.ok) throw new Error("Failed to update IP")

      toast.success(`IP ${action === "block" ? "blocked" : "unblocked"}`)
      setIpToBlock("")
      mutate()
    } catch (error) {
      toast.error("Failed to update IP status")
    } finally {
      setIsBlocking(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="w-8 h-8" />
            Security Dashboard
          </h1>
          <p className="text-muted-foreground">Monitor and manage platform security</p>
        </div>
        <Select value={hours} onValueChange={setHours}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Last Hour</SelectItem>
            <SelectItem value="6">Last 6 Hours</SelectItem>
            <SelectItem value="24">Last 24 Hours</SelectItem>
            <SelectItem value="168">Last 7 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Security Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Requests", value: dashboard.total_requests || 0, icon: Zap },
          { label: "Suspicious Activity", value: dashboard.suspicious_activity || 0, icon: AlertTriangle },
          { label: "Blocked IPs", value: dashboard.blocked_ips || 0, icon: Lock },
          { label: "Failed Auth", value: dashboard.failed_auth_attempts || 0, icon: Shield },
        ].map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                  <Icon className="w-4 h-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{stat.value}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* IP Management */}
      <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <Lock className="w-5 h-5" />
            IP Address Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter IP address to block/unblock"
              value={ipToBlock}
              onChange={(e) => setIpToBlock(e.target.value)}
              className="flex-1"
            />
            <Button onClick={() => handleBlockIP("block")} disabled={isBlocking} variant="destructive" size="sm">
              Block
            </Button>
            <Button onClick={() => handleBlockIP("unblock")} disabled={isBlocking} variant="outline" size="sm">
              Unblock
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Blocked IPs will be prevented from accessing the platform for 24 hours.
          </p>
        </CardContent>
      </Card>

      {/* Threats */}
      {dashboard.threats && dashboard.threats.length > 0 && (
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
          <CardHeader>
            <CardTitle className="text-orange-600">Active Threats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboard.threats.map((threat: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 bg-background rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{threat.type}</p>
                    <p className="text-xs text-muted-foreground">{threat.ip}</p>
                  </div>
                  <Badge variant="destructive">{threat.severity}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Blocked IPs List */}
      <Card>
        <CardHeader>
          <CardTitle>Blocked IP Addresses</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : dashboard.blocked_ip_list && dashboard.blocked_ip_list.length > 0 ? (
            <div className="space-y-2">
              {dashboard.blocked_ip_list.map((ip: string, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <p className="font-mono text-sm">{ip}</p>
                  <Button
                    onClick={() => {
                      setIpToBlock(ip)
                      handleBlockIP("unblock")
                    }}
                    variant="ghost"
                    size="sm"
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No blocked IPs</p>
          )}
        </CardContent>
      </Card>

      {/* Failed Authentication Attempts */}
      {dashboard.failed_attempts && dashboard.failed_attempts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Failed Authentication Attempts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboard.failed_attempts.slice(0, 10).map((attempt: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="font-mono text-sm">{attempt.ip}</p>
                    <p className="text-xs text-muted-foreground">{attempt.timestamp}</p>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {attempt.reason || "Unknown"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
