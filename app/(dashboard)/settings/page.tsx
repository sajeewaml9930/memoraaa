"use client";

import { useEffect, useRef, useState } from "react";
import { Bar, Line } from "react-chartjs-2";
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from "chart.js";
import { useSession } from "next-auth/react";
import { MOOD_META } from "@/app/lib/moods";

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, ArcElement);

type ProfileForm = {
  fullName: string;
  username: string;
  email: string;
  bio: string;
  avatar: string | null;
};

type ReminderSettings = {
  dailyReminderTime: string | null;
  dailyReminderEnabled: boolean;
  timezone: string;
  lastReminderSent: string | null;
};

const emptyProfile: ProfileForm = {
  fullName: "",
  username: "",
  email: "",
  bio: "",
  avatar: null,
};

const emptyReminders: ReminderSettings = {
  dailyReminderTime: null,
  dailyReminderEnabled: true,
  timezone: "UTC",
  lastReminderSent: null,
};

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [profile, setProfile] = useState<ProfileForm>(emptyProfile);
  const [reminders, setReminders] = useState<ReminderSettings>(emptyReminders);
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(true);
  const [inAppNotificationsEnabled, setInAppNotificationsEnabled] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingReminders, setLoadingReminders] = useState(true);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingReminders, setSavingReminders] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [moodStats, setMoodStats] = useState<{
    distribution: Array<{ mood: string; count: number; percentage: number; emoji: string; label: string }>;
    timeline: Array<{ date: string; averageScore: number; dominantMood: string | null }>;
    totalWithMood: number;
    streak: { longestAnyStreak: number; longestPositiveStreak: number };
    summary: {
      mostCommonMood: { mood: string; emoji: string; label: string; percentage: number } | null;
      totalMoodsTracked: number;
    };
  } | null>(null);
  const [moodStatsLoading, setMoodStatsLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch("/api/user/profile");
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data?.error || "Unable to load profile");
        }

        setProfile({
          fullName: data?.data?.fullName ?? "",
          username: data?.data?.username ?? "",
          email: data?.data?.email ?? "",
          bio: data?.data?.bio ?? "",
          avatar: data?.data?.avatar ?? null,
        });
      } catch (loadError) {
        console.error("Error fetching profile:", loadError);
        setError(loadError instanceof Error ? loadError.message : "Unable to load profile");
      } finally {
        setLoadingProfile(false);
      }
    };

    const fetchReminders = async () => {
      try {
        const response = await fetch("/api/settings/reminders");
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data?.error || "Unable to load reminder settings");
        }

        const tz = typeof Intl !== "undefined" && Intl.DateTimeFormat
          ? Intl.DateTimeFormat().resolvedOptions().timeZone
          : "UTC";

        setReminders({
          dailyReminderTime: data?.data?.dailyReminderTime ?? null,
          dailyReminderEnabled: data?.data?.dailyReminderEnabled ?? true,
          timezone: data?.data?.timezone ?? tz,
          lastReminderSent: data?.data?.lastReminderSent ?? null,
        });
      } catch (loadError) {
        console.error("Error fetching reminder settings:", loadError);
      } finally {
        setLoadingReminders(false);
      }
    };

    const fetchSettings = async () => {
      try {
        const response = await fetch("/api/settings/notifications");
        const data = await response.json();
        if (response.ok && data?.data) {
          setEmailNotificationsEnabled(Boolean(data.data.emailNotificationsEnabled));
          setInAppNotificationsEnabled(Boolean(data.data.inAppNotificationsEnabled));
        }
      } catch (fetchError) {
        console.error("Error fetching notification settings:", fetchError);
      } finally {
        setLoadingNotifications(false);
      }
    };

    const fetchMoodStats = async () => {
      try {
        const response = await fetch("/api/stats/moods");
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload?.error || "Unable to load mood statistics");
        }

        setMoodStats(payload?.data ?? null);
      } catch (statsError) {
        console.error("Error fetching mood statistics:", statsError);
        setMoodStats(null);
      } finally {
        setMoodStatsLoading(false);
      }
    };

    void fetchProfile();
    void fetchReminders();
    void fetchSettings();
    void fetchMoodStats();
  }, []);

  const updateSetting = async (updates: {
    emailNotificationsEnabled?: boolean;
    inAppNotificationsEnabled?: boolean;
  }) => {
    try {
      const response = await fetch("/api/settings/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to update settings");
      }
    } catch (settingsError) {
      console.error("Error updating settings:", settingsError);
      window.alert(
        settingsError instanceof Error ? settingsError.message : "Unable to update notification settings"
      );
    }
  };

  const handleProfileChange = (key: keyof ProfileForm, value: string) => {
    setProfile((current) => ({ ...current, [key]: value }));
  };

  const handleProfileSave = async () => {
    setError(null);
    setMessage(null);
    setSavingProfile(true);

    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: profile.fullName,
          username: profile.username,
          email: profile.email,
          bio: profile.bio,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error || "Unable to save profile");
      }

      const nextName = payload?.data?.fullName || payload?.data?.username || session?.user?.name || "You";
      await update?.({
        name: nextName,
        image: payload?.data?.avatar || session?.user?.image || undefined,
      });
      setMessage("Profile saved successfully.");
      setProfile((current) => ({
        ...current,
        avatar: payload?.data?.avatar ?? current.avatar,
      }));
    } catch (saveError) {
      console.error("Error saving profile:", saveError);
      setError(saveError instanceof Error ? saveError.message : "Unable to save profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setError(null);
    setMessage(null);
    setUploadingAvatar(true);

    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const response = await fetch("/api/user/avatar", {
        method: "POST",
        body: formData,
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error || "Avatar upload failed");
      }

      const nextAvatar = payload?.data?.avatar ? "/api/user/avatar" : null;
      setProfile((current) => ({ ...current, avatar: nextAvatar }));
      await update?.({
        image: nextAvatar || undefined,
      });
      setMessage("Avatar updated.");
    } catch (avatarError) {
      console.error("Error uploading avatar:", avatarError);
      setError(avatarError instanceof Error ? avatarError.message : "Avatar upload failed");
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveAvatar = async () => {
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/user/avatar", { method: "DELETE" });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error || "Unable to remove avatar");
      }

      setProfile((current) => ({ ...current, avatar: null }));
      await update?.({ image: undefined });
      setMessage("Avatar removed.");
    } catch (removeError) {
      console.error("Error removing avatar:", removeError);
      setError(removeError instanceof Error ? removeError.message : "Unable to remove avatar");
    }
  };

  const handleReminderChange = (key: keyof ReminderSettings, value: string | boolean | null) => {
    setReminders((current) => ({ ...current, [key]: value }));
  };

  const handleReminderSave = async () => {
    setError(null);
    setMessage(null);
    setSavingReminders(true);

    try {
      const response = await fetch("/api/settings/reminders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dailyReminderTime: reminders.dailyReminderTime,
          dailyReminderEnabled: reminders.dailyReminderEnabled,
          timezone: reminders.timezone,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error || "Unable to save reminder settings");
      }

      setMessage("Reminder settings saved.");
    } catch (saveError) {
      console.error("Error saving reminder settings:", saveError);
      setError(saveError instanceof Error ? saveError.message : "Unable to save reminder settings");
    } finally {
      setSavingReminders(false);
    }
  };

  const handleSkipReminder = async () => {
    try {
      const response = await fetch("/api/reminders/skip", { method: "POST" });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error || "Unable to skip reminder");
      }

      setMessage("Reminder skipped for today.");
    } catch (skipError) {
      console.error("Error skipping reminder:", skipError);
      setError(skipError instanceof Error ? skipError.message : "Unable to skip reminder");
    }
  };

  const moodDistributionChart = moodStats ? {
    labels: moodStats.distribution.map((entry) => `${entry.emoji} ${entry.label}`),
    datasets: [
      {
        label: "Memories by mood",
        data: moodStats.distribution.map((entry) => entry.count),
        backgroundColor: [
          "#fbbf24",
          "#f472b6",
          "#60a5fa",
          "#f87171",
          "#6ee7b7",
          "#a78bfa",
          "#cbd5e1",
          "#f59e0b",
          "#fb7185",
          "#34d399",
        ],
      },
    ],
  } : null;

  const moodTimelineChart = moodStats ? {
    labels: moodStats.timeline.map((entry) => entry.date.slice(5)),
    datasets: [
      {
        label: "Mood score",
        data: moodStats.timeline.map((entry) => entry.averageScore),
        borderColor: "#2563eb",
        backgroundColor: "rgba(37, 99, 235, 0.12)",
        tension: 0.35,
        fill: true,
      },
    ],
  } : null;

  return (
    <div className="flex flex-1 flex-col bg-gray-50 p-8">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="mt-1 text-sm text-gray-600">Manage your profile and communication preferences.</p>

          {message && (
            <div className="mt-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
              {message}
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Profile</h2>
                <p className="text-sm text-gray-600">Update your personal details and public profile.</p>
              </div>
              <button
                type="button"
                onClick={handleProfileSave}
                disabled={savingProfile || loadingProfile}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {savingProfile ? "Saving..." : "Save profile"}
              </button>
            </div>

            {loadingProfile ? (
              <p className="text-sm text-gray-500">Loading profile...</p>
            ) : (
              <div className="space-y-5">
                <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-gray-200 text-lg font-semibold text-gray-700">
                    {profile.avatar ? (
                      <img src={profile.avatar} alt={profile.fullName || profile.username || "Profile avatar"} className="h-full w-full object-cover" />
                    ) : (
                      (profile.fullName?.trim()?.charAt(0) || profile.username?.trim()?.charAt(0) || "U").toUpperCase()
                    )}
                  </div>

                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-700">Avatar</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingAvatar}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {uploadingAvatar ? "Uploading..." : "Upload avatar"}
                      </button>
                      {profile.avatar && (
                        <button
                          type="button"
                          onClick={handleRemoveAvatar}
                          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={handleAvatarUpload}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Full name
                    <input
                      type="text"
                      value={profile.fullName}
                      onChange={(event) => handleProfileChange("fullName", event.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      placeholder="Your full name"
                    />
                  </label>

                  <label className="block text-sm font-medium text-gray-700">
                    Username
                    <input
                      type="text"
                      value={profile.username}
                      onChange={(event) => handleProfileChange("username", event.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      placeholder="username"
                    />
                  </label>
                </div>

                <label className="block text-sm font-medium text-gray-700">
                  Email
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(event) => handleProfileChange("email", event.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="you@example.com"
                  />
                </label>

                <label className="block text-sm font-medium text-gray-700">
                  Bio
                  <textarea
                    value={profile.bio}
                    onChange={(event) => handleProfileChange("bio", event.target.value)}
                    rows={4}
                    maxLength={200}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="Tell people a little about yourself"
                  />
                  <span className="mt-1 block text-right text-xs text-gray-500">{profile.bio.length}/200</span>
                </label>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900">Notifications</h2>
              <p className="mt-1 text-sm text-gray-600">Control the notifications you receive from albums and the app.</p>

              {loadingNotifications ? (
                <p className="mt-6 text-sm text-gray-500">Loading notification settings...</p>
              ) : (
                <div className="mt-6 space-y-4">
                  <label className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
                    <span className="text-sm font-medium text-gray-700">Enable email notifications</span>
                    <input
                      type="checkbox"
                      checked={emailNotificationsEnabled}
                      onChange={async (event) => {
                        const nextValue = event.target.checked;
                        setEmailNotificationsEnabled(nextValue);
                        await updateSetting({ emailNotificationsEnabled: nextValue });
                      }}
                      className="h-5 w-5"
                    />
                  </label>

                  <label className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
                    <span className="text-sm font-medium text-gray-700">Enable in-app notifications</span>
                    <input
                      type="checkbox"
                      checked={inAppNotificationsEnabled}
                      onChange={async (event) => {
                        const nextValue = event.target.checked;
                        setInAppNotificationsEnabled(nextValue);
                        await updateSetting({ inAppNotificationsEnabled: nextValue });
                      }}
                      className="h-5 w-5"
                    />
                  </label>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Daily Reminders</h2>
                  <p className="text-xs text-gray-600">Get daily prompts to write memories</p>
                </div>
                <button
                  type="button"
                  onClick={handleReminderSave}
                  disabled={savingReminders || loadingReminders}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  {savingReminders ? "Saving..." : "Save"}
                </button>
              </div>

              {loadingReminders ? (
                <p className="text-sm text-gray-500">Loading reminder settings...</p>
              ) : (
                <div className="space-y-4">
                  <label className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
                    <span className="text-sm font-medium text-gray-700">Enable daily reminders</span>
                    <input
                      type="checkbox"
                      checked={reminders.dailyReminderEnabled}
                      onChange={(event) => handleReminderChange("dailyReminderEnabled", event.target.checked)}
                      className="h-5 w-5"
                    />
                  </label>

                  {reminders.dailyReminderEnabled && (
                    <>
                      <label className="block text-sm font-medium text-gray-700">
                        Reminder time (24-hour format)
                        <input
                          type="time"
                          value={reminders.dailyReminderTime || "09:00"}
                          onChange={(event) => handleReminderChange("dailyReminderTime", event.target.value)}
                          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                        />
                      </label>

                      <label className="block text-sm font-medium text-gray-700">
                        Timezone
                        <select
                          value={reminders.timezone}
                          onChange={(event) => handleReminderChange("timezone", event.target.value)}
                          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                        >
                          <option value="UTC">UTC (Coordinated Universal Time)</option>
                          <option value="America/New_York">America/New_York (EST)</option>
                          <option value="America/Chicago">America/Chicago (CST)</option>
                          <option value="America/Denver">America/Denver (MST)</option>
                          <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                          <option value="Europe/London">Europe/London (GMT)</option>
                          <option value="Europe/Paris">Europe/Paris (CET)</option>
                          <option value="Europe/Berlin">Europe/Berlin (CET)</option>
                          <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                          <option value="Asia/Shanghai">Asia/Shanghai (CST)</option>
                          <option value="Asia/Hong_Kong">Asia/Hong_Kong (HKT)</option>
                          <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
                          <option value="Australia/Sydney">Australia/Sydney (AEDT)</option>
                          <option value="Australia/Melbourne">Australia/Melbourne (AEDT)</option>
                        </select>
                      </label>

                      <button
                        type="button"
                        onClick={handleSkipReminder}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Skip today's reminder
                      </button>
                    </>
                  )}

                  {reminders.lastReminderSent && (
                    <p className="text-xs text-gray-500">
                      Last reminder sent: {new Date(reminders.lastReminderSent).toLocaleString()}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Mood Tracking</h2>
            <p className="text-sm text-gray-600">Track your emotional rhythm and see which moods show up most often.</p>
          </div>

          {moodStatsLoading ? (
            <p className="text-sm text-gray-500">Loading mood insights...</p>
          ) : moodStats ? (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Most common mood</p>
                  <div className="mt-3 flex items-center gap-2 text-lg font-semibold text-gray-800">
                    <span>{moodStats.summary.mostCommonMood?.emoji ?? "✨"}</span>
                    <span>{moodStats.summary.mostCommonMood ? `${moodStats.summary.mostCommonMood.label} (${moodStats.summary.mostCommonMood.percentage}%)` : "No data"}</span>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Memories with mood</p>
                  <p className="mt-3 text-2xl font-bold text-gray-900">{moodStats.totalWithMood}</p>
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Longest streak</p>
                  <p className="mt-3 text-2xl font-bold text-gray-900">{moodStats.streak.longestPositiveStreak} days</p>
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Any mood streak</p>
                  <p className="mt-3 text-2xl font-bold text-gray-900">{moodStats.streak.longestAnyStreak} days</p>
                </div>
              </div>

              <div className="grid gap-6 xl:grid-cols-2">
                <div className="rounded-xl border border-gray-200 p-4">
                  <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-600">Mood distribution</h3>
                  {moodDistributionChart ? (
                    <Bar
                      data={moodDistributionChart}
                      options={{ responsive: true, plugins: { legend: { display: false } } }}
                    />
                  ) : (
                    <p className="text-sm text-gray-500">No mood data yet.</p>
                  )}
                </div>

                <div className="rounded-xl border border-gray-200 p-4">
                  <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-600">Mood trend</h3>
                  {moodTimelineChart ? (
                    <Line
                      data={moodTimelineChart}
                      options={{ responsive: true, plugins: { legend: { display: false } } }}
                    />
                  ) : (
                    <p className="text-sm text-gray-500">No trend data yet.</p>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 p-4">
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-600">Detailed distribution</h3>
                <div className="space-y-3">
                  {moodStats.distribution.length === 0 ? (
                    <p className="text-sm text-gray-500">Add a mood to your memories to see the breakdown here.</p>
                  ) : (
                    moodStats.distribution.map((entry) => (
                      <div key={entry.mood} className="space-y-1">
                        <div className="flex items-center justify-between text-sm text-gray-700">
                          <span className="inline-flex items-center gap-2">
                            <span>{entry.emoji}</span>
                            <span>{entry.label}</span>
                          </span>
                          <span>{entry.count} ({entry.percentage}%)</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                          <div
                            className="h-full rounded-full bg-blue-500"
                            style={{ width: `${Math.max(entry.percentage, 3)}%` }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No mood data available yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
