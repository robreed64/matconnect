import { describe, it, expect } from "vitest";
import { resolveSiteConfig } from "./site-config";

describe("resolveSiteConfig", () => {
  it("fills defaults from an empty config, seeding the headline with the gym name", () => {
    const c = resolveSiteConfig({}, "Gracie Barra");
    expect(c.enabled).toBe(false);
    expect(c.themeColor).toBe("#2563eb");
    expect(c.hero.headline).toBe("Gracie Barra");
    expect(c.hero.ctaLabel).toBe("Start your free trial");
    expect(c.showSchedule).toBe(true);
    expect(c.showPricing).toBe(true);
  });

  it("applies stored overrides", () => {
    const c = resolveSiteConfig(
      {
        enabled: true,
        themeColor: "#16a34a",
        hero: { headline: "Train Hard", imageUrl: "/hero.jpg" },
        about: "We are a family gym.",
        showSchedule: false,
        socials: { instagram: "https://instagram.com/x" },
        seo: { title: "X BJJ", description: "Best gym" },
      },
      "Fallback",
    );
    expect(c.enabled).toBe(true);
    expect(c.themeColor).toBe("#16a34a");
    expect(c.hero.headline).toBe("Train Hard");
    expect(c.hero.imageUrl).toBe("/hero.jpg");
    expect(c.hero.subhead).toContain("every level"); // default kept when unset
    expect(c.about).toBe("We are a family gym.");
    expect(c.showSchedule).toBe(false);
    expect(c.showPricing).toBe(true); // unset → default true
    expect(c.socials.instagram).toBe("https://instagram.com/x");
    expect(c.seo.title).toBe("X BJJ");
  });

  it("is defensive against junk input", () => {
    const c = resolveSiteConfig(null, "My Gym");
    expect(c.hero.headline).toBe("My Gym");
    const c2 = resolveSiteConfig({ hero: "not-an-object", socials: 5 }, "My Gym");
    expect(c2.hero.headline).toBe("My Gym");
    expect(c2.socials.facebook).toBe("");
  });

  it("provides defaults for new testimonials and FAQ fields", () => {
    const c = resolveSiteConfig({}, "My Gym");
    expect(c.presetTheme).toBe("custom");
    expect(c.testimonials).toEqual([]);
    expect(c.showTestimonials).toBe(false);
    expect(c.faq).toEqual([]);
    expect(c.showFaq).toBe(false);
    expect(c.mapEmbedUrl).toBe("");
    expect(c.showMap).toBe(false);
  });

  it("applies testimonials override", () => {
    const c = resolveSiteConfig(
      {
        testimonials: [
          { name: "Alice", belt: "Blue Belt", text: "Great gym!" },
        ],
        showTestimonials: true,
      },
      "My Gym",
    );
    expect(c.testimonials).toEqual([
      { name: "Alice", belt: "Blue Belt", text: "Great gym!" },
    ]);
    expect(c.showTestimonials).toBe(true);
  });

  it("applies FAQ override", () => {
    const c = resolveSiteConfig(
      {
        faq: [{ question: "What are the hours?", answer: "6am-10pm" }],
        showFaq: true,
      },
      "My Gym",
    );
    expect(c.faq).toEqual([{ question: "What are the hours?", answer: "6am-10pm" }]);
    expect(c.showFaq).toBe(true);
  });

  it("applies presetTheme override", () => {
    const c = resolveSiteConfig({ presetTheme: "bold" }, "My Gym");
    expect(c.presetTheme).toBe("bold");
  });

  it("applies map fields override", () => {
    const c = resolveSiteConfig(
      {
        mapEmbedUrl: "https://maps.google.com/embed?...",
        showMap: true,
      },
      "My Gym",
    );
    expect(c.mapEmbedUrl).toBe("https://maps.google.com/embed?...");
    expect(c.showMap).toBe(true);
  });
});
