import { Dashboard } from '../Dashboard';

export const dynamic = 'force-dynamic';

export default async function VenueSection({ params }: { params: Promise<{ venueId: string; section: string }> }) {
  const { venueId, section } = await params;
  return <Dashboard venueId={venueId} section={section} />;
}
