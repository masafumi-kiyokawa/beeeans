import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const clientMocks = vi.hoisted(() => ({ deleteBrewLog: vi.fn() }));
vi.mock("../api/client", () => clientMocks);

import BrewLogCard from "./BrewLogCard.vue";

const baseLog = {
  id: "l1",
  recipe_id: "r1",
  brewed_at: "2026-01-01T09:00:00.000Z",
  rating: 3,
  notes: null as string | null,
  created_at: "2026-01-01T09:00:00.000Z",
};

describe("BrewLogCard.vue", () => {
  let confirmSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    clientMocks.deleteBrewLog.mockReset();
    confirmSpy = vi.spyOn(window, "confirm");
  });

  it("shows the recipe name only when showRecipeName is true AND the log has a recipe_name key", () => {
    const withName = { ...baseLog, recipe_name: "V60" };
    const withoutName = { ...baseLog };

    expect(
      mount(BrewLogCard, { props: { log: withName, showRecipeName: true } })
        .find("strong")
        .text(),
    ).toBe("V60");
    expect(
      mount(BrewLogCard, { props: { log: withoutName, showRecipeName: true } })
        .find("strong")
        .exists(),
    ).toBe(false);
    expect(
      mount(BrewLogCard, { props: { log: withName, showRecipeName: false } })
        .find("strong")
        .exists(),
    ).toBe(false);
    expect(
      mount(BrewLogCard, { props: { log: withoutName } })
        .find("strong")
        .exists(),
    ).toBe(false);
  });

  it("treats an empty-string recipe_name as still present (key existence, not truthiness)", () => {
    const withEmptyName = { ...baseLog, recipe_name: "" };
    const wrapper = mount(BrewLogCard, { props: { log: withEmptyName, showRecipeName: true } });
    expect(wrapper.find("strong").exists()).toBe(true);
    expect(wrapper.find("strong").text()).toBe("");
  });

  it("shows exactly `rating` active stars", () => {
    const wrapper = mount(BrewLogCard, { props: { log: { ...baseLog, rating: 3 } } });
    const stars = wrapper.findAll(".rating-stars span");
    expect(stars).toHaveLength(5);
    expect(stars.map((s) => s.classes().includes("active"))).toEqual([
      true,
      true,
      true,
      false,
      false,
    ]);
  });

  it("shows notes only when non-empty (hidden for both empty string and null)", () => {
    expect(
      mount(BrewLogCard, { props: { log: { ...baseLog, notes: "tasty" } } })
        .find("p")
        .exists(),
    ).toBe(true);
    expect(
      mount(BrewLogCard, { props: { log: { ...baseLog, notes: "" } } })
        .find("p")
        .exists(),
    ).toBe(false);
    expect(
      mount(BrewLogCard, { props: { log: { ...baseLog, notes: null } } })
        .find("p")
        .exists(),
    ).toBe(false);
  });

  it("does not call deleteBrewLog or emit deleted when confirm is cancelled", async () => {
    confirmSpy.mockReturnValue(false);
    const wrapper = mount(BrewLogCard, { props: { log: baseLog } });
    await wrapper.find(".btn-danger").trigger("click");
    expect(clientMocks.deleteBrewLog).not.toHaveBeenCalled();
    expect(wrapper.emitted("deleted")).toBeUndefined();
  });

  it("calls deleteBrewLog and emits deleted (no payload) when confirmed", async () => {
    confirmSpy.mockReturnValue(true);
    clientMocks.deleteBrewLog.mockResolvedValue(undefined);
    const wrapper = mount(BrewLogCard, { props: { log: baseLog } });
    await wrapper.find(".btn-danger").trigger("click");
    await flushPromises();
    expect(clientMocks.deleteBrewLog).toHaveBeenCalledWith("l1");
    expect(wrapper.emitted("deleted")).toEqual([[]]);
  });

  it("does not emit deleted when deleteBrewLog rejects", async () => {
    confirmSpy.mockReturnValue(true);
    clientMocks.deleteBrewLog.mockRejectedValue(new Error("network error"));
    const wrapper = mount(BrewLogCard, {
      props: { log: baseLog },
      global: { config: { errorHandler: () => {} } },
    });
    await wrapper.find(".btn-danger").trigger("click");
    await flushPromises();
    expect(wrapper.emitted("deleted")).toBeUndefined();
  });
});
