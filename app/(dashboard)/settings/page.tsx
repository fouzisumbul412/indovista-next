"use client";

import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { useRouter } from "next/navigation";

import {
  Globe,
  Ship,
  Clock,
  DollarSign,
  Thermometer,
  Settings as SettingsIcon,
  Users,
} from "lucide-react";

type DynamicKey =
  | "ports"
  | "incoterms"
  | "status-codes"
  | "currencies"
  | "temp-presets"
  | "containers";

type PreviewMap = Partial<Record<DynamicKey, string[]>>;

// ONLY THESE WILL BE DYNAMIC
const dynamicSettings: {
  key: DynamicKey;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
}[] = [
  {
    key: "ports",
    title: "Ports & Airports",
    subtitle: "UN/LOCODE database",
    description: "Manage port and airport codes.",
    icon: <Globe className="w-6 h-6" />,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
  },
  {
    key: "incoterms",
    title: "Incoterms",
    subtitle: "Incoterms 2020",
    description: "Configure available incoterms.",
    icon: <Ship className="w-6 h-6" />,
    iconBg: "bg-green-50",
    iconColor: "text-green-600",
  },
  {
    key: "status-codes",
    title: "Status Codes",
    subtitle: "Tracking milestones",
    description: "Manage shipment status events.",
    icon: <Clock className="w-6 h-6" />,
    iconBg: "bg-orange-50",
    iconColor: "text-orange-600",
  },
  {
    key: "currencies",
    title: "Currencies",
    subtitle: "Exchange rates",
    description: "Manage currency conversion.",
    icon: <DollarSign className="w-6 h-6" />,
    iconBg: "bg-purple-50",
    iconColor: "text-purple-600",
  },
  {
    key: "temp-presets",
    title: "Temperature Presets",
    subtitle: "Cold chain ranges",
    description: "Manage temperature rules.",
    icon: <Thermometer className="w-6 h-6" />,
    iconBg: "bg-cyan-50",
    iconColor: "text-cyan-600",
  },
  {
  key: "containers",
  title: "Containers / ULD Types",
  subtitle: "Air • Sea • Road",
  description: "Manage container and ULD master data.",
  icon: <Ship className="w-6 h-6" />,
  iconBg: "bg-indigo-50",
  iconColor: "text-indigo-600",
},

];

const SettingsCard = ({
  icon,
  iconBg,
  iconColor,
  title,
  subtitle,
  description,
  onClick,
  preview,
}: any) => {
  return (
    <Card
      onClick={onClick}
      className="flex flex-col p-5 cursor-pointer hover:shadow-md border"
    >
      <div className="flex items-start gap-4 mb-4">
        <div className={`p-3 rounded-xl ${iconBg} ${iconColor}`}>{icon}</div>

        <div>
          <h3 className="font-bold text-gray-900 text-lg">{title}</h3>
          <p className="text-sm text-gray-500">{subtitle}</p>
        </div>
      </div>

      <p className="text-gray-600 text-sm flex-grow">{description}</p>

      {/* Preview chips */}
      {preview && preview.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {preview.map((val: string) => (
            <span
              key={val}
              className="px-2 py-0.5 rounded-full bg-gray-100 text-xs text-gray-700"
            >
              {val}
            </span>
          ))}
        </div>
      )}
    </Card>
  );
};

export default function SettingsPage() {
  const router = useRouter();

  const [previews, setPreviews] = useState<PreviewMap>({});
  const [loadingPreviews, setLoadingPreviews] = useState(false);

  useEffect(() => {
    const loadPreviews = async () => {
      try {
        setLoadingPreviews(true);

        const results = await Promise.all(
          dynamicSettings.map(async (item) => {
            try {
              const res = await fetch(`/api/master-data/${item.key}`);
              if (!res.ok) return { key: item.key, rows: [] as any[] };
              const json = await res.json();
              return {
                key: item.key,
                rows: Array.isArray(json) ? json : [],
              };
            } catch {
              return { key: item.key, rows: [] as any[] };
            }
          })
        );

        const map: PreviewMap = {};

        results.forEach(({ key, rows }) => {
          // take last 5 items (latest), then show newest first
          const latest = rows.slice(-5).reverse();

          let values: string[] = [];

          switch (key as DynamicKey) {
            case "ports":
            case "incoterms":
            case "status-codes":
              values = latest.map((r: any) => r.code).filter(Boolean);
              break;
            case "currencies":
              values = latest.map((r: any) => r.currencyCode).filter(Boolean);
              break;
            case "temp-presets":
              // no code field, so show name
              values = latest.map((r: any) => r.name).filter(Boolean);
              break;
          }

          map[key as DynamicKey] = values;
        });

        setPreviews(map);
      } finally {
        setLoadingPreviews(false);
      }
    };

    loadPreviews();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-gray-500">
            System configuration and master data
          </p>
        </div>
        {loadingPreviews && (
          <span className="text-xs text-gray-400 animate-pulse">
            Loading latest codes…
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* STATIC → DO NOT TOUCH */}
        <SettingsCard
          icon={<Users className="w-6 h-6" />}
          iconBg="bg-indigo-50"
          iconColor="text-indigo-600"
          title="User Management"
          subtitle="Access Control"
          description="Add/remove users and assign roles."
          onClick={() => router.push("/settings/users")}
        />

        {/* 🔥 DYNAMICALLY GENERATED CARDS WITH PREVIEW */}
        {dynamicSettings.map((item) => (
          <SettingsCard
            key={item.key}
            icon={item.icon}
            iconBg={item.iconBg}
            iconColor={item.iconColor}
            title={item.title}
            subtitle={item.subtitle}
            description={item.description}
            preview={previews[item.key]}
            onClick={() => router.push(`/settings/${item.key}`)}
          />
        ))}

        {/* STATIC → DO NOT TOUCH */}
        {/* <SettingsCard
          icon={<SettingsIcon className="w-6 h-6" />}
          iconBg="bg-gray-100"
          iconColor="text-gray-600"
          title="General"
          subtitle="System preferences"
          description="Timezone & locale settings."
          onClick={() => router.push("/settings/general")}
        /> */}
      </div>
    </div>
  );
}
