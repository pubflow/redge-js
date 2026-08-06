import { act, create } from "react-test-renderer";
import { describe, expect, it } from "vitest";
import { createRedgeReact } from "../src/react";
import type { RedgeClient } from "../src";

describe("React hooks", () => {
  it("loads a document through createRedgeReact", async () => {
    const client = {
      collection() {
        return {
          async get(id: string) {
            return {
              collection: "products",
              id,
              version: 1,
              created_at: "2026-01-01T00:00:00Z",
              updated_at: "2026-01-01T00:00:00Z",
              doc: { name: "Blue Shirt" }
            };
          }
        };
      }
    } as unknown as RedgeClient;
    const redge = createRedgeReact(client);
    let latest: unknown;

    function Probe() {
      latest = redge.useDocument<{ name: string }>("products", "p1");
      return null;
    }

    await act(async () => {
      create(<Probe />);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(latest).toMatchObject({
      loading: false,
      data: { id: "p1", doc: { name: "Blue Shirt" } }
    });
  });
});
