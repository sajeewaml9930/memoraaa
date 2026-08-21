"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Bell,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Clock3,
  FileKey2,
  FolderArchive,
  KeyRound,
  Lock,
  LogOut,
  MessageCircle,
  Moon,
  Palette,
  Search,
  Shield,
  Smartphone,
  User,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ChangePasswordDialog } from "../components/ChangePasswordDialog";
import { AccountActionsDialog } from "../components/AccountActionsDialog";
import { ProfileAvatar } from "../components/ProfileAvatar";
import { TwoFactorToggle } from "../components/TwoFactorToggle";
import { ModeToggle } from "@/app/components/mode-toggle";
import { WallpaperSettings } from "./components/WallpaperSettings";

type CategoryId =
  | "profile"
  | "account"
  | "privacy"
  | "notifications"
  | "chats"
  | "shortcuts"
  | "help";
type Profile = {
  fullName: string;
  username: string;
  email: string;
  bio: string;
  avatar: string | null;
};
type Reminders = {
  dailyReminderTime: string | null;
  dailyReminderEnabled: boolean;
  timezone: string;
  lastReminderSent: string | null;
};
type Album = { id: number; name: string; isMuted?: boolean };

const emptyProfile: Profile = {
  fullName: "",
  username: "",
  email: "",
  bio: "",
  avatar: null,
};
const emptyReminders: Reminders = {
  dailyReminderTime: "09:00",
  dailyReminderEnabled: true,
  timezone: "UTC",
  lastReminderSent: null,
};
const categories: Array<{
  id: CategoryId;
  label: string;
  description: string;
  icon: typeof User;
  keywords: string;
}> = [
  {
    id: "profile",
    label: "Profile",
    description: "Name, picture and about",
    icon: User,
    keywords: "avatar username bio name",
  },
  {
    id: "account",
    label: "Account",
    description: "Security and account details",
    icon: KeyRound,
    keywords: "password security delete two factor",
  },
  {
    id: "privacy",
    label: "Privacy",
    description: "Locks, sharing and encryption",
    icon: Shield,
    keywords: "passcode biometric encryption local",
  },
  {
    id: "notifications",
    label: "Notifications",
    description: "Alerts, reminders and sounds",
    icon: Bell,
    keywords: "email in app reminders albums mute",
  },
  {
    id: "chats",
    label: "Chats and albums",
    description: "Theme and album defaults",
    icon: MessageCircle,
    keywords: "wallpaper theme archive privacy background",
  },
  {
    id: "shortcuts",
    label: "Keyboard shortcuts",
    description: "Move around Memoraa faster",
    icon: Smartphone,
    keywords: "keyboard ctrl command search",
  },
  {
    id: "help",
    label: "Help and feedback",
    description: "Guides, support and legal",
    icon: HelpCircle,
    keywords: "help faq support bug privacy terms",
  },
];

