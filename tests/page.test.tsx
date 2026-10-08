import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Home from "@app/page";

describe("placeholder page", () => {
  it("shows the Step Up wordmark", () => {
    expect(renderToStaticMarkup(<Home />)).toContain("Step Up");
  });
});
