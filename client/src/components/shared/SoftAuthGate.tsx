import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuthGateStore } from '@/stores/auth-gate-store';

// Dismissible "join" prompt shown when a logged-out visitor tries to interact.
// Rendered once in AppLayout; never navigates away on its own.
export function SoftAuthGate() {
  const open = useAuthGateStore((state) => state.open);
  const closeGate = useAuthGateStore((state) => state.closeGate);
  const navigate = useNavigate();

  const goTo = (path: string) => {
    closeGate();
    navigate(path);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) closeGate(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>SocialHan'a katıl</DialogTitle>
          <DialogDescription>
            Beğenmek, yanıtlamak, takip etmek ve mesaj göndermek için bir hesabın olmalı.
            Birkaç saniye sürer.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button className="w-full" onClick={() => goTo('/register')}>
            Hesap oluştur
          </Button>
          <Button variant="outline" className="w-full" onClick={() => goTo('/login')}>
            Giriş yap
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
