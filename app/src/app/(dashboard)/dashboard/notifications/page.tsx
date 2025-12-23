import { getNotifications } from '@/lib/notifications/actions'
import { NotificationsList } from './NotificationsList'

export default async function NotificationsPage() {
  const notifications = await getNotifications(50)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Notifications</h1>
        <p className="text-gray-500">
          Stay updated on your orders and messages
        </p>
      </div>

      <NotificationsList initialNotifications={notifications} />
    </div>
  )
}
