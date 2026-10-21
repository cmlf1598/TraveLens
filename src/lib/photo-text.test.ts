import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import {
  cleanDescription,
  cleanText,
  dedupeSegments,
  formatTags,
  slugToText,
  toDisplayText,
  topicLabel,
} from "./photo-text.ts";

const ID = "Dwu85P9SOIk";

describe("dedupeSegments", () => {
  it("collapses a repeated city", () => {
    assert.equal(dedupeSegments("Sydney, Sydney"), "Sydney");
  });
  it("keeps order and the first spelling, ignoring case and accents", () => {
    assert.equal(dedupeSegments("Bogotá, Colombia, bogota"), "Bogotá, Colombia");
  });
  it("leaves repeated words inside a segment alone", () => {
    assert.equal(dedupeSegments("Bora Bora, French Polynesia"), "Bora Bora, French Polynesia");
  });
});

describe("cleanText", () => {
  it("removes the photo id", () => {
    assert.equal(cleanText(`Sunset over the bay ${ID}`, ID), "Sunset over the bay");
  });
  it("removes image file names and camera frame names", () => {
    assert.equal(cleanText("IMG_4021.JPG Eiffel tower at dusk", ID), "Eiffel tower at dusk");
    assert.equal(cleanText("DSC_0042 Lisbon tram", ID), "Lisbon tram");
    assert.equal(cleanText("P1030456 Old town", ID), "Old town");
  });
  it("returns null when only noise remains", () => {
    assert.equal(cleanText("IMG_4021.jpg", ID), null);
    assert.equal(cleanText(ID, ID), null);
    assert.equal(cleanText("  1234 ", ID), null);
    assert.equal(cleanText(null, ID), null);
  });
  it("dedupes repeated place names in descriptive text", () => {
    assert.equal(cleanText("Sydney, Sydney", ID), "Sydney");
  });
});

describe("slugToText", () => {
  it("drops the trailing id and hyphens", () => {
    assert.equal(slugToText(`vista-de-la-torre-eiffel-${ID}`, ID), "vista de la torre eiffel");
  });
  it("handles a slug that is only the id", () => {
    assert.equal(slugToText(ID, ID), null);
  });
});

describe("toDisplayText", () => {
  it("capitalizes the first letter", () => {
    assert.equal(toDisplayText("vista de la torre"), "Vista de la torre");
  });
  it("truncates long text at a word boundary", () => {
    const long = "una calle muy larga ".repeat(10).trim();
    const out = toDisplayText(long);
    assert.ok(out.length <= 90);
    assert.ok(out.endsWith("…"));
    assert.ok(!out.slice(0, -1).endsWith(" "));
  });
});

describe("cleanDescription", () => {
  // Real descriptions returned by the Unsplash search API.
  it("drops self-promotion and the handle", () => {
    assert.equal(
      cleanDescription("Summers of Lisbon, Please follow me on instagram @_aayush_guptaa_", ID),
      "Summers of Lisbon",
    );
  });
  it("drops camera talk but keeps the scene", () => {
    assert.equal(
      cleanDescription(
        "Finally we got to visit lisbon! I took my Sony Alpha 6500 with a 50mm to get this shots.",
        ID,
      ),
      "Finally we got to visit lisbon",
    );
  });
  it("removes URLs and hashtags", () => {
    assert.equal(cleanDescription("Sunrise in Bagan #myanmar https://example.com/me", ID), "Sunrise in Bagan");
  });
  it("keeps commas inside a place description", () => {
    assert.equal(cleanDescription("Elevador da Bica, the classic Lisbon shot", ID), "Elevador da Bica, the classic Lisbon shot");
  });
  it("returns null when everything is promotion or gear", () => {
    assert.equal(cleanDescription("Shot on iPhone 15. Follow @me", ID), null);
  });
});

describe("topicLabel", () => {
  it("turns a slug into words", () => {
    assert.equal(topicLabel("street-photography"), "street photography");
  });
});

describe("formatTags", () => {
  it("joins capitalized tags with bullets", () => {
    assert.equal(formatTags(["nature", "city", "travel"]), "Nature • City • Travel");
  });
});
