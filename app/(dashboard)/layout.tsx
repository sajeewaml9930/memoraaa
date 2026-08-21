import { getServerSession } from "next-auth";
import { authConfig } from "@/app/lib/auth";
import { redirect } from "next/navigation";
import NavBar from "./components/NavBar";
import DashboardContent from "./components/DashboardContent";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authConfig);

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen bg-background">
      <div className="pointer-events-none fixed bottom-0 left-0 z-50 w-full md:w-80">
        <div className="pointer-events-auto">
          <NavBar />
        </div>
      </div>
      <DashboardContent>{children}</DashboardContent>
    </div>
  );
}
