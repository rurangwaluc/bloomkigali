import { eq } from 'drizzle-orm';
import { requireOwner } from '@/lib/auth/session';
import { db } from '@bloom-kigali/db/client';
import { users } from '@bloom-kigali/db/schema';
import { SettingsWorkspace } from './settings-workspace';

export default async function SettingsPage() {
  const owner =
    await requireOwner();

  const [
    settings,
    staffUsers,
  ] =
    await Promise.all([
      db.query.businessSettings.findFirst(),

      db
        .select({
          id: users.id,
          name: users.name,
          email:
            users.email,
          phone:
            users.phone,
          status:
            users.status,
        })
        .from(users)
        .where(
          eq(
            users.role,
            'EMPLOYEE',
          ),
        ),
    ]);

  const safeSettings = {
    businessName:
      settings
        ?.businessName ||
      "Bloom Kigali",

    ownerName:
      owner.name ||
      settings
        ?.ownerName ||
      'Owner',

    phone:
      owner.phone ||
      settings?.phone ||
      '',

    address:
      settings?.address ||
      '',
  };

  return (
    <section>
      <SettingsWorkspace
        settings={
          safeSettings
        }
        staffUsers={
          staffUsers
        }
      />
    </section>
  );
}
