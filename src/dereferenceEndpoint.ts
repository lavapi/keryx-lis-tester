import type { FastifyInstance } from "fastify";

import { buildDereferenceContext } from "./dereferenceContext.js";
import { buildLocationContext } from "./locationContext.js";
import { pickLocation } from "./locationPicker.js";
import { applyTemplate } from "./template.js";

export const HELD_CONTENT_TYPE = "application/held+xml";

const DEREFERENCE_BODY_TEMPLATE = `<?xml version="1.0" encoding="UTF-8"?>
<locationResponse xmlns="urn:ietf:params:xml:ns:geopriv:held">
  <presence xmlns="urn:ietf:params:xml:ns:pidf"
            xmlns:gp="urn:ietf:params:xml:ns:pidf:geopriv10"
            xmlns:gbp="urn:ietf:params:xml:ns:pidf:geopriv10:basicPolicy"
            xmlns:ca="urn:ietf:params:xml:ns:pidf:geopriv10:civicAddr"
            xmlns:gml="http://www.opengis.net/gml"
            entity="pres:device@keryx-lis-tester">
    <tuple id="t1">
      <status>
        <gp:geopriv>
          <gp:location-info>
            <gml:Point srsName="urn:ogc:def:crs:EPSG::4326">
              <gml:pos>{{latitude}} {{longitude}}</gml:pos>
            </gml:Point>
            <ca:civicAddress xml:lang="en-US">
              <ca:country>{{country}}</ca:country>
              <ca:A1>{{state}}</ca:A1>
              <ca:A2>{{county}}</ca:A2>
              <ca:A3>{{city}}</ca:A3>
              <ca:RD>{{streetName}}</ca:RD>
              <ca:STS>{{streetSuffix}}</ca:STS>
              <ca:HNO>{{streetNumber}}</ca:HNO>
              <ca:PC>{{postalCode}}</ca:PC>
            </ca:civicAddress>
          </gp:location-info>
          <gp:usage-rules>
            <gbp:retransmission-allowed>no</gbp:retransmission-allowed>
          </gp:usage-rules>
          <gp:method>Hybrid</gp:method>
        </gp:geopriv>
      </status>
      <timestamp>{{timestamp}}</timestamp>
    </tuple>
  </presence>
</locationResponse>
`;

const renderBody = (): string =>
  applyTemplate(DEREFERENCE_BODY_TEMPLATE, {
    timestamp: new Date().toISOString(),
    ...buildLocationContext(pickLocation()),
    ...buildDereferenceContext(),
  });

interface TokenParams {
  token: string;
}

export const registerDereferenceEndpoint = (app: FastifyInstance): void => {
  const handler = async (
    request: { params: TokenParams; log: { info: (obj: unknown, msg: string) => void } },
    reply: { type: (s: string) => unknown },
  ) => {
    request.log.info(
      { token: request.params.token },
      "dereferenced locationURI",
    );
    reply.type(HELD_CONTENT_TYPE);
    return renderBody();
  };

  app.get<{ Params: TokenParams }>("/locations/:token", handler);
  app.post<{ Params: TokenParams }>("/locations/:token", handler);
};
