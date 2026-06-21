import { Bell } from "lucide-react";
import { SectionHeading } from "@/components/saas/section-heading";
import { notifications } from "@/lib/community-data";

export default function NotificationsPage() {
  return (
    <div className="space-y-7">
      <SectionHeading eyebrow="Notifications" title="Notifications" description="Centre des evenements research, portefeuille et formation." />
      <div className="premium-card rounded-[22px] p-5">
        <div className="divide-y divide-line">
          {notifications.map((notification) => (
            <div key={notification.id} className="flex gap-3 py-4">
              <Bell className={notification.unread ? "text-accent" : "text-muted"} size={20} />
              <div>
                <p className="font-semibold text-white">{notification.title}</p>
                <p className="mt-1 text-sm text-muted">{notification.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