function PlannedBadge() {
  return (
    <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
      Coming soon
    </span>
  );
}
function SettingRow({
  icon: Icon,
  title,
  description,
  children,
  disabled = false,
}: {
  icon: typeof User;
  title: string;
  description: string;
  children?: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-4 border-b border-border py-4 last:border-0 ${disabled ? "opacity-55" : ""}`}
    >
      <Icon className="size-5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const [activeCategory, setActiveCategory] = useState<CategoryId | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [reminders, setReminders] = useState<Reminders>(emptyReminders);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [inAppNotifications, setInAppNotifications] = useState(true);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingReminders, setSavingReminders] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const responses = await Promise.all([
          fetch("/api/user/profile"),
          fetch("/api/settings/reminders"),
          fetch("/api/settings/notifications"),
          fetch("/api/albums"),
        ]);
        const [profileData, reminderData, notificationData, albumsData] =
          await Promise.all(
            responses.map((response) => response.json().catch(() => ({}))),
          );
        if (responses[0].ok)
          setProfile({
            fullName: profileData?.data?.fullName ?? "",
            username: profileData?.data?.username ?? "",
            email: profileData?.data?.email ?? "",
            bio: profileData?.data?.bio ?? "",
            avatar: profileData?.data?.avatar ?? null,
          });
        if (responses[1].ok)
          setReminders({ ...emptyReminders, ...reminderData?.data });
        if (responses[2].ok) {
          setEmailNotifications(
            Boolean(notificationData?.data?.emailNotificationsEnabled),
          );
          setInAppNotifications(
            Boolean(notificationData?.data?.inAppNotificationsEnabled),
          );
        }
        if (responses[3].ok)
          setAlbums(Array.isArray(albumsData?.data) ? albumsData.data : []);
      } catch {
        setError("Some settings could not be loaded.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const filteredCategories = useMemo(
    () =>
      categories.filter((category) =>
        `${category.label} ${category.description} ${category.keywords}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase()),
      ),
    [searchQuery],
  );
  const currentCategory = categories.find(
    (category) => category.id === activeCategory,
  );
  const showSidebar = activeCategory === null;

  const saveProfile = async () => {
    setSavingProfile(true);
    setNotice(null);
    setError(null);
    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(payload?.error || "Unable to save profile");
      await update?.({
        name: profile.fullName || profile.username,
        image: profile.avatar || undefined,
      });
      setNotice("Profile saved.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save profile",
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const updateNotifications = async (updates: {
    emailNotificationsEnabled?: boolean;
    inAppNotificationsEnabled?: boolean;
  }) => {
    const response = await fetch("/api/settings/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error("Unable to update notifications");
    setNotice("Notification preference saved.");
  };
  const toggleAlbumMute = async (album: Album) => {
    try {
      const response = await fetch(`/api/albums/${album.id}/mute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ muted: !album.isMuted }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(payload?.error || "Unable to update album");
      setAlbums((current) =>
        current.map((item) =>
          item.id === album.id
            ? { ...item, isMuted: payload?.data?.isMuted ?? !album.isMuted }
            : item,
        ),
      );
    } catch (toggleError) {
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : "Unable to update album",
      );
    }
  };
  const saveReminders = async () => {
    setSavingReminders(true);
    try {
      const response = await fetch("/api/settings/reminders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reminders),
      });
      if (!response.ok) throw new Error("Unable to save reminders");
      setNotice("Reminder settings saved.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save reminders",
      );
    } finally {
      setSavingReminders(false);
    }
  };

  const renderProfile = () => (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>
          Make your Memoraa profile feel like yours.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <ProfileAvatar
          avatar={profile.avatar}
          fullName={profile.fullName || profile.username}
          onAvatarChange={(avatar) =>
            setProfile((current) => ({ ...current, avatar }))
          }
          onStatus={(message, isError) => {
            if (isError) setError(message);
            else setNotice(message);
          }}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm font-medium">
            Full name<span style={{ color: "red", marginLeft: "4px" }}>*</span>
            <Input
              value={profile.fullName}
              onChange={(event) =>
                setProfile({ ...profile, fullName: event.target.value })
              }
            />
          </label>
          <label className="space-y-2 text-sm font-medium">
            Username<span style={{ color: "red", marginLeft: "4px" }}>*</span>
            <Input
              value={profile.username}
              onChange={(event) =>
                setProfile({ ...profile, username: event.target.value })
              }
            />
          </label>
        </div>
        <label className="block space-y-2 text-sm font-medium">
          Email<span style={{ color: "red", marginLeft: "4px" }}>*</span>
          <Input
            type="email"
            value={profile.email}
            onChange={(event) =>
              setProfile({ ...profile, email: event.target.value })
            }
          />
        </label>
        <label className="block space-y-2 text-sm font-medium">
          About
          <textarea
            value={profile.bio}
            maxLength={50}
            onChange={(event) =>
              setProfile({ ...profile, bio: event.target.value })
            }
            className="min-h-24 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <p className="text-xs text-muted-foreground">
            {profile.bio.length}/50 characters
          </p>
        </label>
        <Button onClick={saveProfile} disabled={savingProfile || loading}>
          {savingProfile ? "Saving..." : "Save profile"}
        </Button>
      </CardContent>
    </Card>
  );
  const renderAccount = () => (
    <Card>
      <CardHeader>
        <CardTitle>Account</CardTitle>
        <CardDescription>
          Keep your account secure and review its details.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SettingRow
          icon={KeyRound}
          title="Change password"
          description="Update the password used to sign in to Memoraa"
        >
          <ChangePasswordDialog />
        </SettingRow>
        <SettingRow
          icon={FileKey2}
          title="Two-factor authentication"
          description="Verify your identity with an extra security step"
        >
          <TwoFactorToggle />
        </SettingRow>
        <SettingRow
          icon={User}
          title="Account email"
          description={profile.email || "Loading account email"}
        />
        <SettingRow
          icon={LogOut}
          title="Deactivate or delete account"
          description="Temporarily disable or permanently remove your account"
        >
          <AccountActionsDialog />
        </SettingRow>
      </CardContent>
    </Card>
  );
  const renderPrivacy = () => (
    <Card>
      <CardHeader>
        <CardTitle>Privacy</CardTitle>
        <CardDescription>
          Control locks, sharing and the protection around your memories.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SettingRow
          icon={Lock}
          title="Album passcodes"
          description="Set or change a passcode from the album lock controls"
        >
          <PlannedBadge />
        </SettingRow>
        <SettingRow
          icon={Shield}
          title="Encryption status"
          description="Your memories are protected by the existing encryption layer"
        >
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
            <Check className="size-4" /> Active
          </span>
        </SettingRow>
        <SettingRow
          icon={Smartphone}
          title="Biometric lock"
          description="Use device biometrics to unlock Memoraa"
          disabled
        >
          <PlannedBadge />
        </SettingRow>
        <SettingRow
          icon={Lock}
          title="Local-only mode"
          description="Keep a private local vault on this device"
          disabled
        >
          <PlannedBadge />
        </SettingRow>
      </CardContent>
    </Card>
  );
  const renderNotifications = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>
            Choose how Memoraa keeps you informed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SettingRow
            icon={Bell}
            title="In-app notifications"
            description="Show activity and memory updates in Memoraa"
          >
            <Switch
              checked={inAppNotifications}
              onCheckedChange={async (checked) => {
                setInAppNotifications(checked);
                try {
                  await updateNotifications({
                    inAppNotificationsEnabled: checked,
                  });
                } catch {
                  setInAppNotifications(!checked);
                  setError("Unable to update notifications");
                }
              }}
            />
          </SettingRow>
          <SettingRow
            icon={Bell}
            title="Email notifications"
            description="Receive important updates by email"
          >
            <Switch
              checked={emailNotifications}
              onCheckedChange={async (checked) => {
                setEmailNotifications(checked);
                try {
                  await updateNotifications({
                    emailNotificationsEnabled: checked,
                  });
                } catch {
                  setEmailNotifications(!checked);
                  setError("Unable to update notifications");
                }
              }}
            />
          </SettingRow>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Daily reminders</CardTitle>
          <CardDescription>Make a little room for remembering.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SettingRow
            icon={Clock3}
            title="Daily reminder"
            description="Receive a prompt to write a memory"
          >
            <Switch
              checked={reminders.dailyReminderEnabled}
              onCheckedChange={(checked) =>
                setReminders({ ...reminders, dailyReminderEnabled: checked })
              }
            />
          </SettingRow>
          {reminders.dailyReminderEnabled && (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-medium">
                Time
                <Input
                  type="time"
                  value={reminders.dailyReminderTime ?? "09:00"}
                  onChange={(event) =>
                    setReminders({
                      ...reminders,
                      dailyReminderTime: event.target.value,
                    })
                  }
                />
              </label>
              <label className="space-y-2 text-sm font-medium">
                Timezone
                <Select
                  value={reminders.timezone}
                  onValueChange={(value) =>
                    value && setReminders({ ...reminders, timezone: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="America/New_York">
                      America/New_York
                    </SelectItem>
                    <SelectItem value="Europe/London">Europe/London</SelectItem>
                    <SelectItem value="Asia/Tokyo">Asia/Tokyo</SelectItem>
                  </SelectContent>
                </Select>
              </label>
            </div>
          )}
          <Button onClick={saveReminders} disabled={savingReminders}>
            {savingReminders ? "Saving..." : "Save reminders"}
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Album notifications</CardTitle>
          <CardDescription>
            Mute individual albums without changing global preferences.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {albums.length ? (
            albums.map((album) => (
              <SettingRow
                key={album.id}
                icon={MessageCircle}
                title={album.name}
                description={album.isMuted ? "Muted" : "Notifications enabled"}
              >
                <Switch
                  checked={Boolean(album.isMuted)}
                  onCheckedChange={() => void toggleAlbumMute(album)}
                />
              </SettingRow>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No albums found.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
  const renderChats = () => (
    <Card>
      <CardHeader>
        <CardTitle>Chats and albums</CardTitle>
        <CardDescription>
          Choose the way your spaces feel and behave.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SettingRow
          icon={Moon}
          title="Dark mode"
          description="Use a darker palette at night"
        >
          <ModeToggle />
        </SettingRow>
        <SettingRow
          icon={Palette}
          title="Chat wallpaper"
          description="Choose a personal background for your memory stream"
        >
          <span className="text-xs text-muted-foreground">Customize below</span>
        </SettingRow>
        <div className="border-b border-border py-4">
          <WallpaperSettings />
        </div>
        <SettingRow
          icon={FolderArchive}
          title="Automatic archive"
          description="Archive inactive albums automatically"
          disabled
        >
          <PlannedBadge />
        </SettingRow>
        <SettingRow
          icon={Shield}
          title="Default album privacy"
          description="Choose a default for new albums"
          disabled
        >
          <PlannedBadge />
        </SettingRow>
      </CardContent>
    </Card>
  );
  const renderShortcuts = () => (
    <Card>
      <CardHeader>
        <CardTitle>Keyboard shortcuts</CardTitle>
        <CardDescription>Quick ways to move through Memoraa.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {[
          ["Ctrl / Cmd + K", "Open search"],
          ["Ctrl / Cmd + Enter", "Send a memory"],
          ["Escape", "Close menus and dialogs"],
          ["Ctrl / Cmd + ,", "Open settings"],
        ].map(([key, label]) => (
          <div
            key={key}
            className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-3 text-sm"
          >
            <span className="text-slate-600">{label}</span>
            <kbd className="rounded border border-slate-200 bg-white px-2 py-1 font-mono text-xs text-slate-700">
              {key}
            </kbd>
          </div>
        ))}
      </CardContent>
    </Card>
  );
  const renderHelp = () => (
    <Card>
      <CardHeader>
        <CardTitle>Help and feedback</CardTitle>
        <CardDescription>
          Find answers or help us make Memoraa better.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SettingRow
          icon={BookOpen}
          title="Documentation and FAQ"
          description="Guides for albums, memories and sharing"
        >
          <ChevronRight className="size-4 text-slate-400" />
        </SettingRow>
        <SettingRow
          icon={HelpCircle}
          title="Contact support"
          description="Support inbox integration is coming soon"
        >
          <PlannedBadge />
        </SettingRow>
        <SettingRow
          icon={HelpCircle}
          title="Report a bug"
          description="Tell us what went wrong"
        >
          <PlannedBadge />
        </SettingRow>
        <SettingRow
          icon={Shield}
          title="Privacy policy and terms"
          description="Review the legal details"
        >
          <ChevronRight className="size-4 text-slate-400" />
        </SettingRow>
      </CardContent>
    </Card>
  );
  const content =
    activeCategory === "profile" ? (
      renderProfile()
    ) : activeCategory === "account" ? (
      renderAccount()
    ) : activeCategory === "privacy" ? (
      renderPrivacy()
    ) : activeCategory === "notifications" ? (
      renderNotifications()
    ) : activeCategory === "chats" ? (
      renderChats()
    ) : activeCategory === "shortcuts" ? (
      renderShortcuts()
    ) : activeCategory === "help" ? (
      renderHelp()
    ) : (
      <div className="flex min-h-[520px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 text-center">
        <div className="mb-5 flex size-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300">
          <Lock className="size-9" />
        </div>
        <h2 className="text-xl font-semibold text-card-foreground">
          Welcome to Memoraa settings
        </h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          Choose a category to manage your profile, privacy, notifications and
          the spaces where your memories live.
        </p>
      </div>
    );

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background text-foreground lg:flex-row">
      <aside
        className={`${showSidebar ? "flex" : "hidden"} w-full shrink-0 flex-col border-r border-border bg-card lg:flex lg:w-[360px]`}
      >
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <Avatar className="size-12">
            <AvatarImage
              src={profile.avatar ?? session?.user?.image ?? undefined}
            />
            <AvatarFallback className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
              {(profile.fullName || session?.user?.name || "U")
                .slice(0, 1)
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-slate-800">
              {profile.fullName || session?.user?.name || "Your profile"}
            </p>
            <p className="truncate text-xs text-slate-500">
              {profile.bio || "Make your memories yours"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => history.back()}
            aria-label="Close settings"
          >
            <X />
          </Button>
        </div>
        <div className="border-b border-slate-100 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search settings"
              className="h-10 bg-slate-50 pl-9"
            />
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-2">
          {filteredCategories.map((category) => {
            const Icon = category.icon;
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => setActiveCategory(category.id)}
                className="flex w-full items-center gap-4 rounded-lg px-4 py-3 text-left transition hover:bg-emerald-50"
              >
                <Icon className="size-5 text-slate-500" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-slate-800">
                    {category.label}
                  </span>
                  <span className="block truncate text-xs text-slate-500">
                    {category.description}
                  </span>
                </span>
                <ChevronRight className="size-4 text-slate-300" />
              </button>
            );
          })}
          {!filteredCategories.length && (
            <p className="p-4 text-sm text-slate-500">No settings found.</p>
          )}
        </nav>
      </aside>
      <main
        className={`${showSidebar ? "hidden lg:flex" : "flex"} min-w-0 flex-1 flex-col`}
      >
        <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              activeCategory ? setActiveCategory(null) : history.back()
            }
            aria-label="Back"
          >
            <ChevronLeft />
          </Button>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-emerald-600">
              Memoraa
            </p>
            <h1 className="text-lg font-semibold text-slate-800">
              {currentCategory?.label ?? "Settings"}
            </h1>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="mx-auto max-w-3xl">
            {notice && (
              <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                {notice}
              </div>
            )}
            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            {content}
          </div>
        </div>
      </main>
    </div>
  );
}
