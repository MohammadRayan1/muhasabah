import { input, label } from "@/components/ui";

type Defaults = { name?: string; guardianName?: string | null; phone?: string | null; email?: string | null };

/** Name + parent contact. Reminders and receipts go to this contact first. */
export default function FamilyFields({ defaults = {} }: { defaults?: Defaults }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label htmlFor="family-name" className={label}>
          Family name
        </label>
        <input id="family-name" name="name" required placeholder="Khan family" defaultValue={defaults.name ?? ""} className={input} />
      </div>
      <div>
        <label htmlFor="family-guardian" className={label}>
          Parent or guardian
        </label>
        <input id="family-guardian" name="guardianName" placeholder="Sister Fatima" defaultValue={defaults.guardianName ?? ""} className={input} />
      </div>
      <div>
        <label htmlFor="family-phone" className={label}>
          Phone (for WhatsApp / text)
        </label>
        <input id="family-phone" name="phone" type="tel" defaultValue={defaults.phone ?? ""} className={input} />
      </div>
      <div>
        <label htmlFor="family-email" className={label}>
          Email
        </label>
        <input id="family-email" name="email" type="email" defaultValue={defaults.email ?? ""} className={input} />
      </div>
    </div>
  );
}
