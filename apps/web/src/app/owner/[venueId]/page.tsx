import { Dashboard } from './Dashboard';

export const dynamic = 'force-dynamic';

export default async function VenueDashboard({ params }: { params: Promise<{ venueId: string }> }) {
  const { venueId } = await params;
  return <Dashboard venueId={venueId} section="statistici" />;
}
