import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Welcome to Unlockt</CardTitle>
            <CardDescription>
              Start by uploading a file and creating a payment link.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Your earnings, sales, and active links will appear here once you
              get started.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
