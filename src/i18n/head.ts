import i18n from "@/i18n";

/** Builds a translated meta set for a route head(). Keys are resolved at call time. */
export function pageMeta(titleKey: string, descriptionKey: string) {
  const title = `${i18n.t(titleKey)} — ${i18n.t("common.appName")}`;
  const description = i18n.t(descriptionKey);
  return [
    { title },
    { name: "description", content: description },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ];
}
