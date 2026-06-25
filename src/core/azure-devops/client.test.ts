import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { toPatchDocument, createWorkItems } from "./client";
import type { AzureDevOpsConfig, WorkItemDraft } from "./types";

const baseConfig: AzureDevOpsConfig = {
  orgUrl: "https://dev.azure.com/myorg",
  organization: "myorg",
  project: "My Project",
  pat: "secret-pat",
  defaultWorkItemType: "Task",
};

describe("toPatchDocument", () => {
  it("emits the title op and trims it", () => {
    const ops = toPatchDocument({ title: "  Fix login  " }, baseConfig);
    expect(ops[0]).toEqual({
      op: "add",
      path: "/fields/System.Title",
      value: "Fix login",
    });
  });

  it("omits optional fields when absent", () => {
    const ops = toPatchDocument({ title: "T" }, baseConfig);
    const paths = ops.map((o) => o.path);
    expect(paths).toEqual(["/fields/System.Title"]);
  });

  it("includes description, tags (joined) and priority when present", () => {
    const draft: WorkItemDraft = {
      title: "T",
      description: "Do the thing",
      tags: ["reunião", " urgente "],
      priority: 2,
    };
    const ops = toPatchDocument(draft, baseConfig);
    expect(ops).toContainEqual({
      op: "add",
      path: "/fields/System.Description",
      value: "Do the thing",
    });
    expect(ops).toContainEqual({
      op: "add",
      path: "/fields/System.Tags",
      value: "reunião; urgente",
    });
    expect(ops).toContainEqual({
      op: "add",
      path: "/fields/Microsoft.VSTS.Common.Priority",
      value: 2,
    });
  });

  it("adds area/iteration paths from config when set", () => {
    const ops = toPatchDocument(
      { title: "T" },
      { ...baseConfig, areaPath: "My Project\\Web", iterationPath: "My Project\\Sprint 1" },
    );
    expect(ops).toContainEqual({
      op: "add",
      path: "/fields/System.AreaPath",
      value: "My Project\\Web",
    });
    expect(ops).toContainEqual({
      op: "add",
      path: "/fields/System.IterationPath",
      value: "My Project\\Sprint 1",
    });
  });
});

describe("createWorkItems", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts to the right URL with json-patch content-type and PAT basic auth", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({ id: 42, _links: { html: { href: "https://dev.azure.com/myorg/_workitems/edit/42" } } }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await createWorkItems([{ title: "Build feature" }], baseConfig);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(
      "https://dev.azure.com/myorg/My%20Project/_apis/wit/workitems/%24Task?api-version=7.1",
    );
    const headers = init.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/json-patch+json");
    expect(headers.Authorization).toBe(`Basic ${Buffer.from(":secret-pat").toString("base64")}`);

    expect(result.created).toEqual([
      {
        id: 42,
        title: "Build feature",
        type: "Task",
        url: "https://dev.azure.com/myorg/_workitems/edit/42",
      },
    ]);
    expect(result.errors).toHaveLength(0);
  });

  it("uses the draft's own type when provided", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ id: 1, url: "u" }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await createWorkItems([{ title: "T", type: "User Story" }], baseConfig);

    const [url] = fetchMock.mock.calls[0] as unknown as [string];
    expect(url).toContain("/_apis/wit/workitems/%24User%20Story?");
  });

  it("collects per-item errors without aborting the rest", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "Field 'Title' is required." }), { status: 400 }),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 7, url: "u7" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await createWorkItems(
      [{ title: "bad" }, { title: "good" }],
      baseConfig,
    );

    expect(result.created).toHaveLength(1);
    expect(result.created[0].id).toBe(7);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain("Title");
  });
});
