import { useToast } from "../../context/ToastContext";
import Toast from "./Toast";

export default function ToastContainer() {
  const { toasts, dismiss } = useToast();
  return (
    <div className="fixed bottom-6 right-6 z-[60] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <Toast
          key={t.id}
          variant={t.variant}
          message={t.message}
          duration={t.duration}
          action={t.action}
          onDismiss={() => dismiss(t.id)}
        />
      ))}
    </div>
  );
}
