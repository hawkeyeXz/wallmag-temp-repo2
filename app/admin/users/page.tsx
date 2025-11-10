"use client"

import { ProtectedRoute, useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Users, Upload, Search, RefreshCw } from "lucide-react"
import { useState, useRef } from "react"
import useSWR from "swr"
import { toast } from "sonner"

async function fetcher(url: string) {
  const res = await fetch(url, { credentials: "include" })
  if (!res.ok) throw new Error("Failed to fetch")
  return res.json()
}

export default function UsersPage() {
  return (
    <ProtectedRoute>
      <UserManagement />
    </ProtectedRoute>
  )
}

function UserManagement() {
  const { user } = useAuth()
  const [query, setQuery] = useState("")
  const [role, setRole] = useState("all")
  const [page, setPage] = useState(1)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data, isLoading, mutate } = useSWR(
    `/api/admin/users/register?q=${query}&role=${role}&page=${page}&limit=20`,
    fetcher,
  )

  const users = data?.users || []
  const stats = data?.stats || {}
  const pagination = data?.pagination || {}

  const handleFileUpload = async (file: File) => {
    if (!file) return

    setIsUploading(true)
    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await fetch("/api/admin/users/register", {
        method: "POST",
        credentials: "include",
        body: formData,
      })

      if (!res.ok) throw new Error("Upload failed")

      const data = await res.json()
      toast.success(`Registered ${data.registered} user${data.registered > 1 ? "s" : ""}`)
      mutate()

      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    } catch (error) {
      toast.error("Failed to upload users")
    } finally {
      setIsUploading(false)
    }
  }

  const handleAssignRole = async (idNumber: string, newRole: string) => {
    try {
      const res = await fetch("/api/admin/users/assign-role", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_number: idNumber, role: newRole }),
      })

      if (!res.ok) throw new Error("Failed to assign role")

      toast.success("Role updated")
      mutate()
    } catch (error) {
      toast.error("Failed to update role")
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Users className="w-8 h-8" />
          User Management
        </h1>
        <p className="text-muted-foreground">Register users and manage roles</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Total Users", value: stats.total || 0 },
          { label: "Students", value: stats.students || 0 },
          { label: "Professors", value: stats.professors || 0 },
          { label: "Signed Up", value: stats.signed_up || 0 },
          { label: "Not Signed Up", value: stats.not_signed_up || 0 },
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

      {/* Upload Section */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-600">
            <Upload className="w-5 h-5" />
            Bulk User Registration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload a CSV or Excel file with columns: name, id_number, email, phone (optional), department (optional),
            role
          </p>
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFileUpload(file)
              }}
              disabled={isUploading}
              className="hidden"
            />
            <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading} variant="outline">
              {isUploading ? "Uploading..." : "Choose File"}
            </Button>
            <p className="text-xs text-muted-foreground flex items-center">CSV or Excel files only</p>
          </div>
        </CardContent>
      </Card>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, ID, or email..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setPage(1)
            }}
            className="pl-10"
          />
        </div>
        <Select
          value={role}
          onValueChange={(value) => {
            setRole(value)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="student">Student</SelectItem>
            <SelectItem value="Professor">Professor</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={() => mutate()}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Registered Users</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : users.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>ID Number</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((userItem: any) => (
                    <TableRow key={userItem._id}>
                      <TableCell className="font-medium">{userItem.name}</TableCell>
                      <TableCell className="font-mono text-sm">{userItem.id_number}</TableCell>
                      <TableCell className="text-sm">{userItem.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {userItem.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={userItem.is_signed_up ? "default" : "secondary"}>
                          {userItem.is_signed_up ? "Signed Up" : "Not Signed"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Select
                          value={userItem.role}
                          onValueChange={(newRole) => handleAssignRole(userItem.id_number, newRole)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="student">Student</SelectItem>
                            <SelectItem value="Professor">Professor</SelectItem>
                            <SelectItem value="editor">Editor</SelectItem>
                            <SelectItem value="publisher">Publisher</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No users found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.pages && pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {pagination.pages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage(Math.min(pagination.pages, page + 1))}
            disabled={page === pagination.pages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
