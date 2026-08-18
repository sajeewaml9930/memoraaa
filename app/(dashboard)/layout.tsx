import { getServerSession } from "next-auth";
import { authConfig } from "@/app/lib/auth";
import { redirect } from "next/navigation";
import NavBar from "./components/NavBar";

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
    <div className="flex h-screen bg-white">
      {/* Panel 1: NavBar */}
      <NavBar />

      {/* Main Content (Panels 2 & 3) */}
      <div className="flex flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
