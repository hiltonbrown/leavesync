import { NewHolidayModal } from "./new-holiday-modal";

export default function NewHolidayPage() {
  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <div className="w-full max-w-md">
        <NewHolidayModal />
      </div>
    </div>
  );
}
