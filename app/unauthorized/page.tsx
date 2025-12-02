import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";
import Link from "next/link";

export default function UnauthorizedPage() {
    return (
        <div className="flex items-center justify-center min-h-[80vh] px-4">
            <Card className="w-full max-w-md border-red-200 bg-red-50/50">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-red-100 rounded-full">
                            <ShieldAlert className="w-10 h-10 text-red-600" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl text-red-700">Access Denied</CardTitle>
                    <CardDescription className="text-red-600/80">
                        You do not have the required permissions to view this page.
                    </CardDescription>
                </CardHeader>
                <CardContent className="text-center text-sm text-muted-foreground">
                    <p>
                        If you believe this is an error, please contact your administrator or try logging in with a
                        different account.
                    </p>
                </CardContent>
                <CardFooter className="flex justify-center gap-4">
                    <Button variant="outline" asChild className="border-red-200 hover:bg-red-100 hover:text-red-900">
                        <Link href="/contact">Contact Support</Link>
                    </Button>
                    <Button asChild className="bg-red-600 hover:bg-red-700 text-white">
                        <Link href="/">Return Home</Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
