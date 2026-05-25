"use client";

import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState } from "react";
import {
  ArrowRight,
  House,
  Settings,
  User,
  Bell,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import { ModeToggle } from "@/components/mode-toggle";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function Home() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background relative">
      <div className="absolute top-4 right-4">
        <ModeToggle />
      </div>
      <main className="flex flex-col items-center gap-12 px-4 text-center sm:px-8 md:max-w-5xl w-full">
        {/* Hero Section */}
        <div className="space-y-4 pt-12">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            Build Faster with <span className="text-primary">Template</span>
          </h1>
          <p className="mx-auto max-w-[42rem] leading-normal text-muted-foreground sm:text-xl sm:leading-8">
            This is a template pre-configured with Shadcn UI and Tailwind CSS v4.
            Start building your next idea with a modern stack.
          </p>
        </div>

        {/* Interactive Demos Section */}
        <div className="grid w-full gap-8 md:grid-cols-2 lg:gap-12">
          {/* Toast Demos */}
          <div className="flex flex-col items-center gap-6 rounded-xl border bg-card p-8 text-card-foreground shadow-sm">
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">Toast Notifications</h3>
              <p className="text-sm text-muted-foreground">
                Click headers to trigger different toast variants
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-4">
              <Button
                variant="outline"
                onClick={() =>
                  toast("Event has been created", {
                    description: "Sunday, December 03, 2023 at 9:00 AM",
                    action: {
                      label: "Undo",
                      onClick: () => console.log("Undo"),
                    },
                  })
                }
              >
                Default
              </Button>
              <Button
                variant="outline"
                onClick={() => toast.success("Event has been created")}
              >
                Success
              </Button>
              <Button
                variant="outline"
                onClick={() => toast.error("Event has been created")}
              >
                Error
              </Button>
            </div>
          </div>

          {/* Dialog Demo */}
          <div className="flex flex-col items-center justify-center gap-6 rounded-xl border bg-card p-8 text-card-foreground shadow-sm">
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">Dialog Component</h3>
              <p className="text-sm text-muted-foreground">
                Accessible modal dialog example
              </p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>Open Dialog</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Are you absolutely sure?</DialogTitle>
                  <DialogDescription>
                    This action cannot be undone. This will permanently delete your
                    account and remove your data from our servers.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      setIsDialogOpen(false);
                      toast.success("Account deleted");
                    }}
                  >
                    Confirm
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Icons Card */}
          <div className="flex flex-col items-center justify-center gap-6 rounded-xl border bg-card p-8 text-card-foreground shadow-sm">
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">Included Icons</h3>
              <p className="text-sm text-muted-foreground">
                A sample of available icons
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-8">
              <div className="flex flex-col items-center gap-2 transition-colors hover:text-primary">
                <House className="h-8 w-8" />
                <span className="text-xs font-medium text-muted-foreground">House</span>
              </div>
              <div className="flex flex-col items-center gap-2 transition-colors hover:text-primary">
                <Settings className="h-8 w-8" />
                <span className="text-xs font-medium text-muted-foreground">Settings</span>
              </div>
              <div className="flex flex-col items-center gap-2 transition-colors hover:text-primary">
                <User className="h-8 w-8" />
                <span className="text-xs font-medium text-muted-foreground">User</span>
              </div>
              <div className="flex flex-col items-center gap-2 transition-colors hover:text-primary">
                <Bell className="h-8 w-8" />
                <span className="text-xs font-medium text-muted-foreground">Bell</span>
              </div>
              <div className="flex flex-col items-center gap-2 transition-colors hover:text-primary">
                <Calendar className="h-8 w-8" />
                <span className="text-xs font-medium text-muted-foreground">Calendar</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="absolute bottom-4 text-sm text-muted-foreground">
        <p>Built with Next.js & Tailwind v4</p>
      </footer>
    </div>
  );
}
