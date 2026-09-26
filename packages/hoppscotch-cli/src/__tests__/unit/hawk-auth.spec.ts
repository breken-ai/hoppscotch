import { describe, expect, test } from "vitest";
import { Environment, HoppRESTAuth, makeRESTRequest } from "@hoppscotch/data";
import * as E from "fp-ts/Either";

import { getEffectiveRESTRequest } from "../../utils/pre-request";

const emptyEnv: Environment = {
  v: 2,
  id: "env",
  name: "env",
  variables: [],
};

// Credentials and request from the Hawk README example. The expected `mac`
// values were computed with the reference implementation (`@hapi/hawk`,
// `Hawk.client.header`) using the same id, key, ts, nonce and ext.
const hawkAuth = (
  extra: Partial<HoppRESTAuth & { authType: "hawk" }>
): HoppRESTAuth => ({
  authActive: true,
  authType: "hawk",
  authId: "dh37fgj492je",
  authKey: "werxhqb98rpaxn39848xrunpaw3489ruxnpa98w4rxn",
  algorithm: "sha256",
  includePayloadHash: false,
  timestamp: "1353832234",
  nonce: "j4h3g2",
  ext: "some-app-ext-data",
  ...extra,
});

const getHawkHeader = async (auth: HoppRESTAuth) => {
  const request = makeRESTRequest({
    name: "request",
    method: "GET",
    endpoint: "http://example.com:8000/resource/1?b=1&a=2",
    params: [],
    headers: [],
    preRequestScript: "",
    testScript: "",
    auth,
    body: { contentType: null, body: null },
    requestVariables: [],
    description: null,
    responses: {},
  });

  const result = await getEffectiveRESTRequest(request, emptyEnv);

  if (E.isLeft(result)) throw new Error(JSON.stringify(result.left));

  return result.right.effectiveRequest.effectiveFinalHeaders.find(
    (h) => h.key === "Authorization"
  )?.value;
};

const macOf = (header: string | undefined) =>
  header?.match(/mac="([^"]+)"/)?.[1];

describe("getEffectiveRESTRequest - hawk auth", () => {
  test("matches the reference mac without app", async () => {
    const header = await getHawkHeader(hawkAuth({}));

    expect(macOf(header)).toBe("6R4rV5iE+NPoym+WwjeHzjAGXUtLNIxmo1vpMofpLAE=");
  });

  test("includes app in the mac when app is set", async () => {
    const header = await getHawkHeader(hawkAuth({ app: "my-app" }));

    expect(header).toContain('app="my-app"');
    expect(macOf(header)).toBe("atgg22rtxnK6sGJkol/m1VCpUOR/xQyoYyktuFyVOss=");
  });

  test("includes app and dlg in the mac when both are set", async () => {
    const header = await getHawkHeader(
      hawkAuth({ app: "my-app", dlg: "delegate" })
    );

    expect(header).toContain('dlg="delegate"');
    expect(macOf(header)).toBe("tw39fiFENUvr4JrW9Z39GrQiAXFxRA6E78sUB7o7K9w=");
  });
});
