import { getCurrentUserRole } from '@/lib/rbac';
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import StudentDashboard from '@/components/dashboard/student-dashboard'

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params;
  const { userId } = await auth();
  const userRole = await getCurrentUserRole();

  if (!userId) {
    redirect(`/${locale}/sign-in`)
  }

  return (
    <div className="dashboard-container">
      {/* Render condicional por rol - AQUÍ van los componentes */}
      {userRole === 'student' && <StudentDashboard />}
      {userRole === 'professor' && <div>Professor Dashboard Placeholder</div>}
      {(userRole === 'admin' || userRole === 'superadmin') && <div>Admin Dashboard Placeholder</div>}

      {/* Fallback si no hay rol asignado */}
      {!userRole && <div>Welcome! Please contact admin to assign your role.</div>}
    </div>
  )
}
