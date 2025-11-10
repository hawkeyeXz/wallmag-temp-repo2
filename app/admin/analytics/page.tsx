"use client"

import { ProtectedRoute, useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
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
import { TrendingUp, FileText, Eye, Heart } from "lucide-react"
import { useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import useSWR from "swr"

async function fetcher(url: string) {
  const res = await fetch(url, { credentials: "include" })
  if (!res.ok) throw new Error("Failed to fetch")
  return res.json()
}

const COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6"]

export default function AnalyticsPage() {
  return (
    <ProtectedRoute>
      <AnalyticsDashboard />
    </ProtectedRoute>
  )
}

function AnalyticsDashboard() {
  const { user } = useAuth()
  const [period, setPeriod] = useState("30")

  const { data, isLoading } = useSWR(`/api/admin/analytics?period=${period}`, fetcher)

  const overview = data?.overview || {}
  const categoryBreakdown = data?.category_breakdown || []
  const engagement = data?.engagement || {}
  const topPosts = data?.top_posts || {}
  const topContributors = data?.top_contributors || []
  const postsOverTime = data?.posts_over_time || []
  const editorPerformance = data?.editor_performance || []

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Platform Analytics</h1>
          <p className="text-muted-foreground">Comprehensive insights into platform activity</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
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

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Posts", value: overview.total_posts || 0, icon: FileText },
          { label: "Published", value: overview.published_posts || 0, icon: TrendingUp },
          { label: "Total Views", value: engagement.total_views || 0, icon: Eye },
          { label: "Total Likes", value: engagement.total_likes || 0, icon: Heart },
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
                <p className="text-2xl font-bold">{stat.value.toLocaleString()}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Engagement Metrics */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Engagement Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {[
                  {
                    label: "Avg Views per Post",
                    value: engagement.avg_views_per_post || 0,
                  },
                  {
                    label: "Avg Likes per Post",
                    value: engagement.avg_likes_per_post || 0,
                  },
                ].map((metric) => (
                  <div key={metric.label} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <p className="text-sm">{metric.label}</p>
                    <p className="text-2xl font-bold">{metric.value}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Posts by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : categoryBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={categoryBreakdown} dataKey="count" nameKey="_id" cx="50%" cy="50%" outerRadius={80} label>
                    {categoryBreakdown.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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
      </div>

      {/* Posts Over Time */}
      <Card>
        <CardHeader>
          <CardTitle>Posts Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : postsOverTime.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={postsOverTime}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="_id" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-center py-8">No data available</p>
          )}
        </CardContent>
      </Card>

      {/* Top Posts and Contributors */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Most Viewed Posts</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : topPosts.most_viewed && topPosts.most_viewed.length > 0 ? (
              <div className="space-y-3">
                {topPosts.most_viewed.slice(0, 5).map((post: any) => (
                  <div key={post._id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="truncate">
                      <p className="font-medium text-sm truncate">{post.title}</p>
                      <p className="text-xs text-muted-foreground">{post.author_name}</p>
                    </div>
                    <Badge variant="outline">{post.views}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">No data available</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Contributors</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : topContributors.length > 0 ? (
              <div className="space-y-3">
                {topContributors.slice(0, 5).map((contributor: any) => (
                  <div key={contributor._id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{contributor.author_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {contributor.total_views} views · {contributor.total_likes} likes
                      </p>
                    </div>
                    <Badge>{contributor.post_count}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">No data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Editor Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Editor Performance</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : editorPerformance.length > 0 ? (
            <div className="space-y-3">
              {editorPerformance.map((editor: any) => (
                <div key={editor._id} className="p-4 border rounded-lg space-y-2">
                  <p className="font-medium">{editor.editor_name}</p>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Reviewed</p>
                      <p className="font-bold">{editor.reviewed_count}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Accepted</p>
                      <p className="font-bold text-green-600">{editor.accepted_count}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Rejected</p>
                      <p className="font-bold text-red-600">{editor.rejected_count}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">No editor performance data</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
