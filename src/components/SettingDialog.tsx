import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";

interface SettingsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SettingsDialog({
  isOpen,
  onOpenChange,
}: SettingsDialogProps) {
  const [contactTab, setContactTab] = useState("all");
  const [language, setLanguage] = useState("English");
  const [startOnStartup, setStartOnStartup] = useState(true);
  const [rememberLastSignIn, setRememberLastSignIn] = useState(true);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          {/* Contact Tab */}
          <div className="grid gap-2">
            <h4 className="font-semibold">Contact tab</h4>
            <div className="grid gap-2">
              <Label>Friends shown in Contact tab</Label>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="all"
                  name="contactTab"
                  value="all"
                  checked={contactTab === "all"}
                  onChange={() => setContactTab("all")}
                />
                <Label htmlFor="all">All Friends</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="active"
                  name="contactTab"
                  value="active"
                  checked={contactTab === "active"}
                  onChange={() => setContactTab("active")}
                />
                <Label htmlFor="active">Active Friends Only</Label>
              </div>
            </div>
          </div>

          {/* Language */}
          <div className="grid gap-2">
            <h4 className="font-semibold">Language</h4>
            <div className="flex items-center justify-between">
              <Label>Change language</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="English">English</SelectItem>
                  <SelectItem value="Vietnamese">Vietnamese</SelectItem>
                  {/* Add more languages as needed */}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Startup & Remember Account */}
          <div className="grid gap-2">
            <h4 className="font-semibold">Startup & remember account</h4>
            <div className="flex items-center justify-between">
              <Label>Start Zalo on system startup</Label>
              <Switch
                checked={startOnStartup}
                onCheckedChange={setStartOnStartup}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Remember last sign in</Label>
              <Switch
                checked={rememberLastSignIn}
                onCheckedChange={setRememberLastSignIn}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
